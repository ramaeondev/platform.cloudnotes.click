-- This migration creates a direct trigger on auth.users with stronger permissions

-- Drop any existing triggers to start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;

-- Make sure the profiles table allows inserts from this function
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow function to create profiles
DROP POLICY IF EXISTS "Allow trigger function to create profiles" ON public.profiles;
CREATE POLICY "Allow trigger function to create profiles" 
ON public.profiles 
FOR INSERT 
TO postgres, authenticated, anon
WITH CHECK (true);

-- Simple direct trigger function with no fancy features
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Run with definer permissions
SET search_path = public
AS $$
BEGIN
  -- Log the attempt
  RAISE NOTICE 'Creating profile for user: %, email: %', NEW.id, NEW.email;
  
  -- Just do a simple, direct insert
  INSERT INTO public.profiles (
    id,
    first_name,
    email,
    username,
    is_initial_setup_completed
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    NEW.email,
    split_part(NEW.email, '@', 1) || '_' || substring(gen_random_uuid()::text, 1, 4),
    false
  );
  
  -- Also create a default folder
  INSERT INTO public.folders (
    name, 
    user_id, 
    is_system
  ) VALUES (
    'Root', 
    NEW.id, 
    true
  );
  
  -- Create a default category
  INSERT INTO public.categories (
    name, 
    color, 
    user_id, 
    is_system, 
    sequence
  ) VALUES (
    'Default', 
    '#6366F1', 
    NEW.id, 
    true, 
    1
  );
  
  RAISE NOTICE 'Profile created successfully for user: %', NEW.id;
  
  RETURN NEW;
END;
$$;

-- Create a direct trigger with a different name
CREATE TRIGGER handle_new_user_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_profile_for_new_user();

-- Also add a direct connection
ALTER TABLE auth.users ENABLE TRIGGER handle_new_user_trigger;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, authenticated, anon;
GRANT ALL ON TABLE public.profiles TO postgres, authenticated, anon;
GRANT ALL ON TABLE public.folders TO postgres, authenticated, anon;
GRANT ALL ON TABLE public.categories TO postgres, authenticated, anon;

-- Add a comment explaining what was done
COMMENT ON FUNCTION public.create_profile_for_new_user() IS 'Creates a profile and default objects whenever a new user is created'; 