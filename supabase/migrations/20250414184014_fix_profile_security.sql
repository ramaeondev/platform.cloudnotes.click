-- Fix RLS policies for profiles table to ensure proper insertion

-- Allow the insert policy for system and trigger operations (usually via handle_new_user trigger)
CREATE POLICY "System can insert profiles" ON "public"."profiles" 
FOR INSERT WITH CHECK (TRUE);

-- Ensure the proper RLS policies exist for user operations
DROP POLICY IF EXISTS "Users can insert their own profile" ON "public"."profiles";
CREATE POLICY "Users can insert their own profile" ON "public"."profiles" 
FOR INSERT WITH CHECK (auth.uid() = id);

-- Confirm proper update policies exist
DROP POLICY IF EXISTS "Users can update their own profile" ON "public"."profiles";
CREATE POLICY "Users can update their own profile" ON "public"."profiles" 
FOR UPDATE USING (auth.uid() = id);

-- Ensure proper select policies exist
DROP POLICY IF EXISTS "Users can view their own profile" ON "public"."profiles";
CREATE POLICY "Users can view their own profile" ON "public"."profiles" 
FOR SELECT USING (auth.uid() = id);

-- Create a backup function that handles profile creation during signup
CREATE OR REPLACE FUNCTION public.ensure_profile_exists()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
    regexp_replace(NEW.email, '@.*$', ''),
    false
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create a new trigger that runs after the main handle_new_user trigger as a fallback
DROP TRIGGER IF EXISTS ensure_profile_exists_trigger ON auth.users;
CREATE TRIGGER ensure_profile_exists_trigger
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.ensure_profile_exists();

-- Check for any orphaned auth users (with no profiles) and create profiles for them
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN
    SELECT au.id, au.email, au.raw_user_meta_data
    FROM auth.users au
    LEFT JOIN public.profiles p ON p.id = au.id
    WHERE p.id IS NULL
  LOOP
    INSERT INTO public.profiles(
      id, 
      first_name,
      last_name,
      email,
      username,
      is_initial_setup_completed
    )
    VALUES(
      user_record.id,
      COALESCE(user_record.raw_user_meta_data->>'first_name', 
               split_part(user_record.raw_user_meta_data->>'name', ' ', 1)),
      COALESCE(user_record.raw_user_meta_data->>'last_name', 
        CASE WHEN position(' ' in user_record.raw_user_meta_data->>'name') > 0 
          THEN substring(user_record.raw_user_meta_data->>'name' from position(' ' in user_record.raw_user_meta_data->>'name') + 1) 
          ELSE NULL 
        END),
      user_record.email,
      regexp_replace(user_record.email, '@.*$', ''),
      false
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END;
$$;

-- Finally, ensure any users with missing folders or categories get defaults created
DO $$
DECLARE
  profile_record RECORD;
BEGIN
  FOR profile_record IN
    SELECT p.id
    FROM public.profiles p
    LEFT JOIN public.folders f ON f.user_id = p.id
    WHERE f.id IS NULL
  LOOP
    -- Create default Root folder
    INSERT INTO public.folders (name, user_id, is_system)
    VALUES ('Root', profile_record.id, true);
    
    -- Create default category
    INSERT INTO public.categories (name, color, user_id, is_system, sequence)
    VALUES ('Default', '#6366F1', profile_record.id, true, 1);
  END LOOP;
END;
$$;
