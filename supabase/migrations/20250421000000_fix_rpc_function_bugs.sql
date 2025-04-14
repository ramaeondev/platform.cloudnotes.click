-- Fix bugs in RPC functions

-- Fix get_profile_with_newsletter_status to be more robust
CREATE OR REPLACE FUNCTION public.get_profile_with_newsletter_status(profile_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_data JSONB;
  newsletter_status BOOLEAN := FALSE;
  user_email TEXT;
  profile_exists BOOLEAN;
BEGIN
  -- Add error handling
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
        -- Manually create profile in a single transaction
        BEGIN
          INSERT INTO profiles (id, email, created_at, updated_at)
          VALUES (profile_id, user_email, now(), now())
          ON CONFLICT (id) DO NOTHING;
          
          -- Create default folders and categories using corrected queries
          INSERT INTO folders (name, user_id, is_system, parent_id)
          VALUES ('My Folder', profile_id, true, null)
          ON CONFLICT (user_id, name) 
          WHERE parent_id IS NULL AND is_system = true
          DO NOTHING;
          
          -- For categories - fix the sequence issue
          INSERT INTO categories (name, color, user_id, is_system, sequence)
          VALUES 
            ('Personal', '#228BE6', profile_id, true, (SELECT COALESCE(MAX(sequence), 0) + 1 FROM categories WHERE user_id = profile_id)),
            ('Work', '#FA5252', profile_id, true, (SELECT COALESCE(MAX(sequence), 0) + 2 FROM categories WHERE user_id = profile_id)),
            ('Ideas', '#40C057', profile_id, true, (SELECT COALESCE(MAX(sequence), 0) + 3 FROM categories WHERE user_id = profile_id))
          ON CONFLICT (user_id, name) 
          WHERE is_system = true
          DO NOTHING;
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'Error creating defaults: %', SQLERRM;
        END;
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
    
    -- If profile still doesn't exist after attempt to create it, handle the case
    IF profile_data IS NULL THEN
      -- Return a minimal profile to avoid error
      profile_data := jsonb_build_object(
        'id', profile_id,
        'email', user_email,
        'first_name', NULL::text,
        'last_name', NULL::text,
        'username', NULL::text,
        'avatar_url', NULL::text,
        'is_initial_setup_completed', false,
        'updated_at', now(),
        'created_at', now()
      );
    END IF;
    
    -- Get the newsletter subscription status safely
    BEGIN
      SELECT 
        CASE 
          WHEN ns.subscribed_at IS NOT NULL AND ns.unsubscribed_at IS NULL THEN TRUE
          ELSE FALSE
        END INTO newsletter_status
      FROM profiles p
      LEFT JOIN newsletter_subscribers ns ON p.email = ns.email
      WHERE p.id = profile_id;
      
      -- If null, set to false
      IF newsletter_status IS NULL THEN
        newsletter_status := FALSE;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Default to not subscribed on error
      newsletter_status := FALSE;
    END;
    
    profile_data := profile_data || jsonb_build_object('newsletter_subscribed', newsletter_status);
    
    RETURN profile_data;
  EXCEPTION WHEN OTHERS THEN
    -- If any error occurs, return a minimal valid response
    RETURN jsonb_build_object(
      'id', profile_id,
      'email', user_email,
      'first_name', NULL::text,
      'last_name', NULL::text,
      'username', NULL::text,
      'avatar_url', NULL::text,
      'is_initial_setup_completed', false,
      'updated_at', now(),
      'created_at', now(),
      'newsletter_subscribed', false,
      'error', SQLERRM
    );
  END;
END;
$$; 