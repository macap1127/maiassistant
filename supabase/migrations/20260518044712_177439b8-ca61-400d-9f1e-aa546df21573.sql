
-- 1) Bump Family Plus voice minutes from 240 -> 300 (18000 seconds)
UPDATE public.households
SET voice_seconds_limit = 18000
WHERE subscription_tier = 'family_plus' AND voice_seconds_limit = 14400;

-- 2) Helper: get tier for a household (SECURITY DEFINER so it works from triggers)
CREATE OR REPLACE FUNCTION public.household_tier(_household_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT subscription_tier FROM public.households WHERE id = _household_id;
$$;

-- 3) Helper: is a feature available for a household's tier?
--    Features: 'sms_reminders', 'ai_calendar_import', 'shared_workspace'
CREATE OR REPLACE FUNCTION public.household_feature_allowed(_household_id uuid, _feature text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _feature IN ('sms_reminders','ai_calendar_import','shared_workspace','unlimited_receipts')
      THEN public.household_tier(_household_id) IN ('family','family_plus')
    ELSE true
  END;
$$;

-- 4) Trigger: block SMS opt-in on Basic tier
CREATE OR REPLACE FUNCTION public.enforce_sms_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.opted_in = true AND NOT public.household_feature_allowed(NEW.household_id, 'sms_reminders') THEN
    RAISE EXCEPTION 'Daily SMS reminders are available on the Family and Family Plus plans. Please upgrade to enable.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_sms_tier ON public.sms_reminder_prefs;
CREATE TRIGGER trg_enforce_sms_tier
BEFORE INSERT OR UPDATE ON public.sms_reminder_prefs
FOR EACH ROW EXECUTE FUNCTION public.enforce_sms_tier();

-- 5) Trigger: cap Basic tier to 10 receipts / calendar month
CREATE OR REPLACE FUNCTION public.enforce_receipt_tier_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tier text;
  _count integer;
BEGIN
  _tier := public.household_tier(NEW.household_id);
  IF _tier = 'basic' THEN
    SELECT COUNT(*) INTO _count
    FROM public.receipts
    WHERE household_id = NEW.household_id
      AND created_at >= date_trunc('month', now());
    IF _count >= 10 THEN
      RAISE EXCEPTION 'Basic plan is limited to 10 receipt scans per month. Upgrade to Family for unlimited receipt scanning.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_receipt_tier_limit ON public.receipts;
CREATE TRIGGER trg_enforce_receipt_tier_limit
BEFORE INSERT ON public.receipts
FOR EACH ROW EXECUTE FUNCTION public.enforce_receipt_tier_limit();
