-- Migration: Create function to get user name from auth.users metadata
-- This function allows fetching user names from auth.users.user_metadata

CREATE OR REPLACE FUNCTION get_user_name(p_user_email TEXT)
RETURNS TEXT AS $$
DECLARE
  v_name TEXT;
BEGIN
  -- Get name from auth.users raw_user_meta_data
  SELECT raw_user_meta_data->>'name' INTO v_name
  FROM auth.users
  WHERE email = p_user_email;
  
  -- Return name or fallback to email username
  RETURN COALESCE(v_name, split_part(p_user_email, '@', 1));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_name(TEXT) TO anon;
