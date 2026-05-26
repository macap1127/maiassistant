ALTER TABLE public.households ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '365 days');
ALTER TABLE public.households ALTER COLUMN voice_seconds_limit SET DEFAULT 14400;