-- Drop duplicate triggers
DROP TRIGGER IF EXISTS after_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_folder ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Add text_color column to categories if it doesn't exist
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS text_color text DEFAULT '#000000';

-- Keep only the main trigger that handles all user creation tasks
CREATE TRIGGER on_auth_user_created 
AFTER INSERT ON auth.users 
FOR EACH ROW 
EXECUTE FUNCTION handle_new_user();

-- Add error handling to the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  response_status integer;
  response_body text;
BEGIN
  -- Create the user profile
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', new.email));
  
  -- Create a default 'Root' folder for the user that cannot be deleted
  INSERT INTO public.folders (name, user_id, is_system)
  VALUES ('Root', new.id, true);
  
  -- Create a default category with white color that cannot be deleted
  INSERT INTO public.categories (name, color, user_id, is_system)
  VALUES ('Default', '#FFFFFF', new.id, true);

  -- Add user to newsletter subscribers if they don't already exist
  INSERT INTO public.newsletter_subscribers (email)
  VALUES (new.email)
  ON CONFLICT (email) 
  DO UPDATE SET subscribed_at = now(), unsubscribed_at = NULL;

  -- Call the edge function to create a folder in S3 with error handling
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
        body := json_build_object('uuid', new.id),
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer " || current_setting("supabase.anon_key") || ""}'
      );

    -- Log the response
    RAISE NOTICE 'Edge function response - Status: %, Body: %', response_status, response_body;

    -- If the response status is not 200, raise an exception
    IF response_status != 200 THEN
      RAISE EXCEPTION 'Edge function returned status %', response_status;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't stop the transaction
    RAISE WARNING 'Failed to call edge function: %', SQLERRM;
  END;
  
  RETURN new;
END;
$$;