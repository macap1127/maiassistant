CREATE OR REPLACE FUNCTION public.household_has_valid_invite(_household_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.household_invites
    WHERE household_id = _household_id
      AND accepted_at IS NULL
      AND expires_at > now()
  );
$$;

DROP POLICY IF EXISTS "Invitees can join via valid invite" ON public.household_members;

CREATE POLICY "Invitees can join via valid invite"
ON public.household_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.household_has_valid_invite(household_id)
);