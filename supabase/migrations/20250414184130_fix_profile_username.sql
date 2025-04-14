-- Update the triggers to generate unique usernames

-- Update the primary handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  base_username TEXT;
  unique_username TEXT;
  counter INT := 0;
BEGIN
  -- Generate a base username from email
  base_username := regexp_replace(NEW.email, '@.*$', '');
  
  -- Start with base username
  unique_username := base_username;
  
  -- Check if the username exists
  WHILE EXISTS (
    SELECT 1 FROM public.profiles WHERE username = unique_username
  ) LOOP
    -- Add a number to make unique
    counter := counter + 1;
    unique_username := base_username || counter::text;
  END LOOP;
  
  -- Create the user profile with correct column names and unique username
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
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.raw_user_meta_data->>'name', ' ', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 
      CASE WHEN position(' ' in NEW.raw_user_meta_data->>'name') > 0 
        THEN substring(NEW.raw_user_meta_data->>'name' from position(' ' in NEW.raw_user_meta_data->>'name') + 1) 
        ELSE NULL 
      END),
    NEW.email,
    unique_username,
    NEW.raw_user_meta_data->>'avatar_url',
    false
  );

  -- Create default 'Root' folder
  INSERT INTO public.folders (name, user_id, is_system)
  VALUES ('Root', NEW.id, true);

  -- Create default category
  INSERT INTO public.categories (name, color, user_id, is_system, sequence)
  VALUES ('Default', '#6366F1', NEW.id, true, 1);
  
  -- Add user to newsletter_subscribers (default to subscribed)
  INSERT INTO public.newsletter_subscribers (email)
  VALUES (NEW.email)
  ON CONFLICT (email) 
  DO UPDATE SET subscribed_at = now(), unsubscribed_at = NULL;
  
  RETURN NEW;
END;
$function$;

-- Also update the fallback function
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_username TEXT;
  unique_username TEXT;
  counter INT := 0;
BEGIN
  -- Generate a base username from email
  base_username := regexp_replace(NEW.email, '@.*$', '');
  
  -- Start with base username
  unique_username := base_username;
  
  -- Check if the username exists
  WHILE EXISTS (
    SELECT 1 FROM public.profiles WHERE username = unique_username
  ) LOOP
    -- Add a number to make unique
    counter := counter + 1;
    unique_username := base_username || counter::text;
  END LOOP;
  
  -- Insert only if the profile doesn't exist
  INSERT INTO public.profiles(
    id, 
    first_name,
    last_name,
    email,
    username,
    is_initial_setup_completed
  )
  VALUES(
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(NEW.raw_user_meta_data->>'name', ' ', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 
      CASE WHEN position(' ' in NEW.raw_user_meta_data->>'name') > 0 
        THEN substring(NEW.raw_user_meta_data->>'name' from position(' ' in NEW.raw_user_meta_data->>'name') + 1) 
        ELSE NULL 
      END),
    NEW.email,
    unique_username,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Update the RPC function to handle username conflicts as well
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
  base_username TEXT;
  unique_username TEXT;
  counter INT := 0;
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
      -- Generate a unique username
      base_username := regexp_replace(user_email, '@.*$', '');
      unique_username := base_username;
      
      WHILE EXISTS (
        SELECT 1 FROM public.profiles WHERE username = unique_username
      ) LOOP
        counter := counter + 1;
        unique_username := base_username || counter::text;
      END LOOP;
    
      -- Manually create profile with the correct columns
      BEGIN
        -- Try to insert with first_name
        INSERT INTO profiles (id, first_name, email, username, created_at, updated_at)
        VALUES (profile_id, 
          (SELECT split_part(raw_user_meta_data->>'name', ' ', 1) FROM auth.users WHERE id = profile_id),
          user_email,
          unique_username,
          now(), now())
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
      -- Generate a unique username one more time
      base_username := regexp_replace(user_email, '@.*$', '');
      unique_username := base_username;
      counter := 0;
      
      WHILE EXISTS (
        SELECT 1 FROM public.profiles WHERE username = unique_username
      ) LOOP
        counter := counter + 1;
        unique_username := base_username || counter::text;
      END LOOP;
      
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
