CREATE OR REPLACE FUNCTION public.is_app_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND lower(email) IN ('michael@aiblueribbon.com','michaeldmacri@gmail.com','michael.macri@gmail.com')
  );
$function$;

CREATE OR REPLACE FUNCTION public.admin_free_month_activity()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _result jsonb;
BEGIN
  IF NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;

  WITH cohort AS (
    SELECT lower(l.recipient_email) AS email,
           min(l.created_at) AS emailed_at,
           bool_or(l.status = 'sent') AS delivered
    FROM public.email_send_log l
    WHERE l.template_name = 'free-month-access'
    GROUP BY 1
  ),
  joined AS (
    SELECT c.email,
           c.emailed_at,
           c.delivered,
           u.id AS user_id,
           u.last_sign_in_at,
           h.id AS household_id,
           h.subscription_tier AS tier,
           h.subscription_status AS status,
           h.current_period_end
    FROM cohort c
    LEFT JOIN auth.users u ON lower(u.email) = c.email
    LEFT JOIN public.households h ON h.owner_user_id = u.id
  ),
  activity AS (
    SELECT j.email,
           (SELECT count(*) FROM public.events e WHERE e.household_id = j.household_id AND e.created_at > j.emailed_at) AS events_added,
           (SELECT count(*) FROM public.tasks t WHERE t.household_id = j.household_id AND t.created_at > j.emailed_at) AS tasks_added,
           (SELECT count(*) FROM public.grocery_items g WHERE g.household_id = j.household_id AND g.created_at > j.emailed_at) AS groceries_added,
           (SELECT count(*) FROM public.receipts r WHERE r.household_id = j.household_id AND r.created_at > j.emailed_at) AS receipts_added,
           (SELECT COALESCE(sum(v.seconds), 0) FROM public.voice_usage_log v WHERE v.household_id = j.household_id AND v.created_at > j.emailed_at) AS voice_seconds,
           (SELECT max(ts) FROM (
              SELECT max(created_at) AS ts FROM public.events WHERE household_id = j.household_id
              UNION ALL SELECT max(created_at) FROM public.tasks WHERE household_id = j.household_id
              UNION ALL SELECT max(created_at) FROM public.grocery_items WHERE household_id = j.household_id
              UNION ALL SELECT max(created_at) FROM public.receipts WHERE household_id = j.household_id
              UNION ALL SELECT max(created_at) FROM public.voice_usage_log WHERE household_id = j.household_id
           ) x) AS last_activity_at
    FROM joined j
  ),
  rows AS (
    SELECT j.email,
           j.emailed_at,
           j.delivered,
           j.last_sign_in_at,
           j.tier,
           j.status,
           j.current_period_end,
           (j.last_sign_in_at IS NOT NULL AND j.last_sign_in_at > j.emailed_at) AS signed_in_after_email,
           a.events_added, a.tasks_added, a.groceries_added, a.receipts_added, a.voice_seconds,
           a.last_activity_at,
           (a.events_added + a.tasks_added + a.groceries_added + a.receipts_added) AS items_added,
           (a.last_activity_at IS NOT NULL AND a.last_activity_at > j.emailed_at) AS used_after_email
    FROM joined j JOIN activity a ON a.email = j.email
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'emailed', (SELECT count(*) FROM rows),
      'signed_in', (SELECT count(*) FROM rows WHERE signed_in_after_email),
      'used_app', (SELECT count(*) FROM rows WHERE used_after_email),
      'converted_paid', (SELECT count(*) FROM rows WHERE status IN ('active','trialing') AND current_period_end > now() + interval '35 days')
    ),
    'users', COALESCE((
      SELECT jsonb_agg(to_jsonb(r) ORDER BY r.signed_in_after_email DESC, r.last_activity_at DESC NULLS LAST, r.email)
      FROM rows r
    ), '[]'::jsonb)
  ) INTO _result;

  RETURN _result;
END;
$function$;