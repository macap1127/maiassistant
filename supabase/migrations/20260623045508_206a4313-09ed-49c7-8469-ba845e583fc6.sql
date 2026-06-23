
-- Dedup log for scheduled push reminders
CREATE TABLE IF NOT EXISTS public.push_send_log (
  user_id uuid NOT NULL,
  kind text NOT NULL,
  key text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, key)
);
GRANT ALL ON public.push_send_log TO service_role;
ALTER TABLE public.push_send_log ENABLE ROW LEVEL SECURITY;
-- No client access; service role only via SECURITY DEFINER functions.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Helper: call the send-push edge function via pg_net for a household, excluding the actor name.
CREATE OR REPLACE FUNCTION public.notify_household_activity(
  _household_id uuid,
  _title text,
  _body text,
  _kind text,
  _added_by text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_ids uuid[];
  _payload jsonb;
  _url text := 'https://kdrtvdkmggscyrkmxhws.supabase.co/functions/v1/send-push';
  _anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkcnR2ZGttZ2dzY3lya214aHdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MTcwNDIsImV4cCI6MjA5MjM5MzA0Mn0.JKJ_ggldCgXcvi0_3a1XF-Ka57zANfnqsRZmdLXcC80';
BEGIN
  -- All household members that have at least one device token
  SELECT array_agg(DISTINCT m.user_id) INTO _user_ids
  FROM public.household_members m
  JOIN public.device_tokens d ON d.user_id = m.user_id
  WHERE m.household_id = _household_id;

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
$$;

-- Trigger functions for each activity type
CREATE OR REPLACE FUNCTION public.tg_push_grocery_added() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_household_activity(
    NEW.household_id,
    'New grocery item',
    COALESCE(NEW.added_by, 'Someone') || ' added ' || NEW.name,
    'grocery_added',
    NEW.added_by
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_push_task_added() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_household_activity(
    NEW.household_id,
    'New task',
    COALESCE(NEW.assigned_to, 'Someone') || ': ' || NEW.title,
    'task_added',
    NEW.assigned_to
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_push_event_added() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _when text;
BEGIN
  _when := to_char(NEW.date, 'Mon DD');
  IF NEW.time IS NOT NULL AND NEW.time <> '' THEN
    _when := _when || ' at ' || NEW.time;
  END IF;
  PERFORM public.notify_household_activity(
    NEW.household_id,
    'New event: ' || NEW.title,
    COALESCE(NEW.added_by, 'Someone') || ' added ' || NEW.title || ' (' || _when || ')',
    'event_added',
    NEW.added_by
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_grocery_added ON public.grocery_items;
CREATE TRIGGER push_grocery_added
  AFTER INSERT ON public.grocery_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_push_grocery_added();

DROP TRIGGER IF EXISTS push_task_added ON public.tasks;
CREATE TRIGGER push_task_added
  AFTER INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tg_push_task_added();

DROP TRIGGER IF EXISTS push_event_added ON public.events;
CREATE TRIGGER push_event_added
  AFTER INSERT ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.tg_push_event_added();
