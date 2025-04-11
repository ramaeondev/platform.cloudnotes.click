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