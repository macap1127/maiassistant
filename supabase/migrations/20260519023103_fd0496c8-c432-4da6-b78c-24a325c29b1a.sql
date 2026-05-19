ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS has_used_trial boolean NOT NULL DEFAULT false;

-- Existing households that already have or had a real Stripe subscription
-- shouldn't be eligible for a fresh trial when they resubscribe.
UPDATE public.households
  SET has_used_trial = true
  WHERE stripe_subscription_id IS NOT NULL
     OR subscription_status IN ('active', 'past_due', 'canceled');