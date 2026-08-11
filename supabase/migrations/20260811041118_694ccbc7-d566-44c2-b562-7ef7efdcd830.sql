DROP TRIGGER IF EXISTS trg_enforce_sms_tier ON public.sms_reminder_prefs;
DROP TABLE IF EXISTS public.sms_reminder_prefs;
DROP TABLE IF EXISTS public.public_sms_optins;
DROP FUNCTION IF EXISTS public.enforce_sms_tier();
CREATE OR REPLACE FUNCTION public.household_feature_allowed(_household_id uuid, _feature text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN _feature IN ('ai_calendar_import','shared_workspace','unlimited_receipts')
      THEN public.household_tier(_household_id) IN ('family','family_plus')
    ELSE true
  END;
$function$;