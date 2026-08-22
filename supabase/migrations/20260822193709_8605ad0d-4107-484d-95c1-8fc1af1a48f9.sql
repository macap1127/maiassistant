
CREATE OR REPLACE FUNCTION public.send_admin_activity_alert(_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  _key text;
BEGIN
  SELECT decrypted_secret INTO _key
  FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key';
  IF _key IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := 'https://kdrtvdkmggscyrkmxhws.supabase.co/functions/v1/send-transactional-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _key
    ),
    body := jsonb_build_object(
      'templateName', 'admin-signup-alert',
      'recipientEmail', 'michael@aiblueribbon.com',
      'idempotencyKey', _data->>'idempotencyKey',
      'templateData', _data - 'idempotencyKey'
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'send_admin_activity_alert failed: %', SQLERRM;
END;
$$;

-- New signup: fires when a household owner row is created
CREATE OR REPLACE FUNCTION public.tg_admin_alert_new_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _email text;
  _hh record;
BEGIN
  IF NEW.role <> 'owner' THEN
    RETURN NEW;
  END IF;
  SELECT email INTO _email FROM auth.users WHERE id = NEW.user_id;
  SELECT name, subscription_tier, subscription_status INTO _hh
  FROM public.households WHERE id = NEW.household_id;

  PERFORM public.send_admin_activity_alert(jsonb_build_object(
    'idempotencyKey', 'admin-signup-' || NEW.id::text,
    'eventType', 'signup',
    'userEmail', COALESCE(_email, NEW.user_id::text),
    'householdName', _hh.name,
    'tier', _hh.subscription_tier,
    'status', _hh.subscription_status,
    'occurredAt', to_char(now() AT TIME ZONE 'America/New_York', 'YYYY-MM-DD HH24:MI') || ' ET'
  ));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_alert_new_signup ON public.household_members;
CREATE TRIGGER trg_admin_alert_new_signup
AFTER INSERT ON public.household_members
FOR EACH ROW EXECUTE FUNCTION public.tg_admin_alert_new_signup();

-- Plan selected / changed
CREATE OR REPLACE FUNCTION public.tg_admin_alert_plan_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _email text;
BEGIN
  IF NEW.subscription_tier IS NOT DISTINCT FROM OLD.subscription_tier
     AND NEW.subscription_status IS NOT DISTINCT FROM OLD.subscription_status THEN
    RETURN NEW;
  END IF;
  IF NEW.subscription_status NOT IN ('active', 'trialing', 'past_due', 'canceled') THEN
    RETURN NEW;
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = NEW.owner_user_id;

  PERFORM public.send_admin_activity_alert(jsonb_build_object(
    'idempotencyKey', 'admin-plan-' || NEW.id::text || '-' || NEW.subscription_tier || '-' || NEW.subscription_status,
    'eventType', 'plan',
    'userEmail', COALESCE(_email, NEW.owner_user_id::text),
    'householdName', NEW.name,
    'tier', NEW.subscription_tier,
    'status', NEW.subscription_status,
    'occurredAt', to_char(now() AT TIME ZONE 'America/New_York', 'YYYY-MM-DD HH24:MI') || ' ET'
  ));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_alert_plan_change ON public.households;
CREATE TRIGGER trg_admin_alert_plan_change
AFTER UPDATE ON public.households
FOR EACH ROW EXECUTE FUNCTION public.tg_admin_alert_plan_change();

-- Admin report: every user with household + plan
CREATE OR REPLACE FUNCTION public.admin_signup_activity()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result jsonb;
BEGIN
  IF NOT public.is_app_admin() THEN
    RAISE EXCEPTION 'Admin only' USING ERRCODE = '42501';
  END IF;

  WITH rows AS (
    SELECT
      lower(u.email) AS email,
      u.created_at AS signed_up_at,
      u.last_sign_in_at,
      h.name AS household_name,
      h.subscription_tier AS tier,
      h.subscription_status AS status,
      m.role::text AS household_role,
      h.trial_ends_at,
      h.current_period_end
    FROM auth.users u
    LEFT JOIN public.household_members m ON m.user_id = u.id
    LEFT JOIN public.households h ON h.id = m.household_id
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'total_users', (SELECT COUNT(DISTINCT email) FROM rows),
      'last_7_days', (SELECT COUNT(DISTINCT email) FROM rows WHERE signed_up_at >= now() - interval '7 days'),
      'last_30_days', (SELECT COUNT(DISTINCT email) FROM rows WHERE signed_up_at >= now() - interval '30 days'),
      'paying', (SELECT COUNT(*) FROM rows WHERE status IN ('active','trialing') AND household_role = 'owner')
    ),
    'by_tier', COALESCE((
      SELECT jsonb_object_agg(t, c) FROM (
        SELECT COALESCE(tier, 'none') AS t, COUNT(*)::int AS c
        FROM rows WHERE household_role = 'owner' GROUP BY 1
      ) x
    ), '{}'::jsonb),
    'users', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'email', email,
        'signed_up_at', signed_up_at,
        'last_sign_in_at', last_sign_in_at,
        'household_name', household_name,
        'tier', tier,
        'status', status,
        'household_role', household_role,
        'trial_ends_at', trial_ends_at,
        'current_period_end', current_period_end
      ) ORDER BY signed_up_at DESC)
      FROM rows
    ), '[]'::jsonb)
  ) INTO _result;

  RETURN _result;
END;
$$;
