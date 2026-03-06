
-- Create a secure function to upsert secrets in Supabase Vault
-- Only callable by service_role (edge functions)
CREATE OR REPLACE FUNCTION public.upsert_vault_secret(
  secret_name text,
  secret_value text,
  secret_description text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
BEGIN
  -- Check if secret already exists
  SELECT id INTO existing_id
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    -- Update existing secret
    UPDATE vault.secrets
    SET secret = secret_value,
        description = secret_description,
        updated_at = now()
    WHERE id = existing_id;
  ELSE
    -- Create new secret
    PERFORM vault.create_secret(secret_value, secret_name, secret_description);
  END IF;
END;
$$;

-- Only service_role can call this
REVOKE EXECUTE ON FUNCTION public.upsert_vault_secret(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.upsert_vault_secret(text, text, text) FROM authenticated;
