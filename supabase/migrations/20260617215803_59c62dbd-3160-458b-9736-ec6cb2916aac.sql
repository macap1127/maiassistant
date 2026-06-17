
CREATE TABLE public.internal_testers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_testers TO authenticated;
GRANT ALL ON public.internal_testers TO service_role;

ALTER TABLE public.internal_testers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
      AND lower(email) = 'michael@aiblueribbon.com'
  );
$$;

CREATE POLICY "admin manage testers"
ON public.internal_testers FOR ALL
TO authenticated
USING (public.is_app_admin())
WITH CHECK (public.is_app_admin());

CREATE OR REPLACE FUNCTION public.admin_tester_activity_today()
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

  WITH testers AS (
    SELECT lower(t.email) AS email, u.id AS user_id, u.last_sign_in_at
    FROM public.internal_testers t
    LEFT JOIN auth.users u ON lower(u.email) = lower(t.email)
  ),
  actions AS (
    SELECT user_id, created_at AS ts FROM public.tasks
      WHERE created_at >= _day_start AND user_id IN (SELECT user_id FROM testers WHERE user_id IS NOT NULL)
    UNION ALL
    SELECT user_id, updated_at FROM public.tasks
      WHERE updated_at >= _day_start AND user_id IN (SELECT user_id FROM testers WHERE user_id IS NOT NULL)
    UNION ALL
    SELECT user_id, created_at FROM public.events
      WHERE created_at >= _day_start AND user_id IN (SELECT user_id FROM testers WHERE user_id IS NOT NULL)
    UNION ALL
    SELECT user_id, created_at FROM public.grocery_items
      WHERE created_at >= _day_start AND user_id IN (SELECT user_id FROM testers WHERE user_id IS NOT NULL)
    UNION ALL
    SELECT user_id, created_at FROM public.receipts
      WHERE created_at >= _day_start AND user_id IN (SELECT user_id FROM testers WHERE user_id IS NOT NULL)
  ),
  signins AS (
    SELECT user_id, last_sign_in_at AS ts FROM testers
    WHERE last_sign_in_at >= _day_start
  ),
  all_activity AS (
    SELECT user_id, ts FROM actions
    UNION ALL
    SELECT user_id, ts FROM signins
  ),
  hourly AS (
    SELECT EXTRACT(HOUR FROM ts)::int AS hour, COUNT(DISTINCT user_id)::int AS active
    FROM all_activity
    GROUP BY 1
  ),
  hour_series AS (
    SELECT generate_series(0,23) AS hour
  )
  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'total_testers', (SELECT COUNT(*) FROM public.internal_testers),
      'signed_up', (SELECT COUNT(*) FROM testers WHERE user_id IS NOT NULL),
      'active_today', (SELECT COUNT(DISTINCT user_id) FROM all_activity)
    ),
    'hourly', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('hour', hs.hour, 'active', COALESCE(h.active, 0)) ORDER BY hs.hour)
      FROM hour_series hs LEFT JOIN hourly h ON h.hour = hs.hour
    ), '[]'::jsonb),
    'testers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'email', t.email,
        'signed_up', t.user_id IS NOT NULL,
        'last_sign_in_at', t.last_sign_in_at,
        'active_today', EXISTS (SELECT 1 FROM all_activity a WHERE a.user_id = t.user_id)
      ) ORDER BY t.email)
      FROM testers t
    ), '[]'::jsonb)
  ) INTO _result;

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_tester_activity_today() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_app_admin() TO authenticated;
