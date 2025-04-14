-- Update an existing profile with missing email
DO $$
DECLARE
    profile_record RECORD;
BEGIN
    FOR profile_record IN
        SELECT p.id
        FROM profiles p
        WHERE p.email IS NULL
    LOOP
        UPDATE profiles
        SET email = (
            SELECT email
            FROM auth.users
            WHERE id = profile_record.id
        )
        WHERE id = profile_record.id;
    END LOOP;
END $$;

-- Update the get_profile_with_newsletter_status function to ensure it copies email correctly
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
  unique_username TEXT;
BEGIN
  -- Get user email from auth.users
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = profile_id;

  -- Check if profile exists
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = profile_id
  ) INTO profile_exists;
  
  -- If profile doesn't exist, check if we need to create it
  IF NOT profile_exists THEN
    IF user_email IS NOT NULL THEN
      -- Generate a unique username with UUID
      unique_username := regexp_replace(user_email, '@.*$', '') || '_' || substring(gen_random_uuid()::text, 1, 8);
    
      -- Manually create profile with the correct columns
      BEGIN
        -- Try to insert with first_name
        INSERT INTO profiles (
          id, 
          first_name, 
          last_name,
          email, 
          username, 
          created_at, 
          updated_at
        )
        VALUES (
          profile_id, 
          COALESCE(
            (SELECT split_part(raw_user_meta_data->>'name', ' ', 1) FROM auth.users WHERE id = profile_id),
            'User'
          ),
          COALESCE(
            (SELECT 
              CASE WHEN position(' ' in raw_user_meta_data->>'name') > 0 
                THEN substring(raw_user_meta_data->>'name' from position(' ' in raw_user_meta_data->>'name') + 1) 
                ELSE NULL 
              END
            FROM auth.users WHERE id = profile_id),
            NULL
          ),
          user_email,
          unique_username,
          now(), 
          now()
        )
        ON CONFLICT (id) DO 
        UPDATE SET 
          email = EXCLUDED.email,
          updated_at = now();
          
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error creating profile: %', SQLERRM;
      END;
      
      -- Create default folders and categories
      BEGIN
        INSERT INTO folders (name, user_id, is_system)
        VALUES ('Root', profile_id, true)
        ON CONFLICT (user_id, name) 
        WHERE is_system = true
        DO NOTHING;
        
        INSERT INTO categories (name, color, user_id, is_system, sequence)
        VALUES ('Default', '#6366F1', profile_id, true, 1)
        ON CONFLICT (user_id, name)
        WHERE is_system = true
        DO NOTHING;
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error creating defaults: %', SQLERRM;
      END;
    END IF;
  ELSE
    -- Update the profile email if it's NULL but we have a user email
    IF user_email IS NOT NULL THEN
      UPDATE profiles
      SET email = user_email,
          updated_at = now()
      WHERE id = profile_id
      AND (email IS NULL OR email <> user_email);
    END IF;
  END IF;
  
  -- Get the profile data
  SELECT jsonb_build_object(
    'id', p.id,
    'first_name', p.first_name,
    'last_name', p.last_name,
    'username', p.username,
    'email', COALESCE(p.email, user_email),
    'avatar_url', p.avatar_url,
    'is_initial_setup_completed', p.is_initial_setup_completed,
    'updated_at', p.updated_at,
    'created_at', p.created_at
  )
  INTO profile_data
  FROM profiles p
  WHERE p.id = profile_id;
  
  -- If profile still doesn't exist, create a minimal profile as a fallback
  IF profile_data IS NULL AND user_email IS NOT NULL THEN
    -- Generate a unique username with UUID
    unique_username := regexp_replace(user_email, '@.*$', '') || '_' || substring(gen_random_uuid()::text, 1, 8);
    
    -- Insert a minimal profile
    INSERT INTO profiles (id, email, username, created_at, updated_at)
    VALUES (profile_id, user_email, unique_username, now(), now())
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
  END IF;
  
  -- Get the newsletter subscription status
  SELECT 
    CASE 
      WHEN ns.subscribed_at IS NOT NULL AND ns.unsubscribed_at IS NULL THEN TRUE
      ELSE FALSE
    END INTO newsletter_status
  FROM profiles p
  LEFT JOIN newsletter_subscribers ns ON COALESCE(p.email, user_email) = ns.email
  WHERE p.id = profile_id;
  
  -- Add newsletter status to profile data
  profile_data = profile_data || jsonb_build_object('newsletter_subscribed', COALESCE(newsletter_status, FALSE));
  
  RETURN profile_data;
END;
$$;
