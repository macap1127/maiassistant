UPDATE public.households
SET stripe_customer_id = NULL,
    stripe_subscription_id = NULL,
    subscription_status = 'trialing',
    cancel_at_period_end = false,
    current_period_end = NULL
WHERE id = '0cfa9e43-433c-4f51-b51b-e6f01160926f';