-- ===============================================
-- PROFILE CREATION VERIFICATION SCRIPT
-- ===============================================
-- This script helps verify that profile creation works correctly.
-- It provides several ways to test the profile creation flow.

-- 1. Test the diagnose_user_profile function for a specific user
SELECT diagnose_user_profile('REPLACE_WITH_USER_UUID');

-- 2. Check if the handle_new_user trigger is set up correctly
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users' 
  AND event_object_schema = 'auth';

-- 3. Check which version of the function is active
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 4. Simulate the user creation process
-- WARNING: This should only be run in a testing environment!
DO $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Only run this in a test environment
  IF current_database() = 'postgres' AND 
     (SELECT COUNT(*) FROM auth.users) < 100 THEN
    -- Create a test user
    new_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      id,
      email,
      raw_user_meta_data,
      created_at
    ) VALUES (
      new_user_id,
      'test_' || gen_random_uuid() || '@example.com',
      '{"name": "Test User", "first_name": "Test", "last_name": "User"}',
      now()
    );
    
    RAISE NOTICE 'Created test user with ID: %', new_user_id;
    
    -- Wait a moment for trigger to execute (if using transaction)
    PERFORM pg_sleep(0.5);
    
    -- Check if profile was created
    PERFORM diagnose_user_profile(new_user_id);
  ELSE
    RAISE NOTICE 'Skipping test user creation in production environment';
  END IF;
END;
$$;

-- 5. Show all users without profiles
SELECT
  u.id,
  u.email,
  u.created_at,
  u.confirmed_at,
  u.raw_user_meta_data
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ORDER BY u.created_at DESC;

-- 6. Show all users with bad or incomplete profiles
SELECT
  u.id,
  u.email,
  p.first_name,
  p.last_name,
  p.username,
  p.email AS profile_email,
  p.is_initial_setup_completed,
  u.created_at,
  p.created_at AS profile_created_at
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE (p.email IS NULL OR p.username IS NULL)
ORDER BY u.created_at DESC;

-- 7. Fix users with missing profiles
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN
    SELECT
      u.id,
      u.email
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    WHERE p.id IS NULL
  LOOP
    -- Call the RPC function to create profile
    PERFORM get_profile_with_newsletter_status(user_record.id);
    RAISE NOTICE 'Fixed missing profile for user: % (%)', user_record.email, user_record.id;
    
    -- Add short delay between operations
    PERFORM pg_sleep(0.1);
  END LOOP;
END;
$$;

-- 8. Fix users with missing email in profile
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN
    SELECT
      u.id,
      u.email,
      p.email AS profile_email
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE p.email IS NULL AND u.email IS NOT NULL
  LOOP
    -- Update the profile email
    UPDATE public.profiles
    SET email = user_record.email,
        updated_at = now()
    WHERE id = user_record.id;
    
    RAISE NOTICE 'Fixed missing email for user: % (%)', user_record.email, user_record.id;
  END LOOP;
END;
$$; 