UPDATE public.households
SET
  subscription_tier = 'family_plus',
  subscription_status = 'active',
  access_locked = false,
  voice_seconds_limit = 14400,
  current_period_start = now(),
  current_period_end = now() + interval '100 years',
  cancel_at_period_end = false,
  has_used_trial = true,
  updated_at = now()
WHERE id = '0cfa9e43-433c-4f51-b51b-e6f01160926f';