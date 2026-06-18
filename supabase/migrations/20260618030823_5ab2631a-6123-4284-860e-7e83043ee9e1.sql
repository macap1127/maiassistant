
CREATE OR REPLACE FUNCTION public.admin_active_users_today()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result jsonb;
  _day_start timestamptz := date_trunc('day', now());
BEGIN
  IF NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;

  WITH hh_active AS (
    SELECT household_id FROM public.tasks WHERE created_at >= _day_start OR updated_at >= _day_start
    UNION SELECT household_id FROM public.events WHERE created_at >= _day_start OR updated_at >= _day_start
    UNION SELECT household_id FROM public.grocery_items WHERE created_at >= _day_start OR updated_at >= _day_start
    UNION SELECT household_id FROM public.receipts WHERE created_at >= _day_start OR updated_at >= _day_start
    UNION SELECT household_id FROM public.voice_usage_log WHERE created_at >= _day_start
  ),
  users_acted AS (
    SELECT DISTINCT m.user_id FROM public.household_members m JOIN hh_active h USING (household_id)
  ),
  rows AS (
    SELECT lower(u.email) AS email,
           u.last_sign_in_at,
           (u.id IN (SELECT user_id FROM users_acted)) AS household_acted_today,
           (u.last_sign_in_at >= _day_start) AS signed_in_today,
           EXISTS (SELECT 1 FROM public.internal_testers t WHERE lower(t.email) = lower(u.email)) AS is_tester
    FROM auth.users u
    WHERE u.id IN (SELECT user_id FROM users_acted)
       OR u.last_sign_in_at >= _day_start
  )
  SELECT jsonb_build_object(
    'day_start', _day_start,
    'summary', jsonb_build_object(
      'total_active', (SELECT COUNT(*) FROM rows),
      'household_acted', (SELECT COUNT(*) FROM rows WHERE household_acted_today),
      'signed_in_only', (SELECT COUNT(*) FROM rows WHERE NOT household_acted_today AND signed_in_today),
      'testers_active', (SELECT COUNT(*) FROM rows WHERE is_tester)
    ),
    'users', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'email', email,
        'last_sign_in_at', last_sign_in_at,
        'household_acted_today', household_acted_today,
        'signed_in_today', signed_in_today,
        'is_tester', is_tester
      ) ORDER BY household_acted_today DESC, last_sign_in_at DESC NULLS LAST)
      FROM rows
    ), '[]'::jsonb)
  ) INTO _result;

  RETURN _result;
END;
$$;
