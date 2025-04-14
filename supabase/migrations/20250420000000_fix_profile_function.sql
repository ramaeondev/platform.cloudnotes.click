-- Update the profile function to create a profile if it doesn't exist
CREATE OR REPLACE FUNCTION public.get_profile_with_newsletter_status(profile_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_data JSONB;
  newsletter_status BOOLEAN;
  user_email TEXT;
  profile_exists BOOLEAN;
BEGIN
  -- Check if profile exists
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = profile_id
  ) INTO profile_exists;
  
  -- If profile doesn't exist, check if we need to create it
  IF NOT profile_exists THEN
    -- Get user email from auth.users
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = profile_id;
    
    IF user_email IS NOT NULL THEN
      -- Manually create profile (similar to what handle_new_user would do)
      INSERT INTO profiles (id, email, created_at, updated_at)
      VALUES (profile_id, user_email, now(), now())
      ON CONFLICT (id) DO NOTHING;
      
      -- Create default folders and categories
      PERFORM create_default_folders(profile_id);
      PERFORM create_default_categories(profile_id);
      
      -- Wait a moment for the operation to complete
      PERFORM pg_sleep(0.1);
    END IF;
  END IF;
  
  -- Get the profile data
  SELECT jsonb_build_object(
    'id', p.id,
    'first_name', p.first_name,
    'last_name', p.last_name,
    'username', p.username,
    'email', p.email,
    'avatar_url', p.avatar_url,
    'is_initial_setup_completed', p.is_initial_setup_completed,
    'updated_at', p.updated_at,
    'created_at', p.created_at
  )
  INTO profile_data
  FROM profiles p
  WHERE p.id = profile_id;
  
  -- If profile still doesn't exist, create a minimal profile
  IF profile_data IS NULL THEN
    -- Get user email from auth.users
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = profile_id;
    
    IF user_email IS NOT NULL THEN
      -- Insert a minimal profile
      INSERT INTO profiles (id, email, created_at, updated_at)
      VALUES (profile_id, user_email, now(), now())
      RETURNING jsonb_build_object(
        'id', id,
        'first_name', first_name,
        'last_name', last_name,
        'username', username,
        'email', email,
        'avatar_url', avatar_url,
        'is_initial_setup_completed', is_initial_setup_completed,
        'updated_at', updated_at,
        'created_at', created_at
      ) INTO profile_data;
      
      -- Create default folders and categories
      PERFORM create_default_folders(profile_id);
      PERFORM create_default_categories(profile_id);
    ELSE
      RETURN NULL;
    END IF;
  END IF;
  
  -- Get the newsletter subscription status
  SELECT 
    CASE 
      WHEN ns.subscribed_at IS NOT NULL AND ns.unsubscribed_at IS NULL THEN TRUE
      ELSE FALSE
    END INTO newsletter_status
  FROM profiles p
  LEFT JOIN newsletter_subscribers ns ON p.email = ns.email
  WHERE p.id = profile_id;
  
  -- Add newsletter status to profile data
  profile_data = profile_data || jsonb_build_object('newsletter_subscribed', newsletter_status);
  
  RETURN profile_data;
END;
$$;

-- Create helper functions if they don't exist
CREATE OR REPLACE FUNCTION public.create_default_folders(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert default folders if they don't exist yet
  INSERT INTO folders (name, user_id, is_system, parent_id)
  VALUES 
    ('My Folder', user_id, true, null)
  ON CONFLICT (user_id, name) 
  WHERE parent_id IS NULL AND is_system = true
  DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_default_categories(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_sequence INT;
BEGIN
  -- Get the next sequence number
  SELECT COALESCE(MAX(sequence), 0) + 1 INTO next_sequence
  FROM categories 
  WHERE user_id = user_id;

  -- Insert default categories if they don't exist yet
  INSERT INTO categories (name, color, user_id, is_system, sequence)
  VALUES 
    ('Personal', '#228BE6', user_id, true, next_sequence),
    ('Work', '#FA5252', user_id, true, next_sequence + 1),
    ('Ideas', '#40C057', user_id, true, next_sequence + 2)
  ON CONFLICT (user_id, name) 
  WHERE is_system = true
  DO NOTHING;
END;
$$; 