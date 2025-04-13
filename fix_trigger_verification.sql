-- Run this query in the Supabase dashboard SQL editor to verify trigger status

-- Check if the trigger exists and is connected to the handle_new_user function
SELECT 
  tgname AS trigger_name,
  pg_get_triggerdef(oid) AS trigger_definition,
  proname AS function_name
FROM pg_trigger
JOIN pg_proc ON pg_proc.oid = pg_trigger.tgfoid
WHERE tgname = 'on_auth_user_created';

-- Check current logging settings
SHOW log_min_messages;
SHOW log_statement;

-- Increase logging for debugging
ALTER SYSTEM SET log_min_messages = 'DEBUG';
ALTER SYSTEM SET log_statement = 'all';
SELECT pg_reload_conf();

-- Modify the handle_new_user function to add more detailed logging
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
  -- Log the start of the function
  RAISE LOG 'Starting handle_new_user for user %', new.id;
  
  -- Call the edge function to create a folder in S3 first
  BEGIN
    RAISE LOG 'Calling edge function to create folder for user %', new.id;
    
    -- Construct the URL for the edge function
    DECLARE
      edge_function_url text;
      anon_key text;
    BEGIN
      edge_function_url := 'https://' || current_setting('supabase_functions_endpoint') || '/create-newuser-folder';
      anon_key := current_setting('supabase.anon_key');
      
      RAISE LOG 'Edge function URL: %, Using anon key: %', edge_function_url, CASE WHEN anon_key IS NULL THEN 'NULL' ELSE 'Present' END;
      
      SELECT 
        status,
        content::text
      INTO 
        response_status,
        response_body
      FROM
        net.http_post(
          url := edge_function_url,
          body := json_build_object('uuid', new.id),
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || anon_key || '"}'
        );

      -- Log the response
      RAISE LOG 'Edge function response - Status: %, Body: %', response_status, response_body;

      -- If the response status is not 200 or 201, log but continue
      IF response_status != 201 AND response_status != 200 THEN
        RAISE WARNING 'Edge function returned non-success status %: %', response_status, response_body;
      END IF;
    END;
    
    -- Continue with DB entries regardless of S3 folder status
    RAISE LOG 'Creating profile for user %', new.id;
    -- Create the user profile
    INSERT INTO public.profiles (id, name)
    VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', new.email));
  
    RAISE LOG 'Creating root folder for user %', new.id;
    -- Create a default 'Root' folder for the user that cannot be deleted
    INSERT INTO public.folders (name, user_id, is_system)
    VALUES ('Root', new.id, true)
    RETURNING id INTO root_folder_id;
  
    RAISE LOG 'Creating default category for user % with sequence=1', new.id;
    -- Create a default category with white color that cannot be deleted
    -- Set sequence to 1 for the default category
    INSERT INTO public.categories (name, color, user_id, is_system, sequence)
    VALUES ('Default', '#FFFFFF', new.id, true, 1);

    RAISE LOG 'Adding user % to newsletter subscribers', new.id;
    -- Add user to newsletter subscribers if they don't already exist
    INSERT INTO public.newsletter_subscribers (email)
    VALUES (new.email)
    ON CONFLICT (email) 
    DO UPDATE SET subscribed_at = now(), unsubscribed_at = NULL;

    RAISE LOG 'handle_new_user completed successfully for user %', new.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'Error in handle_new_user for user %: %', new.id, SQLERRM;
      -- Don't re-raise the exception - allow the user creation to continue
  END;

  RETURN new;
END;
$$;

-- Create a helper function for manually creating the user's S3 folder
CREATE OR REPLACE FUNCTION manually_create_user_folder(user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
      body := json_build_object('uuid', user_id),
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('supabase.anon_key') || '"}'
    );

  RETURN json_build_object(
    'status', response_status,
    'body', response_body
  );
END;
$$;

-- Usage example for manually creating a folder:
-- SELECT manually_create_user_folder('32aada87-0360-4841-8627-d2dbdfca3ec3');

-- Check if the trigger exists
SELECT tgname, tgrelid::regclass, tgenabled 
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- Check if handle_new_user function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Check categories table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'categories';

-- If the fix is needed, run the following:

-- Drop and recreate trigger with force
DO $$
BEGIN
  -- Drop trigger if exists
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  
  -- Recreate the trigger
  CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
  
  RAISE NOTICE 'Trigger recreated successfully';
END $$;

-- To test with a dummy user (uncomment to run)
/*
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  uuid_generate_v4(),
  'authenticated',
  'authenticated',
  'test_' || (floor(random() * 1000000)::text) || '@example.com',
  '******',
  now(),
  now(),
  now(),
  '{"provider": "email"}',
  '{"name": "Test User"}',
  now(),
  now()
);
*/

-- Check recently created user data (modify with actual UUID)
/*
SELECT 
  p.id AS profile_id,
  p.name AS profile_name,
  f.id AS folder_id,
  f.name AS folder_name,
  c.id AS category_id,
  c.name AS category_name,
  c.sequence AS category_sequence
FROM public.profiles p
LEFT JOIN public.folders f ON p.id = f.user_id AND f.is_system = true
LEFT JOIN public.categories c ON p.id = c.user_id AND c.is_system = true
WHERE p.id = 'YOUR_TEST_USER_UUID_HERE'
LIMIT 10;
*/ 