-- Add sequence column to categories table if it doesn't exist
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS sequence integer NOT NULL DEFAULT 999;

-- Ensure existing categories have a sequence value
UPDATE public.categories 
SET sequence = 999 
WHERE sequence IS NULL;

-- Update all existing profiles to set is_initial_setup_completed to true
UPDATE public.profiles
SET is_initial_setup_completed = true;

-- Populate email and username for all existing profiles
UPDATE public.profiles
SET email = auth.users.email,
    username = regexp_replace(auth.users.email, '@.*$', '')
FROM auth.users
WHERE public.profiles.id = auth.users.id;