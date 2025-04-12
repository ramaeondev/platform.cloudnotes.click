-- First drop the unique constraint that's causing issues
ALTER TABLE categories DROP CONSTRAINT IF EXISTS unique_user_sequence;

-- Create a new function to handle sequence updates properly
CREATE OR REPLACE FUNCTION update_category_sequence(
    p_category_id UUID,
    p_new_sequence INT,
    p_user_id UUID
)
RETURNS void AS $$
DECLARE
    v_old_sequence INT;
    v_min_affected INT;
    v_max_affected INT;
BEGIN
    -- Get the current sequence of the category
    SELECT sequence INTO v_old_sequence
    FROM categories
    WHERE id = p_category_id AND user_id = p_user_id;

    IF v_old_sequence IS NULL THEN
        RAISE EXCEPTION 'Category not found';
    END IF;

    -- If moving down the list (increasing sequence)
    IF p_new_sequence > v_old_sequence THEN
        UPDATE categories
        SET sequence = sequence - 1
        WHERE user_id = p_user_id
        AND sequence > v_old_sequence
        AND sequence <= p_new_sequence;
    -- If moving up the list (decreasing sequence)
    ELSIF p_new_sequence < v_old_sequence THEN
        UPDATE categories
        SET sequence = sequence + 1
        WHERE user_id = p_user_id
        AND sequence >= p_new_sequence
        AND sequence < v_old_sequence;
    END IF;

    -- Update the target category's sequence
    UPDATE categories
    SET sequence = p_new_sequence
    WHERE id = p_category_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;