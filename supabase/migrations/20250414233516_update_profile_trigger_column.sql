-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create or replace the function with updated column names
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, first_name, avatar_url, email)
  VALUES (
    new.id,
    split_part(new.raw_user_meta_data->>'full_name', ' ', 1),
    new.raw_user_meta_data->>'avatar_url',
    new.email
  );

  -- Create default 'Root' folder
  INSERT INTO public.folders (id, name, owner)
  VALUES (gen_random_uuid(), 'Root', new.id);

  -- Create default category
  INSERT INTO public.categories (id, name, owner, color)
  VALUES (gen_random_uuid(), 'Default', new.id, '#6366F1');
  
  -- Add user to newsletter_subscribers (default to subscribed)
  INSERT INTO public.newsletter_subscribers (user_id, email, is_subscribed)
  VALUES (new.id, new.email, true);
  
  RETURN new;
END;
$function$;

-- Add the trigger back
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 