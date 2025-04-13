-- Direct drop and recreate of the trigger - forcing it to be active
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Check categories table structure and ensure sequence column is properly configured
DO $$
BEGIN
  -- Add sequence column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'categories' AND column_name = 'sequence'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN sequence integer DEFAULT 999;
    
    -- Update existing records
    UPDATE public.categories SET sequence = 999 WHERE sequence IS NULL;
    
    -- Make it not null
    ALTER TABLE public.categories ALTER COLUMN sequence SET NOT NULL;
  END IF;
END $$;

-- Simplified handle_new_user function with better logging and error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  root_folder_id uuid;
BEGIN
  RAISE LOG 'Creating resources for new user: %', NEW.id;
  
  -- Create the user profile
  BEGIN
    INSERT INTO public.profiles (id, name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email));
    RAISE LOG 'Created profile for user %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
  END;
  
  -- Create a default 'Root' folder
  BEGIN
    INSERT INTO public.folders (name, user_id, is_system)
    VALUES ('Root', NEW.id, true)
    RETURNING id INTO root_folder_id;
    RAISE LOG 'Created Root folder for user % with ID: %', NEW.id, root_folder_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create Root folder for user %: %', NEW.id, SQLERRM;
  END;
  
  -- Create a default category
  BEGIN
    INSERT INTO public.categories (name, color, user_id, is_system, sequence)
    VALUES ('Default', '#FFFFFF', NEW.id, true, 1);
    RAISE LOG 'Created Default category for user %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create Default category for user %: %', NEW.id, SQLERRM;
  END;
  
  -- Add to newsletter subscribers
  BEGIN
    INSERT INTO public.newsletter_subscribers (email)
    VALUES (NEW.email)
    ON CONFLICT (email) 
    DO UPDATE SET subscribed_at = now(), unsubscribed_at = NULL;
    RAISE LOG 'Added user to newsletter subscribers: %', NEW.email;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to add user to newsletter: %', SQLERRM;
  END;
  
  -- Call the edge function to create S3 folder
  BEGIN
    DECLARE
      response_status integer;
      response_body text;
    BEGIN
      SELECT 
        status,
        content::text
      INTO 
        response_status,
        response_body
      FROM
        net.http_post(
          url := 'https://' || current_setting('supabase_functions_endpoint') || '/create-newuser-folder',
          body := json_build_object('uuid', NEW.id),
          headers := json_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('supabase.anon_key')
          )
        );
      
      RAISE LOG 'Edge function response for user %: Status: %, Body: %', NEW.id, response_status, response_body;
      
      IF response_status = 201 OR response_status = 200 THEN
        RAISE LOG 'Successfully created S3 folder for user %', NEW.id;
      ELSE
        RAISE WARNING 'Edge function returned status % for user %', response_status, NEW.id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to call edge function for user %: %', NEW.id, SQLERRM;
    END;
  END;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger with SECURITY DEFINER
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role; 