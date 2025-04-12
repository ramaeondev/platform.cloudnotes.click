-- Add sequence column to categories table
ALTER TABLE categories ADD COLUMN sequence INTEGER;

-- Set initial sequence values based on existing order
WITH ordered_categories AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as rn
  FROM categories
)
UPDATE categories c
SET sequence = oc.rn
FROM ordered_categories oc
WHERE c.id = oc.id;

-- Make sequence column not nullable after setting initial values
ALTER TABLE categories ALTER COLUMN sequence SET NOT NULL;

-- Add a unique constraint per user to ensure no duplicate sequences
ALTER TABLE categories ADD CONSTRAINT unique_user_sequence UNIQUE (user_id, sequence);