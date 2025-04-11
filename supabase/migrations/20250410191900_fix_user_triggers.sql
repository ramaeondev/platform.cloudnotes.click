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
  edge_function_url text;
  anon_key text;
  user_email text;
  user_name text;
BEGIN
  -- Get user details
  user_email := new.email;
  user_name := COALESCE(new.raw_user_meta_data->>'name', new.email);
  
  -- Log the start of the function with user details
  RAISE NOTICE '=== Starting handle_new_user ===';
  RAISE NOTICE 'User ID: %', new.id;
  RAISE NOTICE 'User Email: %', user_email;
  RAISE NOTICE 'User Name: %', user_name;
  
  -- Create the user profile
  BEGIN
    INSERT INTO public.profiles (id, name)
    VALUES (new.id, user_name);
    RAISE NOTICE 'Successfully created profile for user %', new.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile: %', SQLERRM;
    RAISE WARNING 'Error details: %', SQLSTATE;
  END;
  
  -- Create a default 'Root' folder for the user that cannot be deleted
  BEGIN
    INSERT INTO public.folders (name, user_id, is_system)
    VALUES ('Root', new.id, true);
    RAISE NOTICE 'Successfully created root folder for user %', new.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create root folder: %', SQLERRM;
    RAISE WARNING 'Error details: %', SQLSTATE;
  END;
  
  -- Create a default category with white color that cannot be deleted
  BEGIN
    INSERT INTO public.categories (name, color, text_color, user_id, is_system)
    VALUES ('Default', '#FFFFFF', '#000000', new.id, true);
    RAISE NOTICE 'Successfully created default category for user % with color #FFFFFF', new.id;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create default category: %', SQLERRM;
    RAISE WARNING 'Error details: %', SQLSTATE;
  END;

  -- Add user to newsletter subscribers if they don't already exist
  BEGIN
    INSERT INTO public.newsletter_subscribers (email)
    VALUES (user_email)
    ON CONFLICT (email) 
    DO UPDATE SET subscribed_at = now(), unsubscribed_at = NULL;
    RAISE NOTICE 'Successfully added user % to newsletter subscribers', user_email;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to add to newsletter: %', SQLERRM;
    RAISE WARNING 'Error details: %', SQLSTATE;
  END;

  -- Get the edge function URL and anon key
  BEGIN
    edge_function_url := current_setting('supabase_functions_endpoint');
    anon_key := current_setting('supabase.anon_key');
    
    RAISE NOTICE '=== Edge Function Details ===';
    RAISE NOTICE 'Edge function URL: %', edge_function_url;
    RAISE NOTICE 'Anon key exists: %', anon_key IS NOT NULL;
    RAISE NOTICE 'Anon key length: %', length(anon_key);
    
    -- Call the edge function to create a folder in S3 with error handling
    SELECT 
      status,
      content::text
    INTO 
      response_status,
      response_body
    FROM
      net.http_post(
        url := 'https://' || edge_function_url || '/create-newuser-folder',
        body := json_build_object('uuid', new.id),
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || anon_key || '"}'
      );

    -- Log the response
    RAISE NOTICE '=== Edge Function Response ===';
    RAISE NOTICE 'Status: %', response_status;
    RAISE NOTICE 'Body: %', response_body;

    -- If the response status is not 200, raise an exception
    IF response_status != 200 THEN
      RAISE EXCEPTION 'Edge function call failed with status %: %', response_status, response_body;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail the transaction
      RAISE WARNING '=== Edge Function Error ===';
      RAISE WARNING 'Error message: %', SQLERRM;
      RAISE WARNING 'Error details: %', SQLSTATE;
      RAISE WARNING 'Error context: %', current_setting('error_context');
  END;
  
  RAISE NOTICE '=== Completed handle_new_user ===';
  RETURN new;
END;
$$;

-- Create a function to generate a random, visually pleasing color
CREATE OR REPLACE FUNCTION public.generate_category_color()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  hue float;
  saturation float;
  lightness float;
  r float;
  g float;
  b float;
  hex_color text;
BEGIN
  -- Generate a random hue (0-360)
  hue := random() * 360;
  
  -- Use a fixed saturation and lightness for good visibility
  saturation := 0.7;
  lightness := 0.5;
  
  -- Convert HSL to RGB
  -- This is a simplified conversion
  r := (1 - abs(2 * lightness - 1)) * saturation;
  g := (1 - abs(2 * lightness - 1)) * saturation;
  b := (1 - abs(2 * lightness - 1)) * saturation;
  
  -- Convert RGB to hex
  hex_color := '#' || 
    lpad(to_hex(floor(r * 255)::int), 2, '0') ||
    lpad(to_hex(floor(g * 255)::int), 2, '0') ||
    lpad(to_hex(floor(b * 255)::int), 2, '0');
    
  RETURN hex_color;
END;
$$;

-- Create a trigger to set random color for new categories
CREATE OR REPLACE FUNCTION public.set_category_color()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only set color for non-system categories
  IF NEW.is_system = false THEN
    NEW.color := public.generate_category_color();
    -- Set text color to black for good contrast
    NEW.text_color := '#000000';
    RAISE NOTICE 'Setting random color for new category: %', NEW.color;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS set_category_color_trigger ON public.categories;

-- Create the trigger
CREATE TRIGGER set_category_color_trigger
  BEFORE INSERT ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_category_color(); 