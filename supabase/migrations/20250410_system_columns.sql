
-- Add is_system column to folders table
ALTER TABLE public.folders 
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- Add is_system column to categories table
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

-- Update existing Root folders to be system folders
UPDATE public.folders
SET is_system = true
WHERE name = 'Root';

-- Update existing Default categories to be system categories
UPDATE public.categories
SET is_system = true
WHERE name = 'Default';

-- Ensure the email column in newsletter_subscribers has a unique constraint
ALTER TABLE public.newsletter_subscribers
DROP CONSTRAINT IF EXISTS newsletter_subscribers_email_key;
  
ALTER TABLE public.newsletter_subscribers
ADD CONSTRAINT newsletter_subscribers_email_key UNIQUE (email);
