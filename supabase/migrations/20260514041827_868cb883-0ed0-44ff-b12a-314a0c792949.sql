
-- 1. New columns on households
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_locked boolean NOT NULL DEFAULT false;

-- 2. Stop defaulting current_period_end to a fake date for non-paying users.
ALTER TABLE public.households
  ALTER COLUMN current_period_end DROP DEFAULT,
  ALTER COLUMN current_period_end DROP NOT NULL;

-- 3. Backfill: any existing household without a real Stripe sub gets a 7-day trial from now,
--    and the bogus renewal date is cleared.
UPDATE public.households
SET trial_ends_at = COALESCE(trial_ends_at, now() + interval '7 days'),
    current_period_end = NULL
WHERE stripe_subscription_id IS NULL;

-- 4. New households: 7-day trial of Basic, no Stripe sub yet
ALTER TABLE public.households
  ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '7 days'),
  ALTER COLUMN subscription_status SET DEFAULT 'trialing';

-- 5. Atomic voice-usage increment
CREATE OR REPLACE FUNCTION public.increment_voice_usage(_household_id uuid, _seconds integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_used integer;
BEGIN
  UPDATE public.households
  SET voice_seconds_used = voice_seconds_used + GREATEST(_seconds, 0),
      updated_at = now()
  WHERE id = _household_id
    AND public.is_household_member(_household_id, auth.uid())
  RETURNING voice_seconds_used INTO _new_used;
  RETURN _new_used;
END;
$$;

-- 6. Single-call entitlement check: returns true if the household can use paid features right now.
--    Active/trialing sub, OR in free-trial window, OR canceled but still inside paid period.
CREATE OR REPLACE FUNCTION public.household_has_access(_household_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.households h
    WHERE h.id = _household_id
      AND h.access_locked = false
      AND (
        (h.subscription_status IN ('active', 'trialing', 'past_due')
          AND (h.current_period_end IS NULL OR h.current_period_end > now()))
        OR (h.subscription_status = 'canceled'
          AND h.current_period_end IS NOT NULL
          AND h.current_period_end > now())
        OR (h.stripe_subscription_id IS NULL
          AND h.trial_ends_at IS NOT NULL
          AND h.trial_ends_at > now())
      )
  );
$$;

-- 7. Helper: voice quota remaining (0 if locked / over)
CREATE OR REPLACE FUNCTION public.voice_seconds_remaining(_household_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(0, voice_seconds_limit - voice_seconds_used)
  FROM public.households
  WHERE id = _household_id;
$$;
