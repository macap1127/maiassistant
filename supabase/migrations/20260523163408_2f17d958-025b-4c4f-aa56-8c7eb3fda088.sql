
-- 1. Drop the overly permissive invite lookup policy
DROP POLICY IF EXISTS "Anyone authenticated can view invite by code lookup" ON public.household_invites;

-- 2. Create a security-definer function to safely look up an invite by code
CREATE OR REPLACE FUNCTION public.get_invite_by_code(_code text)
RETURNS TABLE (
  household_id uuid,
  household_name text,
  expires_at timestamptz,
  accepted_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT i.household_id, h.name, i.expires_at, i.accepted_at
  FROM public.household_invites i
  JOIN public.households h ON h.id = i.household_id
  WHERE i.invite_code = upper(_code)
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_invite_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invite_by_code(text) TO authenticated, anon;

-- 3. Storage: add UPDATE policy for receipts bucket
DROP POLICY IF EXISTS "Members can update receipt files" ON storage.objects;
CREATE POLICY "Members can update receipt files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND public.is_household_member(((storage.foldername(name))[1])::uuid, auth.uid())
)
WITH CHECK (
  bucket_id = 'receipts'
  AND public.is_household_member(((storage.foldername(name))[1])::uuid, auth.uid())
);

-- 4. Realtime: restrict channel subscriptions to household members
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated household members can receive realtime" ON realtime.messages;
CREATE POLICY "Authenticated household members can receive realtime"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE 'household-%'
  AND public.is_household_member(
    substring(realtime.topic() from 'household-(.*)$')::uuid,
    auth.uid()
  )
);
