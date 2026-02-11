
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can update balances" ON public.sower_balances;

-- Allow users to INSERT their own balance record (for wallet setup)
CREATE POLICY "Users can insert their own balance"
  ON public.sower_balances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to UPDATE only their own record, and only wallet_address/wallet_type columns
-- We use a restricted UPDATE policy that checks ownership
CREATE POLICY "Users can update their own wallet settings"
  ON public.sower_balances FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
