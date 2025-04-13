-- Run this query in the Supabase SQL Editor to create the S3 folder for a specific user

-- First, set the required environment variables if they're missing
DO $$
BEGIN
  -- Check if functions endpoint is set
  BEGIN
    PERFORM current_setting('supabase_functions_endpoint');
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('supabase_functions_endpoint', 'gyyhnbzekafnvxflhlni.supabase.co/functions/v1', false);
  END;
END $$;

-- Function to create an S3 folder for a user
CREATE OR REPLACE FUNCTION public.manual_create_user_folder(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response_status integer;
  response_body text;
  functions_endpoint text;
  anon_key text;
BEGIN
  -- Get the functions endpoint
  SELECT current_setting('supabase_functions_endpoint') INTO functions_endpoint;
  
  -- Get the anon key - you'll need to replace this with your project's anon key
  anon_key := current_setting('supabase.anon_key', true);
  
  -- If anon key is not set, use a default one (replace with your actual anon key)
  IF anon_key IS NULL THEN
    -- NOTE: Replace this with your actual anon key from the Supabase dashboard
    anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5eWhuYnpla2FmbnZ4ZmxobG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTI3ODE4NDksImV4cCI6MjAyODM1Nzg0OX0.WqKwzxsz6XFkU-EGHRzUC0k-jTejqPX6h6QOMkabGZY';
  END IF;
  
  -- Make the HTTP call to the edge function
  BEGIN
    SELECT 
      status,
      content::text
    INTO 
      response_status,
      response_body
    FROM
      net.http_post(
        url := 'https://' || functions_endpoint || '/create-newuser-folder',
        body := json_build_object('uuid', user_id),
        headers := json_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || anon_key
        )::jsonb
      );
      
    -- Return the result
    RETURN jsonb_build_object(
      'status', response_status,
      'body', response_body,
      'functions_endpoint', functions_endpoint,
      'anon_key_present', anon_key IS NOT NULL
    );
  EXCEPTION
    WHEN OTHERS THEN
      RETURN jsonb_build_object(
        'error', SQLERRM,
        'functions_endpoint', functions_endpoint,
        'anon_key_present', anon_key IS NOT NULL
      );
  END;
END;
$$;

-- Run for the specific user
-- Replace with the actual user ID
SELECT manual_create_user_folder('32aada87-0360-4841-8627-d2dbdfca3ec3');

-- Run for all users (optional)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM auth.users
  LOOP
    PERFORM manual_create_user_folder(r.id);
  END LOOP;
END $$; 