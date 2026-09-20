-- Automatically start a 7-day free trial for every newly created household
CREATE OR REPLACE FUNCTION public.start_default_trial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.trial_ends_at IS NULL AND NEW.has_used_trial = false AND NEW.stripe_subscription_id IS NULL THEN
    NEW.trial_ends_at := now() + interval '7 days';
    NEW.has_used_trial := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_start_default_trial ON public.households;
CREATE TRIGGER trg_start_default_trial
BEFORE INSERT ON public.households
FOR EACH ROW EXECUTE FUNCTION public.start_default_trial();

-- Backfill: recent signups still stuck at plan selection get their 7 days now
UPDATE public.households
SET trial_ends_at = now() + interval '7 days',
    has_used_trial = true
WHERE trial_ends_at IS NULL
  AND has_used_trial = false
  AND stripe_subscription_id IS NULL
  AND subscription_status IN ('incomplete', 'incomplete_expired')
  AND created_at > now() - interval '14 days';