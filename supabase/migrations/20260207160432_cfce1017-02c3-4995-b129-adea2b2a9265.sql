-- Allow users to insert their own sower_balances row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='sower_balances' AND policyname='Users can create their own balance'
  ) THEN
    CREATE POLICY "Users can create their own balance"
    ON public.sower_balances
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Allow users to update their own wallet settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='sower_balances' AND policyname='Users can update their own balance'
  ) THEN
    CREATE POLICY "Users can update their own balance"
    ON public.sower_balances
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;