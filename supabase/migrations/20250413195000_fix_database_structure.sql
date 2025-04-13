-- Ensure categories table has a sequence column with not null constraint and default value
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS sequence integer;

-- Update existing records to have a sequence value
UPDATE public.categories 
SET sequence = 999 
WHERE sequence IS NULL;

-- Now make the column NOT NULL with a default value
ALTER TABLE public.categories 
ALTER COLUMN sequence SET NOT NULL,
ALTER COLUMN sequence SET DEFAULT 999;

-- Update the handle_new_user function to ensure proper sequence handling
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
  -- Call the edge function to create a folder in S3 first
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

    -- If the response status is not 200 or 201, raise an exception
    -- But don't abort the transaction, as we still want to create the DB entries
    IF response_status != 201 AND response_status != 200 THEN
      RAISE WARNING 'Edge function returned status %', response_status;
    END IF;
    
    -- Create the user profile
    INSERT INTO public.profiles (id, name)
    VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', new.email));
  
    -- Create a default 'Root' folder for the user that cannot be deleted
    INSERT INTO public.folders (name, user_id, is_system)
    VALUES ('Root', new.id, true)
    RETURNING id INTO root_folder_id;
  
    -- Create a default category with white color that cannot be deleted
    INSERT INTO public.categories (name, color, user_id, is_system, sequence)
    VALUES ('Default', '#FFFFFF', new.id, true, 1);

    -- Add user to newsletter subscribers if they don't already exist
    INSERT INTO public.newsletter_subscribers (email)
    VALUES (new.email)
    ON CONFLICT (email) 
    DO UPDATE SET subscribed_at = now(), unsubscribed_at = NULL;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create user resources: %', SQLERRM;
  END;

  RETURN new;
END;
$$; 