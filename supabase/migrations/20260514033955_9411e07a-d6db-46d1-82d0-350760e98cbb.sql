
-- Step 1: Add subscription columns to households
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS subscription_tier text NOT NULL DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS current_period_start timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz NOT NULL DEFAULT (now() + interval '1 month'),
  ADD COLUMN IF NOT EXISTS voice_seconds_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS voice_seconds_limit integer NOT NULL DEFAULT 1800;

ALTER TABLE public.households
  ADD CONSTRAINT households_tier_check
  CHECK (subscription_tier IN ('basic', 'family', 'family_plus'));

ALTER TABLE public.households
  ADD CONSTRAINT households_status_check
  CHECK (subscription_status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete'));

-- Step 2: Helper function to get max members for a tier
CREATE OR REPLACE FUNCTION public.tier_member_limit(_tier text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _tier
    WHEN 'basic' THEN 1
    WHEN 'family' THEN 4
    WHEN 'family_plus' THEN 6
    ELSE 1
  END;
$$;

-- Step 3: Trigger to enforce login limit
CREATE OR REPLACE FUNCTION public.enforce_member_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tier text;
  _count integer;
  _limit integer;
BEGIN
  SELECT subscription_tier INTO _tier FROM public.households WHERE id = NEW.household_id;
  _limit := public.tier_member_limit(_tier);
  SELECT COUNT(*) INTO _count FROM public.household_members WHERE household_id = NEW.household_id;
  IF _count >= _limit THEN
    RAISE EXCEPTION 'Member limit reached for this tier (%). Upgrade to add more members.', _tier
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_member_limit_trigger ON public.household_members;
CREATE TRIGGER enforce_member_limit_trigger
  BEFORE INSERT ON public.household_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_member_limit();

-- Step 4: Household invites table
CREATE TABLE IF NOT EXISTS public.household_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE DEFAULT upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  email text,
  phone text,
  invited_by uuid NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_household_invites_household ON public.household_invites(household_id);
CREATE INDEX IF NOT EXISTS idx_household_invites_code ON public.household_invites(invite_code);

ALTER TABLE public.household_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their household invites"
  ON public.household_invites FOR SELECT TO authenticated
  USING (is_household_member(household_id, auth.uid()));

CREATE POLICY "Owners can create invites"
  ON public.household_invites FOR INSERT TO authenticated
  WITH CHECK (is_household_owner(household_id, auth.uid()) AND invited_by = auth.uid());

CREATE POLICY "Owners can revoke invites"
  ON public.household_invites FOR DELETE TO authenticated
  USING (is_household_owner(household_id, auth.uid()));

CREATE POLICY "Owners can update invites"
  ON public.household_invites FOR UPDATE TO authenticated
  USING (is_household_owner(household_id, auth.uid()));

-- Allow anyone authenticated to look up an invite by code (for the accept flow)
CREATE POLICY "Anyone authenticated can view invite by code lookup"
  ON public.household_invites FOR SELECT TO authenticated
  USING (accepted_at IS NULL AND expires_at > now());

-- Step 5: Voice usage log
CREATE TABLE IF NOT EXISTS public.voice_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  seconds integer NOT NULL CHECK (seconds >= 0),
  conversation_id text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_usage_household ON public.voice_usage_log(household_id, created_at DESC);

ALTER TABLE public.voice_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view household voice usage"
  ON public.voice_usage_log FOR SELECT TO authenticated
  USING (is_household_member(household_id, auth.uid()));

CREATE POLICY "Members can insert their own voice usage"
  ON public.voice_usage_log FOR INSERT TO authenticated
  WITH CHECK (is_household_member(household_id, auth.uid()) AND user_id = auth.uid());
