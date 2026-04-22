
-- ─── Helper: updated_at trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─── Role enum ─────────────────────────────────────────────────────
CREATE TYPE public.household_role AS ENUM ('owner', 'member');

-- ─── households ────────────────────────────────────────────────────
CREATE TABLE public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'My Family',
  primary_phone TEXT NOT NULL UNIQUE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_households_primary_phone ON public.households(primary_phone);
CREATE INDEX idx_households_owner ON public.households(owner_user_id);

CREATE TRIGGER trg_households_updated_at
BEFORE UPDATE ON public.households
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── household_members (user ↔ household) ──────────────────────────
CREATE TABLE public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.household_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);

CREATE INDEX idx_household_members_user ON public.household_members(user_id);
CREATE INDEX idx_household_members_household ON public.household_members(household_id);

-- ─── family_members (people in the family, not auth users) ─────────
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Member',
  phone TEXT NOT NULL DEFAULT '',
  avatar TEXT DEFAULT '👤',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_family_members_household ON public.family_members(household_id);

CREATE TRIGGER trg_family_members_updated_at
BEFORE UPDATE ON public.family_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── grocery_items ─────────────────────────────────────────────────
CREATE TABLE public.grocery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT NOT NULL DEFAULT '',
  added_by TEXT NOT NULL DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_grocery_items_household ON public.grocery_items(household_id);

CREATE TRIGGER trg_grocery_items_updated_at
BEFORE UPDATE ON public.grocery_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── tasks ─────────────────────────────────────────────────────────
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assigned_to TEXT NOT NULL DEFAULT '',
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tasks_household ON public.tasks(household_id);

CREATE TRIGGER trg_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── events ────────────────────────────────────────────────────────
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT,
  location TEXT,
  notes TEXT,
  added_by TEXT NOT NULL DEFAULT '',
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_household ON public.events(household_id);
CREATE INDEX idx_events_date ON public.events(date);

CREATE TRIGGER trg_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Security definer: check household membership ──────────────────
CREATE OR REPLACE FUNCTION public.is_household_member(_household_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members
    WHERE household_id = _household_id
      AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_household_owner(_household_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.household_members
    WHERE household_id = _household_id
      AND user_id = _user_id
      AND role = 'owner'
  );
$$;

-- ─── Auto-add owner as member when household is created ────────────
CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.household_members (household_id, user_id, role)
  VALUES (NEW.id, NEW.owner_user_id, 'owner')
  ON CONFLICT (household_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_households_add_owner
AFTER INSERT ON public.households
FOR EACH ROW EXECUTE FUNCTION public.add_owner_as_member();

-- ─── Enable RLS ────────────────────────────────────────────────────
ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grocery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- ─── households policies ───────────────────────────────────────────
CREATE POLICY "Members can view their households"
ON public.households FOR SELECT TO authenticated
USING (public.is_household_member(id, auth.uid()));

CREATE POLICY "Authenticated users can create households"
ON public.households FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Owners can update their household"
ON public.households FOR UPDATE TO authenticated
USING (public.is_household_owner(id, auth.uid()));

CREATE POLICY "Owners can delete their household"
ON public.households FOR DELETE TO authenticated
USING (public.is_household_owner(id, auth.uid()));

-- ─── household_members policies ────────────────────────────────────
CREATE POLICY "Users can view memberships in their households"
ON public.household_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_household_member(household_id, auth.uid()));

CREATE POLICY "Owners can add members"
ON public.household_members FOR INSERT TO authenticated
WITH CHECK (public.is_household_owner(household_id, auth.uid()));

CREATE POLICY "Owners can remove members"
ON public.household_members FOR DELETE TO authenticated
USING (public.is_household_owner(household_id, auth.uid()));

-- ─── family_members policies ───────────────────────────────────────
CREATE POLICY "Members can view family members"
ON public.family_members FOR SELECT TO authenticated
USING (public.is_household_member(household_id, auth.uid()));

CREATE POLICY "Members can add family members"
ON public.family_members FOR INSERT TO authenticated
WITH CHECK (public.is_household_member(household_id, auth.uid()));

CREATE POLICY "Members can update family members"
ON public.family_members FOR UPDATE TO authenticated
USING (public.is_household_member(household_id, auth.uid()));

CREATE POLICY "Members can delete family members"
ON public.family_members FOR DELETE TO authenticated
USING (public.is_household_member(household_id, auth.uid()));

-- ─── grocery_items policies ────────────────────────────────────────
CREATE POLICY "Members can view grocery items"
ON public.grocery_items FOR SELECT TO authenticated
USING (public.is_household_member(household_id, auth.uid()));

CREATE POLICY "Members can add grocery items"
ON public.grocery_items FOR INSERT TO authenticated
WITH CHECK (public.is_household_member(household_id, auth.uid()));

CREATE POLICY "Members can update grocery items"
ON public.grocery_items FOR UPDATE TO authenticated
USING (public.is_household_member(household_id, auth.uid()));

CREATE POLICY "Members can delete grocery items"
ON public.grocery_items FOR DELETE TO authenticated
USING (public.is_household_member(household_id, auth.uid()));

-- ─── tasks policies ────────────────────────────────────────────────
CREATE POLICY "Members can view tasks"
ON public.tasks FOR SELECT TO authenticated
USING (public.is_household_member(household_id, auth.uid()));

CREATE POLICY "Members can add tasks"
ON public.tasks FOR INSERT TO authenticated
WITH CHECK (public.is_household_member(household_id, auth.uid()));

CREATE POLICY "Members can update tasks"
ON public.tasks FOR UPDATE TO authenticated
USING (public.is_household_member(household_id, auth.uid()));

CREATE POLICY "Members can delete tasks"
ON public.tasks FOR DELETE TO authenticated
USING (public.is_household_member(household_id, auth.uid()));

-- ─── events policies ───────────────────────────────────────────────
CREATE POLICY "Members can view events"
ON public.events FOR SELECT TO authenticated
USING (public.is_household_member(household_id, auth.uid()));

CREATE POLICY "Members can add events"
ON public.events FOR INSERT TO authenticated
WITH CHECK (public.is_household_member(household_id, auth.uid()));

CREATE POLICY "Members can update events"
ON public.events FOR UPDATE TO authenticated
USING (public.is_household_member(household_id, auth.uid()));

CREATE POLICY "Members can delete events"
ON public.events FOR DELETE TO authenticated
USING (public.is_household_member(household_id, auth.uid()));

-- ─── Realtime ──────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.households;
ALTER PUBLICATION supabase_realtime ADD TABLE public.family_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grocery_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
