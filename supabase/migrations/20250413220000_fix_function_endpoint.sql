-- Update the handle_new_user function with hardcoded local development values
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  root_folder_id uuid;
  functions_endpoint text := 'http://127.0.0.1:54321/functions/v1';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
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
          url := functions_endpoint || '/create-newuser-folder',
          body := json_build_object('uuid', NEW.id),
          headers := json_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || anon_key
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

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
