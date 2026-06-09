
-- Fix privilege escalation: replace permissive invite-join policy with a SECURITY DEFINER RPC
-- that requires the caller to present the actual invite code.

DROP POLICY IF EXISTS "Invitees can join via valid invite" ON public.household_members;

CREATE OR REPLACE FUNCTION public.accept_invite(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _invite public.household_invites%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _invite
  FROM public.household_invites
  WHERE invite_code = upper(_code)
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite code' USING ERRCODE = '22023';
  END IF;
  IF _invite.accepted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Invite has already been used' USING ERRCODE = '22023';
  END IF;
  IF _invite.expires_at <= now() THEN
    RAISE EXCEPTION 'Invite has expired' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (_invite.household_id, _uid, 'member')
  ON CONFLICT (household_id, user_id) DO NOTHING;

  UPDATE public.household_invites
  SET accepted_at = now(), accepted_by = _uid
  WHERE id = _invite.id AND accepted_at IS NULL;

  RETURN _invite.household_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_invite(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_invite(text) TO authenticated;

-- Lock down public_sms_optins reads: explicit service_role-only SELECT policy.
CREATE POLICY "Only service role can read sms opt-ins"
  ON public.public_sms_optins
  FOR SELECT
  TO service_role
  USING (true);
