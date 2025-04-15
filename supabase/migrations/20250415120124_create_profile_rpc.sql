-- This migration adds a direct RPC function to create profiles
-- which can be called from the client-side code

-- Create a function that can be called directly from client code 
CREATE OR REPLACE FUNCTION public.ensure_profile_exists(
  user_id UUID,
  user_email TEXT,
  user_first_name TEXT DEFAULT 'User',
  user_last_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_exists BOOLEAN;
  username_val TEXT;
  result JSONB;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = user_id
  ) INTO profile_exists;
  
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
      'updated_at', updated_at,
      'status', 'existing'
    ) INTO result
    FROM public.profiles
    WHERE id = user_id;
    
    RETURN result;
  END IF;
  
  -- Generate a username
  username_val := regexp_replace(user_email, '@.*$', '') || '_' || substring(gen_random_uuid()::text, 1, 8);
  
  -- Create the profile
  INSERT INTO public.profiles (
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
    user_id,
    user_first_name,
    user_last_name,
    user_email,
    username_val,
    false,
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
    'created_at', created_at,
    'updated_at', updated_at,
    'status', 'created'
  ) INTO result;
  
  -- Create default folder
  BEGIN
    INSERT INTO public.folders (name, user_id, is_system, created_at, updated_at)
    VALUES ('Root', user_id, true, now(), now());
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore errors
  END;
  
  -- Create default category
  BEGIN
    INSERT INTO public.categories (name, color, user_id, is_system, sequence, created_at, updated_at)
    VALUES ('Default', '#6366F1', user_id, true, 1, now(), now());
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Ignore errors
  END;
  
  RETURN result;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.ensure_profile_exists IS 'Creates a user profile if it doesn''t exist';

-- Grant execute permission to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.ensure_profile_exists TO authenticated, anon;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Added ensure_profile_exists RPC function';
END $$; 