-- =====================================
-- CONSOLIDATED PROFILE TRIGGER MIGRATION
-- =====================================
-- This migration file consolidates all profile-related triggers and functions
-- to ensure consistent profile creation and fixes issues with the signup flow.

-- =====================================
-- 1. REMOVE ALL EXISTING TRIGGERS AND FUNCTIONS
-- =====================================

-- Drop existing triggers on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS after_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_folder ON auth.users;
DROP TRIGGER IF EXISTS ensure_user_profile_exists ON auth.users;

-- Find and drop any triggers that depend on ensure_profile_exists function
DO $$
DECLARE
  trigger_rec RECORD;
BEGIN
  FOR trigger_rec IN
    SELECT tgname, tgrelid::regclass AS table_name
    FROM pg_trigger
    WHERE tgfoid = (SELECT oid FROM pg_proc WHERE proname = 'ensure_profile_exists')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %s', 
                   trigger_rec.tgname, 
                   trigger_rec.table_name);
    RAISE NOTICE 'Dropped trigger % on table %', 
                 trigger_rec.tgname, 
                 trigger_rec.table_name;
  END LOOP;
END $$;

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.ensure_profile_exists();

-- =====================================
-- 2. CREATE COMPREHENSIVE HANDLE_NEW_USER FUNCTION
-- =====================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  response_status INTEGER;
  response_body TEXT;
  username_val TEXT;
  profile_exists BOOLEAN;
BEGIN
  -- Start with detailed logging
  RAISE LOG 'handle_new_user: Creating profile for user ID: %, email: %, metadata: %', 
    new.id, 
    new.email, 
    new.raw_user_meta_data;
    
  -- Check if profile already exists (prevents duplicates)
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = new.id
  ) INTO profile_exists;
  
  IF profile_exists THEN
    RAISE LOG 'handle_new_user: Profile already exists for user ID: %', new.id;
    RETURN new;
  END IF;
  
  -- Generate a unique username with UUID for uniqueness
  username_val := regexp_replace(new.email, '@.*$', '') || '_' || substring(gen_random_uuid()::text, 1, 8);
  
  -- Create the user profile with comprehensive error handling
  BEGIN
    -- Create the user profile with correct column names
    INSERT INTO public.profiles (
      id, 
      first_name, 
      last_name,
      email, 
      username,
      avatar_url, 
      is_initial_setup_completed,
      created_at,
      updated_at
    )
    VALUES (
      new.id,
      COALESCE(
        new.raw_user_meta_data->>'first_name', 
        split_part(COALESCE(new.raw_user_meta_data->>'name', ''), ' ', 1),
        'User'
      ),
      COALESCE(
        new.raw_user_meta_data->>'last_name', 
        CASE WHEN position(' ' in COALESCE(new.raw_user_meta_data->>'name', '')) > 0 
          THEN substring(new.raw_user_meta_data->>'name' from position(' ' in new.raw_user_meta_data->>'name') + 1) 
          ELSE NULL 
        END
      ),
      new.email,
      username_val,
      new.raw_user_meta_data->>'avatar_url',
      false,
      now(),
      now()
    );
    
    RAISE LOG 'handle_new_user: Successfully created profile for user ID: %', new.id;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but continue with other operations
    RAISE LOG 'handle_new_user: Error creating profile for user ID: %, error: %', new.id, SQLERRM;
  END;

  -- Create default 'Root' folder with error handling
  BEGIN
    INSERT INTO public.folders (name, user_id, is_system, created_at, updated_at)
    VALUES ('Root', new.id, true, now(), now());
    
    RAISE LOG 'handle_new_user: Created default Root folder for user ID: %', new.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: Error creating Root folder for user ID: %, error: %', new.id, SQLERRM;
  END;

  -- Create default category with error handling
  BEGIN
    INSERT INTO public.categories (name, color, user_id, is_system, sequence, created_at, updated_at)
    VALUES ('Default', '#6366F1', new.id, true, 1, now(), now());
    
    RAISE LOG 'handle_new_user: Created default category for user ID: %', new.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: Error creating default category for user ID: %, error: %', new.id, SQLERRM;
  END;
  
  -- Add user to newsletter_subscribers with error handling
  BEGIN
    INSERT INTO public.newsletter_subscribers (email, subscribed_at)
    VALUES (new.email, now())
    ON CONFLICT (email) 
    DO UPDATE SET subscribed_at = now(), unsubscribed_at = NULL;
    
    RAISE LOG 'handle_new_user: Added user to newsletter_subscribers for email: %', new.email;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: Error adding user to newsletter_subscribers for email: %, error: %', new.email, SQLERRM;
  END;

  -- Return the new record
  RETURN new;
END;
$$;

-- =====================================
-- 3. CREATE BACKUP FUNCTION TO ENSURE PROFILE EXISTS
-- =====================================

CREATE OR REPLACE FUNCTION public.get_profile_with_newsletter_status(profile_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  profile_data JSONB;
  newsletter_status BOOLEAN;
  user_email TEXT;
  profile_exists BOOLEAN;
  unique_username TEXT;
  user_metadata JSONB;
BEGIN
  RAISE LOG 'get_profile_with_newsletter_status: Checking profile for user ID: %', profile_id;

  -- Check if profile exists
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = profile_id
  ) INTO profile_exists;
  
  -- Get user info regardless
  SELECT email, raw_user_meta_data::jsonb 
  INTO user_email, user_metadata
  FROM auth.users
  WHERE id = profile_id;
  
  RAISE LOG 'get_profile_with_newsletter_status: Profile exists: %, user email: %, metadata: %', 
    profile_exists, user_email, user_metadata;
  
  -- If profile doesn't exist, create it
  IF NOT profile_exists AND user_email IS NOT NULL THEN
    RAISE LOG 'get_profile_with_newsletter_status: Creating missing profile for user ID: %', profile_id;
    
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
        is_initial_setup_completed,
        created_at, 
        updated_at
      )
      VALUES (
        profile_id,
        COALESCE(
          user_metadata->>'first_name', 
          split_part(COALESCE(user_metadata->>'name', ''), ' ', 1),
          'User'
        ),
        COALESCE(
          user_metadata->>'last_name', 
          CASE WHEN position(' ' in COALESCE(user_metadata->>'name', '')) > 0 
            THEN substring(user_metadata->>'name' from position(' ' in user_metadata->>'name') + 1) 
            ELSE NULL 
          END
        ),
        user_email,
        unique_username,
        false,
        now(), 
        now()
      );
      
      RAISE LOG 'get_profile_with_newsletter_status: Created profile for user ID: %', profile_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'get_profile_with_newsletter_status: Error creating profile: %', SQLERRM;
    END;
    
    -- Create default folders and categories
    BEGIN
      INSERT INTO folders (name, user_id, is_system, created_at, updated_at)
      VALUES ('Root', profile_id, true, now(), now())
      ON CONFLICT (user_id, name) 
      WHERE is_system = true
      DO NOTHING;
      
      INSERT INTO categories (name, color, user_id, is_system, sequence, created_at, updated_at)
      VALUES ('Default', '#6366F1', profile_id, true, 1, now(), now())
      ON CONFLICT (user_id, name)
      WHERE is_system = true
      DO NOTHING;
      
      RAISE LOG 'get_profile_with_newsletter_status: Created default folders and categories for user ID: %', profile_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'get_profile_with_newsletter_status: Error creating defaults: %', SQLERRM;
    END;
  END IF;
  
  -- Get the profile data (this should now exist)
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
  
  -- If profile STILL doesn't exist after our attempt to create it, create a minimal fallback profile
  IF profile_data IS NULL AND user_email IS NOT NULL THEN
    RAISE LOG 'get_profile_with_newsletter_status: Creating fallback minimal profile for user ID: %', profile_id;
    
    -- Generate a unique username with UUID
    unique_username := regexp_replace(user_email, '@.*$', '') || '_' || substring(gen_random_uuid()::text, 1, 8);
    
    -- Insert a minimal profile with all required fields
    INSERT INTO profiles (
      id, 
      first_name,
      email, 
      username, 
      created_at, 
      updated_at
    )
    VALUES (
      profile_id, 
      'User',
      user_email, 
      unique_username, 
      now(), 
      now()
    )
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
    
    RAISE LOG 'get_profile_with_newsletter_status: Created fallback profile for user ID: %', profile_id;
  END IF;
  
  -- If we still have no profile, log the error and return null
  IF profile_data IS NULL THEN
    RAISE LOG 'get_profile_with_newsletter_status: CRITICAL - Unable to create profile for user ID: %', profile_id;
    RETURN NULL;
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

-- =====================================
-- 4. CREATE NEW DIAGNOSTICS FUNCTION
-- =====================================

CREATE OR REPLACE FUNCTION public.diagnose_user_profile(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSONB;
  user_exists BOOLEAN;
  profile_exists BOOLEAN;
  user_data JSONB;
  profile_data JSONB;
  folders_count INTEGER;
  categories_count INTEGER;
BEGIN
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = user_id) INTO user_exists;
  
  -- Check if profile exists
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = user_id) INTO profile_exists;
  
  -- Get user data
  IF user_exists THEN
    SELECT jsonb_build_object(
      'id', id,
      'email', email,
      'created_at', created_at,
      'last_sign_in_at', last_sign_in_at,
      'confirmed_at', confirmed_at,
      'user_metadata', raw_user_meta_data,
      'app_metadata', raw_app_meta_data
    ) INTO user_data
    FROM auth.users
    WHERE id = user_id;
  END IF;
  
  -- Get profile data
  IF profile_exists THEN
    SELECT jsonb_build_object(
      'id', id,
      'first_name', first_name,
      'last_name', last_name,
      'username', username,
      'email', email,
      'avatar_url', avatar_url,
      'is_initial_setup_completed', is_initial_setup_completed,
      'created_at', created_at,
      'updated_at', updated_at
    ) INTO profile_data
    FROM profiles
    WHERE id = user_id;
  END IF;
  
  -- Count folders and categories
  SELECT COUNT(*) INTO folders_count FROM folders WHERE user_id = user_id;
  SELECT COUNT(*) INTO categories_count FROM categories WHERE user_id = user_id;
  
  -- Build result object
  result := jsonb_build_object(
    'user_exists', user_exists,
    'profile_exists', profile_exists,
    'folders_count', folders_count,
    'categories_count', categories_count,
    'user_data', user_data,
    'profile_data', profile_data,
    'diagnosis_time', now()
  );
  
  RETURN result;
END;
$$;

-- =====================================
-- 5. CREATE THE TRIGGER
-- =====================================

-- Create a single trigger to handle new users
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- =====================================
-- 6. LOG THE MIGRATION COMPLETION
-- =====================================

DO $$
BEGIN
  RAISE LOG 'Migration complete: Consolidated all profile triggers and functions successfully';
END $$; 