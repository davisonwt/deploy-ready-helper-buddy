
-- Grant DELETE on vault.secrets so the function can remove old secrets before re-creating
GRANT DELETE ON vault.secrets TO postgres;

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
    -- Delete the old secret directly
    DELETE FROM vault.secrets WHERE id = existing_id;
  END IF;

  -- Create a fresh secret
  PERFORM vault.create_secret(secret_value, secret_name, secret_description);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_vault_secret(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.upsert_vault_secret(text, text, text) FROM authenticated;
