
-- Create or replace the handle_new_user function to also create a default folder and call edge function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create the user profile
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'name', new.email));
  
  -- Create a default 'Root' folder for the user that cannot be deleted
  INSERT INTO public.folders (name, user_id, is_system)
  VALUES ('Root', new.id, true);
  
  -- Create a default category that cannot be deleted
  INSERT INTO public.categories (name, color, user_id, is_system)
  VALUES ('Default', 'none', new.id, true);

  -- Add user to newsletter subscribers if they don't already exist
  INSERT INTO public.newsletter_subscribers (email)
  VALUES (new.email)
  ON CONFLICT (email) 
  DO UPDATE SET subscribed_at = now(), unsubscribed_at = NULL;

  -- Call the edge function to create a folder in S3
  PERFORM
    net.http_post(
      url := 'https://' || current_setting('supabase_functions_endpoint') || '/create-newuser-folder',
      body := json_build_object('uuid', new.id),
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('supabase.anon_key') || '"}'
    );
  
  RETURN new;
END;
$$;

-- Ensure the trigger is created (will not recreate if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
  END IF;
END
$$;
