-- Direct SQL to run in production to fix Row-Level Security policies
-- Copy and execute this SQL directly in the SQL editor in Supabase dashboard

-- First, check and enable RLS on the profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow trigger function to create profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow system to create any profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow unauthenticated profile creation" ON public.profiles;

-- Create comprehensive policies for all operations

-- 1. Policy for SELECTING profiles (reading)
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 2. Policy for UPDATING profiles (editing)
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- 3. Policy for INSERTING profiles (creating)
-- This is the most important one for fixing your issue
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

-- 4. Policy for service roles and triggers
CREATE POLICY "Allow system to create any profile"
ON public.profiles
FOR ALL 
TO postgres, service_role
USING (true)
WITH CHECK (true);

-- 5. Special policy for unauthenticated users during signup
CREATE POLICY "Allow unauthenticated profile creation"
ON public.profiles
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO postgres, service_role;

-- Notify successful completion
DO $$
BEGIN
  RAISE NOTICE 'Fixed RLS policies for profiles table';
END $$; 