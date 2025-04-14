-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create or replace the function with corrected column names and values
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  -- Create the user profile with correct column names
  INSERT INTO public.profiles (
    id, 
    first_name, 
    last_name,
    email, 
    username,
    avatar_url, 
    is_initial_setup_completed
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'first_name', split_part(new.raw_user_meta_data->>'name', ' ', 1)),
    COALESCE(new.raw_user_meta_data->>'last_name', 
      CASE WHEN position(' ' in new.raw_user_meta_data->>'name') > 0 
        THEN substring(new.raw_user_meta_data->>'name' from position(' ' in new.raw_user_meta_data->>'name') + 1) 
        ELSE NULL 
      END),
    new.email,
    regexp_replace(new.email, '@.*$', ''),
    new.raw_user_meta_data->>'avatar_url',
    false
  );

  -- Create default 'Root' folder
  INSERT INTO public.folders (name, user_id, is_system)
  VALUES ('Root', new.id, true);

  -- Create default category
  INSERT INTO public.categories (name, color, user_id, is_system, sequence)
  VALUES ('Default', '#6366F1', new.id, true, 1);
  
  -- Add user to newsletter_subscribers (default to subscribed)
  INSERT INTO public.newsletter_subscribers (email)
  VALUES (new.email)
  ON CONFLICT (email) 
  DO UPDATE SET subscribed_at = now(), unsubscribed_at = NULL;
  
  RETURN new;
END;
$function$;

-- Add the trigger back
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 