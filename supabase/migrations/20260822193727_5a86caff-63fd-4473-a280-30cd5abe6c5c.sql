
REVOKE ALL ON FUNCTION public.send_admin_activity_alert(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_admin_alert_new_signup() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tg_admin_alert_plan_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_signup_activity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_signup_activity() TO authenticated;
