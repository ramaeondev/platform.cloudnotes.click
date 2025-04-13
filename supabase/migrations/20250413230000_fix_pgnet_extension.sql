-- Enable the pg_net extension
CREATE EXTENSION IF NOT EXISTS "pg_net" SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA extensions TO postgres, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, authenticated, service_role;

-- Update the handle_new_user function to use pg_net
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  root_folder_id uuid;
  functions_endpoint text := 'http://127.0.0.1:54321/functions/v1';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9lZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
  request_id text;
BEGIN
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
  
  -- Call the edge function to create S3 folder with detailed error logging
  BEGIN
    RAISE LOG 'Attempting to call edge function for user % at endpoint %', NEW.id, functions_endpoint;
    
    SELECT http_request_id INTO request_id FROM extensions.http_post(
      url := functions_endpoint || '/create-newuser-folder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || anon_key
      ),
      body := jsonb_build_object('uuid', NEW.id)
    );
    
    RAISE LOG 'Edge function request initiated for user % with request_id: %', NEW.id, request_id;
    
    -- Wait for the response (up to 5 seconds)
    PERFORM pg_sleep(1);
    
    -- Check the request status
    DECLARE
      request_status record;
    BEGIN
      SELECT * INTO request_status FROM extensions.http_get_status(request_id);
      
      IF request_status.completed_at IS NOT NULL THEN
        IF request_status.status_code BETWEEN 200 AND 299 THEN
          RAISE LOG 'Successfully created S3 folder for user %. Status code: %', NEW.id, request_status.status_code;
        ELSE
          RAISE WARNING 'Edge function returned error status % for user %. Response: %', 
            request_status.status_code, NEW.id, request_status.response_body;
        END IF;
      ELSE
        RAISE WARNING 'Edge function request timed out for user %', NEW.id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to check edge function status for user %: %', NEW.id, SQLERRM;
    END;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to call edge function for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
    -- Log the full error context
    RAISE LOG 'Error Context: %', to_json(json_build_object(
      'user_id', NEW.id,
      'endpoint', functions_endpoint,
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    ));
  END;
  
  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
