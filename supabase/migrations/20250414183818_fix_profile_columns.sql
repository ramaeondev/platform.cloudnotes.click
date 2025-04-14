-- Check if 'name' column exists and 'first_name' column doesn't exist
DO $$
DECLARE
    name_exists BOOLEAN;
    first_name_exists BOOLEAN;
BEGIN
    -- Check if 'name' column exists
    SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'name'
    ) INTO name_exists;

    -- Check if 'first_name' column exists
    SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'first_name'
    ) INTO first_name_exists;

    -- If 'name' exists but 'first_name' doesn't, add 'first_name' and migrate data
    IF name_exists AND NOT first_name_exists THEN
        -- Add 'first_name' column
        ALTER TABLE public.profiles ADD COLUMN first_name TEXT;
        
        -- Copy data from 'name' to 'first_name'
        UPDATE public.profiles SET first_name = name;
        
        -- Drop 'name' column
        ALTER TABLE public.profiles DROP COLUMN name;
    END IF;

    -- If neither exist (safety check), add 'first_name'
    IF NOT name_exists AND NOT first_name_exists THEN
        ALTER TABLE public.profiles ADD COLUMN first_name TEXT;
    END IF;
END $$;

-- Update the handle_new_user function to ensure it uses the correct column
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  -- Log the action
  RAISE LOG 'Creating profile for user %', new.id;

  -- Create the user profile with correct column names
  INSERT INTO public.profiles (
    id, 
    first_name, 
    last_name,
    email, 
    username,
    avatar_url, 
    is_initial_setup_completed
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'first_name', split_part(new.raw_user_meta_data->>'name', ' ', 1)),
    COALESCE(new.raw_user_meta_data->>'last_name', 
      CASE WHEN position(' ' in new.raw_user_meta_data->>'name') > 0 
        THEN substring(new.raw_user_meta_data->>'name' from position(' ' in new.raw_user_meta_data->>'name') + 1) 
        ELSE NULL 
      END),
    new.email,
    regexp_replace(new.email, '@.*$', ''),
    new.raw_user_meta_data->>'avatar_url',
    false
  );

  -- Create default 'Root' folder
  INSERT INTO public.folders (name, user_id, is_system)
  VALUES ('Root', new.id, true);

  -- Create default category
  INSERT INTO public.categories (name, color, user_id, is_system, sequence)
  VALUES ('Default', '#6366F1', new.id, true, 1);
  
  -- Add user to newsletter_subscribers (default to subscribed)
  INSERT INTO public.newsletter_subscribers (email)
  VALUES (new.email)
  ON CONFLICT (email) 
  DO UPDATE SET subscribed_at = now(), unsubscribed_at = NULL;
  
  RETURN new;
END;
$function$;

-- Add the trigger back
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 

-- Create or update the profile RPC function to ensure it handles both formats
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
      -- Manually create profile with the correct columns
      BEGIN
        -- Try to insert with first_name
        INSERT INTO profiles (id, first_name, email, created_at, updated_at)
        VALUES (profile_id, 
          (SELECT split_part(raw_user_meta_data->>'name', ' ', 1) FROM auth.users WHERE id = profile_id), 
          user_email, now(), now())
        ON CONFLICT (id) DO NOTHING;
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error creating profile: %', SQLERRM;
      END;
      
      -- Create default folders and categories
      BEGIN
        INSERT INTO folders (name, user_id, is_system)
        VALUES ('Root', profile_id, true);
        
        INSERT INTO categories (name, color, user_id, is_system, sequence)
        VALUES ('Default', '#6366F1', profile_id, true, 1);
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error creating defaults: %', SQLERRM;
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
  
  -- If profile still doesn't exist, create a minimal profile as a fallback
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
