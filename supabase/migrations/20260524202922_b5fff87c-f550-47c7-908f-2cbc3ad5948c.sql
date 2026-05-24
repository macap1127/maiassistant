CREATE TABLE public.public_sms_optins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  consent BOOLEAN NOT NULL DEFAULT false,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.public_sms_optins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can submit opt-in"
  ON public.public_sms_optins FOR INSERT
  TO anon, authenticated
  WITH CHECK (consent = true AND length(phone) BETWEEN 7 AND 20);