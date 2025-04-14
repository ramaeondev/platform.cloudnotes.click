-- Create a function that returns profile data combined with newsletter subscription status
CREATE OR REPLACE FUNCTION public.get_profile_with_newsletter_status(profile_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  profile_data JSONB;
  newsletter_status BOOLEAN;
BEGIN
  -- Get the profile data
  SELECT jsonb_build_object(
    'id', p.id,
    'first_name', p.first_name,
    'last_name', p.last_name,
    'username', p.username,
    'email', p.email,
    'avatar_url', p.avatar_url,
    'is_initial_setup_completed', p.is_initial_setup_completed,
    'updated_at', p.updated_at,
    'created_at', p.created_at
  )
  INTO profile_data
  FROM profiles p
  WHERE p.id = profile_id;
  
  -- If profile doesn't exist, return null
  IF profile_data IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get the newsletter subscription status
  SELECT 
    CASE 
      WHEN ns.subscribed_at IS NOT NULL AND ns.unsubscribed_at IS NULL THEN TRUE
      ELSE FALSE
    END INTO newsletter_status
  FROM profiles p
  LEFT JOIN newsletter_subscribers ns ON p.email = ns.email
  WHERE p.id = profile_id;
  
  -- Add newsletter status to profile data
  profile_data = profile_data || jsonb_build_object('newsletter_subscribed', newsletter_status);
  
  RETURN profile_data;
END;
$$;

-- Create an API to expose this function through PostgREST
COMMENT ON FUNCTION public.get_profile_with_newsletter_status IS 'Gets a user profile with newsletter subscription status';

-- Allow authenticated users to call this function
GRANT EXECUTE ON FUNCTION public.get_profile_with_newsletter_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_with_newsletter_status TO service_role; 