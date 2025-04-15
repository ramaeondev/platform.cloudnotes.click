-- This migration fixes the profile creation trigger
-- to ensure it runs reliably on signup

-- Drop existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create a more robust handle_new_user function with extensive logging
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  username_val TEXT;
  profile_exists BOOLEAN;
BEGIN
  -- Start with detailed logging
  RAISE LOG 'handle_new_user: Triggered for user ID: %, email: %', new.id, new.email;
  
  -- Check if profile already exists to prevent duplicates
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = new.id
  ) INTO profile_exists;
  
  IF profile_exists THEN
    RAISE LOG 'handle_new_user: Profile already exists for user ID: %', new.id;
    RETURN new;
  END IF;
  
  -- Generate a unique username
  username_val := regexp_replace(new.email, '@.*$', '') || '_' || substring(gen_random_uuid()::text, 1, 8);
  
  -- Create the profile with extensive error handling
  BEGIN
    -- Insert with complete values to avoid null issues
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
    
    RAISE LOG 'handle_new_user: Created profile for user ID: %', new.id;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but continue with other operations
    RAISE LOG 'handle_new_user: ERROR creating profile: %, SQLSTATE: %', SQLERRM, SQLSTATE;
  END;
  
  -- Create default folder with error handling
  BEGIN
    INSERT INTO public.folders (name, user_id, is_system, created_at, updated_at)
    VALUES ('Root', new.id, true, now(), now())
    ON CONFLICT DO NOTHING;
    
    RAISE LOG 'handle_new_user: Created default Root folder for user ID: %', new.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: ERROR creating folder: %, SQLSTATE: %', SQLERRM, SQLSTATE;
  END;
  
  -- Create default category with error handling
  BEGIN
    INSERT INTO public.categories (name, color, user_id, is_system, sequence, created_at, updated_at)
    VALUES ('Default', '#6366F1', new.id, true, 1, now(), now())
    ON CONFLICT DO NOTHING;
    
    RAISE LOG 'handle_new_user: Created default category for user ID: %', new.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: ERROR creating category: %, SQLSTATE: %', SQLERRM, SQLSTATE;
  END;
  
  -- Subscribe to newsletter with error handling
  BEGIN
    INSERT INTO public.newsletter_subscribers (email, subscribed_at)
    VALUES (new.email, now())
    ON CONFLICT (email) DO UPDATE SET 
      subscribed_at = now(), 
      unsubscribed_at = NULL;
    
    RAISE LOG 'handle_new_user: Added to newsletter: %', new.email;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: ERROR adding to newsletter: %, SQLSTATE: %', SQLERRM, SQLSTATE;
  END;
  
  RETURN new;
END;
$$;

-- Create the trigger with explicit timing and event
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Add a notification about the fix 
DO $$
BEGIN
  RAISE NOTICE 'Profile creation trigger updated with better error handling and logging';
END $$; 