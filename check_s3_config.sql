-- Run this query in the Supabase SQL Editor to check S3 configuration

-- Check if the required environment variables exist
SELECT 
  name,
  value IS NOT NULL AS exists,
  LENGTH(value) > 0 AS has_value
FROM
  pg_settings
WHERE name IN (
  'supabase_functions_endpoint',
  'supabase.anon_key'
);

-- Create a function to manually create S3 folders for existing users
CREATE OR REPLACE FUNCTION create_missing_s3_folders()
RETURNS TABLE(user_id uuid, result jsonb) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  edge_function_url TEXT;
  anon_key TEXT;
  response_status INTEGER;
  response_body TEXT;
BEGIN
  -- Get the required settings
  BEGIN
    edge_function_url := 'https://' || current_setting('supabase_functions_endpoint', true) || '/create-newuser-folder';
    anon_key := current_setting('supabase.anon_key', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Missing required settings: %', SQLERRM;
  END;
  
  -- Loop through all users
  FOR r IN SELECT id FROM auth.users
  LOOP
    BEGIN
      user_id := r.id;
      
      -- Call the edge function
      SELECT 
        status,
        content::text
      INTO 
        response_status,
        response_body
      FROM
        net.http_post(
          url := edge_function_url,
          body := json_build_object('uuid', r.id),
          headers := json_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || anon_key
          )::jsonb
        );
      
      -- Return the result
      result := jsonb_build_object(
        'status', response_status,
        'message', response_body
      );
      
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      result := jsonb_build_object(
        'error', SQLERRM
      );
      RETURN NEXT;
    END;
  END LOOP;
  
  RETURN;
END;
$$;

-- Create a function to check if the S3 edge function works for a single user
CREATE OR REPLACE FUNCTION check_s3_folder(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  edge_function_url TEXT;
  anon_key TEXT;
  response_status INTEGER;
  response_body TEXT;
BEGIN
  -- Get the required settings
  BEGIN
    edge_function_url := 'https://' || current_setting('supabase_functions_endpoint', true) || '/create-newuser-folder';
    anon_key := current_setting('supabase.anon_key', true);
    
    -- Call the edge function
    SELECT 
      status,
      content::text
    INTO 
      response_status,
      response_body
    FROM
      net.http_post(
        url := edge_function_url,
        body := json_build_object('uuid', p_user_id),
        headers := json_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || anon_key
        )::jsonb
      );
    
    -- Return the result
    RETURN jsonb_build_object(
      'user_id', p_user_id,
      'status', response_status,
      'message', response_body,
      'edge_function_url', edge_function_url
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'user_id', p_user_id,
      'error', SQLERRM
    );
  END;
END;
$$;

-- Example usage:
-- Run for a specific user
-- SELECT check_s3_folder('32aada87-0360-4841-8627-d2dbdfca3ec3');

-- Run for all users
-- SELECT * FROM create_missing_s3_folders(); 