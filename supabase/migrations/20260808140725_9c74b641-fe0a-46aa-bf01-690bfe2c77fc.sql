ALTER TABLE public.households ALTER COLUMN trial_ends_at DROP DEFAULT;
ALTER TABLE public.households ALTER COLUMN subscription_status SET DEFAULT 'incomplete';