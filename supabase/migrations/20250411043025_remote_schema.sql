drop function if exists "public"."generate_category_color"();

alter table "public"."categories" drop column "text_color";

set check_function_bodies = off;

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
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', new.email));
  
  -- Create a default 'Root' folder for the user that cannot be deleted
  INSERT INTO public.folders (name, user_id, is_system)
  VALUES ('Root', new.id, true);
  
  -- Create a default category with white color that cannot be deleted
  INSERT INTO public.categories (name, color, user_id, is_system)
  VALUES ('Default', 'none', new.id, true);

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
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('supabase.anon_key') || '"}'
      );

    -- Log the response
    RAISE NOTICE 'Edge function response - Status: %, Body: %', response_status, response_body;

    -- If the response status is not 200, raise an exception
    IF response_status != 200 THEN
      RAISE EXCEPTION 'Edge function call failed with status %: %', response_status, response_body;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Log the error but don't fail the transaction
      RAISE WARNING 'Error calling edge function: %', SQLERRM;
  END;
  
  RETURN new;
END;
$function$
;


