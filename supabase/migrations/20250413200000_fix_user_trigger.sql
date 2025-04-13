-- Drop any existing triggers on auth.users
DROP TRIGGER IF EXISTS after_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_folder ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Make sure the handle_new_user function exists and works correctly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  response_status integer;
  response_body text;
  root_folder_id uuid;
BEGIN
  -- Log user creation
  RAISE NOTICE 'New user created with ID: %', new.id;

  -- Call the edge function to create a folder in S3 first
  BEGIN
    RAISE NOTICE 'Calling edge function for user ID: %', new.id;
    
    SELECT 
      status,
      content::text
    INTO 
      response_status,
      response_body
    FROM
      net.http_post(
        url := 'https://' || current_setting('supabase_functions_endpoint') || '/create-newuser-folder',
        body := json_build_object('uuid', new.id),
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer " || current_setting("supabase.anon_key") || ""}'
      );

    -- Log the response
    RAISE NOTICE 'Edge function response - Status: %, Body: %', response_status, response_body;

    -- Log success or failure, but continue with DB creation
    IF response_status = 201 OR response_status = 200 THEN
      RAISE NOTICE 'Successfully created S3 folder for user %', new.id;
    ELSE
      RAISE WARNING 'Failed to create S3 folder for user % with status %', new.id, response_status;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Exception when calling edge function: %', SQLERRM;
  END;
    
  -- Create the user profile
  BEGIN
    RAISE NOTICE 'Creating profile for user ID: %', new.id;
    
    INSERT INTO public.profiles (id, name)
    VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', new.email));
    
    RAISE NOTICE 'Profile created for user ID: %', new.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create profile for user %: %', new.id, SQLERRM;
  END;

  -- Create a default 'Root' folder for the user that cannot be deleted
  BEGIN
    RAISE NOTICE 'Creating root folder for user ID: %', new.id;
    
    INSERT INTO public.folders (name, user_id, is_system)
    VALUES ('Root', new.id, true)
    RETURNING id INTO root_folder_id;
    
    RAISE NOTICE 'Root folder created for user ID: % with folder ID: %', new.id, root_folder_id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create root folder for user %: %', new.id, SQLERRM;
  END;

  -- Create a default category with white color that cannot be deleted
  BEGIN
    RAISE NOTICE 'Creating default category for user ID: %', new.id;
    
    INSERT INTO public.categories (name, color, user_id, is_system, sequence)
    VALUES ('Default', '#FFFFFF', new.id, true, 1);
    
    RAISE NOTICE 'Default category created for user ID: %', new.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create default category for user %: %', new.id, SQLERRM;
  END;

  -- Add user to newsletter subscribers if they don't already exist
  BEGIN
    RAISE NOTICE 'Adding user to newsletter subscribers: %', new.email;
    
    INSERT INTO public.newsletter_subscribers (email)
    VALUES (new.email)
    ON CONFLICT (email) 
    DO UPDATE SET subscribed_at = now(), unsubscribed_at = NULL;
    
    RAISE NOTICE 'User added to newsletter subscribers: %', new.email;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to add user to newsletter: %', SQLERRM;
  END;

  RETURN new;
END;
$$;

-- Create a fresh trigger on auth.users to execute the function
CREATE TRIGGER on_auth_user_created 
AFTER INSERT ON auth.users 
FOR EACH ROW 
EXECUTE FUNCTION public.handle_new_user(); 