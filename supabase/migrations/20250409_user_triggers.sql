
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
  
  -- Create a default 'Root' folder for the user
  INSERT INTO public.folders (name, user_id)
  VALUES ('Root', new.id);
  
  -- Create a default category
  INSERT INTO public.categories (name, color, user_id)
  VALUES ('Personal', 'blue', new.id);

  -- Call the edge function to create a folder in S3
  PERFORM
    net.http_post(
      url := 'https://gyyhnbzekafnvxflhlni.functions.supabase.co/create-newuser-folder',
      body := json_build_object('uuid', new.id),
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('request.headers')::json->>'apikey' || '"}'
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
