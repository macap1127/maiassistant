
CREATE TABLE public.push_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_digest boolean NOT NULL DEFAULT true,
  event_reminders boolean NOT NULL DEFAULT true,
  family_activity boolean NOT NULL DEFAULT true,
  account_billing boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_preferences TO authenticated;
GRANT ALL ON public.push_preferences TO service_role;

ALTER TABLE public.push_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own push prefs"
  ON public.push_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER push_preferences_updated_at
  BEFORE UPDATE ON public.push_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update activity trigger fn to honor `family_activity` preference.
CREATE OR REPLACE FUNCTION public.notify_household_activity(_household_id uuid, _title text, _body text, _kind text, _added_by text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_ids uuid[];
  _payload jsonb;
  _url text := 'https://kdrtvdkmggscyrkmxhws.supabase.co/functions/v1/send-push';
  _anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnR2ZGttZ2dzY3lya214aHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MTcwNDIsImV4cCI6MjA5MjM5MzA0Mn0.JKJ_ggldCgXcvi0_3a1XF-Ka57zANfnqsRZmdLXcC80';
BEGIN
  SELECT array_agg(DISTINCT m.user_id) INTO _user_ids
  FROM public.household_members m
  JOIN public.device_tokens d ON d.user_id = m.user_id
  LEFT JOIN public.push_preferences p ON p.user_id = m.user_id
  WHERE m.household_id = _household_id
    AND COALESCE(p.family_activity, true) = true;

  IF _user_ids IS NULL OR array_length(_user_ids, 1) = 0 THEN
    RETURN;
  END IF;

  _payload := jsonb_build_object(
    'user_ids', to_jsonb(_user_ids),
    'title', _title,
    'body', _body,
    'data', jsonb_build_object('type', _kind, 'household_id', _household_id::text, 'added_by', COALESCE(_added_by, ''))
  );

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || _anon, 'apikey', _anon),
    body := _payload
  );
END;
$function$;
