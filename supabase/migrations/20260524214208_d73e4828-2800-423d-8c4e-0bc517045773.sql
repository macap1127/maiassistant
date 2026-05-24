ALTER TABLE public.family_members ADD COLUMN IF NOT EXISTS user_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS family_members_household_user_unique
  ON public.family_members (household_id, user_id)
  WHERE user_id IS NOT NULL;