-- Update existing default categories to use white
UPDATE public.categories 
SET color = '#FFFFFF' 
WHERE color = '#E2E8F0';

-- Modify the handle_new_user function to use white as the default color
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  response_status integer;
  response_body text;
BEGIN
  -- Create the user profile
  INSERT INTO public.profiles (id, first_name, last_name, username, email, is_initial_setup_completed)
  VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'first_name', NULL),
      COALESCE(new.raw_user_meta_data->>'last_name', NULL),
      regexp_replace(new.email, '@.*$', ''),
      new.email,
      true
  );
  
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
$function$;