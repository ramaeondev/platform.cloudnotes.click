-- Update the handle_new_user function to improve error handling and continue even if edge function fails
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
  edge_function_url text;
  anon_key text;
BEGIN
  -- Create DB records first - these are critical
  
  -- Create the user profile
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', new.email));

  -- Create a default 'Root' folder for the user that cannot be deleted
  INSERT INTO public.folders (name, user_id, is_system)
  VALUES ('Root', new.id, true)
  RETURNING id INTO root_folder_id;

  -- Create a default category with white color that cannot be deleted
  -- Set sequence to 1 for the default category
  INSERT INTO public.categories (name, color, user_id, is_system, sequence)
  VALUES ('Default', '#FFFFFF', new.id, true, 1);

  -- Add user to newsletter subscribers if they don't already exist
  INSERT INTO public.newsletter_subscribers (email)
  VALUES (new.email)
  ON CONFLICT (email) 
  DO UPDATE SET subscribed_at = now(), unsubscribed_at = NULL;

  -- After critical DB operations, try to call the edge function (but don't fail if it fails)
  BEGIN
    -- Get the function endpoint and anon key
    edge_function_url := 'https://' || current_setting('supabase_functions_endpoint', true) || '/create-newuser-folder';
    
    -- Handle case where anon key might not be set
    BEGIN
      anon_key := current_setting('supabase.anon_key', true);
    EXCEPTION WHEN OTHERS THEN
      anon_key := '';
      RAISE WARNING 'Failed to get anon key: %', SQLERRM;
    END;
    
    -- Only attempt if both values are available
    IF edge_function_url != 'https:///create-newuser-folder' AND anon_key != '' THEN
      BEGIN
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
            headers := json_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || anon_key
            )::jsonb
          );

        -- Log the response but don't fail the transaction
        RAISE NOTICE 'Edge function response - Status: %, Body: %', response_status, response_body;
      EXCEPTION WHEN OTHERS THEN
        -- Just log the error
        RAISE WARNING 'Error calling edge function: %', SQLERRM;
      END;
    ELSE
      RAISE WARNING 'Missing Supabase functions endpoint or anon key';
    END IF;
  END;
  
  RETURN new;
END;
$$; 