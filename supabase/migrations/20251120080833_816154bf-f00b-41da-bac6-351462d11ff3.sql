-- Enable RLS on wallets table and restrict access to admins only
-- This table has no user_id column, appears to be a system table

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Only admins can access this system table
CREATE POLICY "Admins only can access wallets"
ON wallets
FOR ALL
USING (
  is_admin_or_gosat(auth.uid())
)
WITH CHECK (
  is_admin_or_gosat(auth.uid())
);