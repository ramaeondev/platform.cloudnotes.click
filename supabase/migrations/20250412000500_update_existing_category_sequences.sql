-- Update existing category records with sequence numbers
-- This will assign sequence numbers for each user's categories starting from 1
DO $$
DECLARE
    v_user record;
BEGIN
    -- Loop through each distinct user_id in categories table
    FOR v_user IN SELECT DISTINCT user_id FROM categories LOOP
        -- Update sequence numbers for each user's categories
        WITH numbered_categories AS (
            SELECT 
                id,
                ROW_NUMBER() OVER (
                    PARTITION BY user_id 
                    ORDER BY created_at ASC
                ) as new_sequence
            FROM categories
            WHERE user_id = v_user.user_id
        )
        UPDATE categories c
        SET sequence = nc.new_sequence
        FROM numbered_categories nc
        WHERE c.id = nc.id;
    END LOOP;
END $$;