ALTER TABLE public.grocery_items
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Other';

CREATE INDEX IF NOT EXISTS idx_grocery_items_household_category
  ON public.grocery_items(household_id, category);