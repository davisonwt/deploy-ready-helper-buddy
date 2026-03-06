
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
    UPDATE vault.secrets
    SET secret = secret_value,
        description = secret_description,
        updated_at = now()
    WHERE id = existing_id;
  ELSE
    BEGIN
      PERFORM vault.create_secret(secret_value, secret_name, secret_description);
    EXCEPTION WHEN unique_violation THEN
      -- Race condition: another call inserted it, just update
      UPDATE vault.secrets
      SET secret = secret_value,
          description = secret_description,
          updated_at = now()
      WHERE id = (SELECT id FROM vault.decrypted_secrets WHERE name = secret_name LIMIT 1);
    END;
  END IF;
END;
$$;
