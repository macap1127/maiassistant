GRANT INSERT ON public.public_sms_optins TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.public_sms_optins TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_reminder_prefs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_reminder_prefs TO service_role;