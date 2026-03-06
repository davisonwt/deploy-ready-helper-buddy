
-- Recreate the function to avoid direct table access entirely
-- Use vault's own API: delete old secret, then create new one
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
  -- Find existing secret by name
  SELECT id INTO existing_id
  FROM vault.decrypted_secrets
  WHERE name = secret_name
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    -- Delete the old secret using vault's own function
    PERFORM vault.delete_secret(existing_id);
  END IF;

  -- Create a fresh secret
  PERFORM vault.create_secret(secret_value, secret_name, secret_description);
END;
$$;

-- Ensure only service_role can call
REVOKE EXECUTE ON FUNCTION public.upsert_vault_secret(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.upsert_vault_secret(text, text, text) FROM authenticated;
