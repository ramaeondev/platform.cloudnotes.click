CREATE OR REPLACE FUNCTION update_category_sequence(
  p_category_id UUID,
  p_new_sequence INTEGER,
  p_old_sequence INTEGER
) RETURNS void AS $$
BEGIN
  -- Start a transaction to ensure atomic updates
  BEGIN
    -- If moving down in sequence (e.g., from 1 to 3)
    IF p_new_sequence > p_old_sequence THEN
      UPDATE categories
      SET sequence = sequence - 1
      WHERE user_id = (SELECT user_id FROM categories WHERE id = p_category_id)
      AND sequence > p_old_sequence
      AND sequence <= p_new_sequence
      AND id != p_category_id;

    -- If moving up in sequence (e.g., from 3 to 1)
    ELSIF p_new_sequence < p_old_sequence THEN
      UPDATE categories
      SET sequence = sequence + 1
      WHERE user_id = (SELECT user_id FROM categories WHERE id = p_category_id)
      AND sequence >= p_new_sequence
      AND sequence < p_old_sequence
      AND id != p_category_id;
    END IF;

    -- Update the target category's sequence
    UPDATE categories
    SET sequence = p_new_sequence
    WHERE id = p_category_id;

    COMMIT;
  EXCEPTION WHEN OTHERS THEN
    ROLLBACK;
    RAISE;
  END;
END;
$$ LANGUAGE plpgsql;