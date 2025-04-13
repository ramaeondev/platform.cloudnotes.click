-- Add sequence column to categories table if it doesn't exist
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS sequence integer NOT NULL DEFAULT 999;

-- Ensure existing categories have a sequence value
UPDATE public.categories 
SET sequence = 999 
WHERE sequence IS NULL; 