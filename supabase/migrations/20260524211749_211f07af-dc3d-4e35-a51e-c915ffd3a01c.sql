CREATE POLICY "Invitees can join via valid invite"
ON public.household_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.household_invites i
    WHERE i.household_id = household_members.household_id
      AND i.accepted_at IS NULL
      AND i.expires_at > now()
  )
);