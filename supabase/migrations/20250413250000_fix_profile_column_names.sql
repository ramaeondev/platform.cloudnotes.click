-- Drop any existing triggers to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Add first_name column if it doesn't exist
ALTER TABLE "public"."profiles" 
ADD COLUMN IF NOT EXISTS "first_name" text;

-- Copy data from name to first_name
UPDATE "public"."profiles"
SET "first_name" = "name";

-- Drop the name column
ALTER TABLE "public"."profiles"
DROP COLUMN "name";

-- Recreate the trigger with updated column name
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
  -- Create the user profile
  BEGIN
    INSERT INTO public.profiles (id, first_name)
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

  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user(); 