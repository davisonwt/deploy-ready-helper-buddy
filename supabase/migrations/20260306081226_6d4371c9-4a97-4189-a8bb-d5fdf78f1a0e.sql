
-- Grant the postgres role (owner of SECURITY DEFINER functions) permission to vault.secrets
GRANT SELECT, INSERT, UPDATE ON vault.secrets TO postgres;
GRANT SELECT ON vault.decrypted_secrets TO postgres;
