
-- ========== RECEIPTS ==========
CREATE TABLE public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  added_by text NOT NULL DEFAULT '',
  store text NOT NULL DEFAULT '',
  purchase_date date,
  total numeric(12,2),
  currency text NOT NULL DEFAULT 'USD',
  notes text,
  items_summary text,
  image_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view receipts" ON public.receipts FOR SELECT TO authenticated
  USING (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members can add receipts" ON public.receipts FOR INSERT TO authenticated
  WITH CHECK (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members can update receipts" ON public.receipts FOR UPDATE TO authenticated
  USING (public.is_household_member(household_id, auth.uid()));
CREATE POLICY "Members can delete receipts" ON public.receipts FOR DELETE TO authenticated
  USING (public.is_household_member(household_id, auth.uid()));

CREATE INDEX idx_receipts_household_date ON public.receipts(household_id, purchase_date DESC NULLS LAST, created_at DESC);

CREATE TRIGGER trg_receipts_updated_at BEFORE UPDATE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.receipts;

-- Storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', false)
  ON CONFLICT (id) DO NOTHING;

-- Files are stored as <household_id>/<filename>. Only household members can touch them.
CREATE POLICY "Members can read receipt files" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipts'
    AND public.is_household_member((storage.foldername(name))[1]::uuid, auth.uid())
  );
CREATE POLICY "Members can upload receipt files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND public.is_household_member((storage.foldername(name))[1]::uuid, auth.uid())
  );
CREATE POLICY "Members can delete receipt files" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'receipts'
    AND public.is_household_member((storage.foldername(name))[1]::uuid, auth.uid())
  );

-- ========== SMS REMINDER PREFS ==========
CREATE TABLE public.sms_reminder_prefs (
  user_id uuid PRIMARY KEY,
  household_id uuid NOT NULL,
  opted_in boolean NOT NULL DEFAULT false,
  phone text NOT NULL DEFAULT '',
  send_time text NOT NULL DEFAULT '07:00',
  timezone text NOT NULL DEFAULT 'America/New_York',
  last_sent_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_reminder_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prefs" ON public.sms_reminder_prefs FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can insert own prefs" ON public.sms_reminder_prefs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own prefs" ON public.sms_reminder_prefs FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can delete own prefs" ON public.sms_reminder_prefs FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_sms_prefs_updated_at BEFORE UPDATE ON public.sms_reminder_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
