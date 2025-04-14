-- Create a function to properly ban users
CREATE OR REPLACE FUNCTION public.admin_ban_user(uid UUID, ban_duration TEXT DEFAULT '100 years')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function uses a direct update to the auth.users table to set the banned_until field
  -- which is the proper way to prevent user login
  UPDATE auth.users
  SET banned_until = CURRENT_TIMESTAMP + ban_duration::interval
  WHERE id = uid;
END;
$$;

-- Add comments to the function for documentation
COMMENT ON FUNCTION public.admin_ban_user IS 'Bans a user by setting their banned_until timestamp in the auth.users table';

-- Create a function to unban users (for reactivation)
CREATE OR REPLACE FUNCTION public.admin_unban_user(uid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function uses a direct update to the auth.users table to clear the banned_until field
  UPDATE auth.users
  SET banned_until = NULL
  WHERE id = uid;
END;
$$;

-- Add comments to the function for documentation
COMMENT ON FUNCTION public.admin_unban_user IS 'Unbans a user by clearing their banned_until timestamp in the auth.users table';

-- Grant permissions to service role
GRANT EXECUTE ON FUNCTION public.admin_ban_user TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_unban_user TO service_role; 