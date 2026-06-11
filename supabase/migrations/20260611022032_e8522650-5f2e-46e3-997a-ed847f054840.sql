-- 1. Add usage tracking columns to households
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS ai_calendar_imports_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_calendar_imports_period_start timestamptz NOT NULL DEFAULT date_trunc('month', now());

-- 2. Check function: can this household perform an AI calendar import right now?
CREATE OR REPLACE FUNCTION public.can_use_ai_calendar_import(_household_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tier text;
  _used integer;
  _period_start timestamptz;
  _current_period timestamptz := date_trunc('month', now());
BEGIN
  SELECT subscription_tier, ai_calendar_imports_used, ai_calendar_imports_period_start
    INTO _tier, _used, _period_start
  FROM public.households
  WHERE id = _household_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Family / Family Plus: unlimited
  IF _tier IN ('family', 'family_plus') THEN
    RETURN true;
  END IF;

  -- Basic: 5 per calendar month. If we've rolled into a new month, treat as 0 used.
  IF _period_start < _current_period THEN
    RETURN true;
  END IF;

  RETURN COALESCE(_used, 0) < 5;
END;
$$;

-- 3. Increment function: bump counter after a successful import, resetting period if needed.
CREATE OR REPLACE FUNCTION public.increment_ai_calendar_usage(_household_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_used integer;
  _current_period timestamptz := date_trunc('month', now());
BEGIN
  -- Membership check
  IF NOT public.is_household_member(_household_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not a household member' USING ERRCODE = '42501';
  END IF;

  UPDATE public.households
  SET
    ai_calendar_imports_used = CASE
      WHEN ai_calendar_imports_period_start < _current_period THEN 1
      ELSE ai_calendar_imports_used + 1
    END,
    ai_calendar_imports_period_start = CASE
      WHEN ai_calendar_imports_period_start < _current_period THEN _current_period
      ELSE ai_calendar_imports_period_start
    END,
    updated_at = now()
  WHERE id = _household_id
  RETURNING ai_calendar_imports_used INTO _new_used;

  RETURN _new_used;
END;
$$;