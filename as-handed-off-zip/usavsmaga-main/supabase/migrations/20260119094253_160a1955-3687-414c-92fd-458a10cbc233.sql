-- Add email column to profiles for username-based auth
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Create function to get email by username for login
CREATE OR REPLACE FUNCTION public.get_email_by_username(lookup_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_email text;
BEGIN
  SELECT email INTO result_email
  FROM public.profiles
  WHERE LOWER(username) = LOWER(lookup_username);
  
  RETURN result_email;
END;
$$;