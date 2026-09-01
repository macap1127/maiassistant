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
    url := 'https://kdrtvdkmggscyrkmxhws.supabase.co/functions/v1/send-admin-alert',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _key
    ),
    body := jsonb_build_object(
      'idempotencyKey', _data->>'idempotencyKey',
      'templateData', _data - 'idempotencyKey'
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'send_admin_activity_alert failed: %', SQLERRM;
END;
$$;