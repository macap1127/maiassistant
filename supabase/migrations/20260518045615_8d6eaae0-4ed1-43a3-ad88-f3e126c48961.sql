UPDATE public.households
SET voice_seconds_limit = 14400
WHERE subscription_tier = 'family_plus' AND voice_seconds_limit = 18000;