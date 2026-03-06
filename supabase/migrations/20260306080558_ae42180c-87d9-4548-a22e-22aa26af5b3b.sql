
-- Create a secure function to retrieve secrets from Supabase Vault
-- This function uses SECURITY DEFINER so it can access vault schema
-- Only callable by service_role (edge functions)
CREATE OR REPLACE FUNCTION public.get_vault_secret(secret_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_value text;
BEGIN
  SELECT decrypted_secret INTO secret_value
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;

  RETURN secret_value;
END;
$$;

-- Revoke access from anon and authenticated roles (only service_role can call this)
REVOKE EXECUTE ON FUNCTION public.get_vault_secret(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_vault_secret(text) FROM authenticated;
