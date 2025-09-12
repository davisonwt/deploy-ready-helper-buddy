-- Fix RLS to stop wallet-related errors causing UI glitches on admin pages
-- Enable RLS (safe even if already enabled)
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;

-- Policies for user_wallets: users manage only their own wallet records
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_wallets' AND policyname = 'Users can view their wallets'
  ) THEN
    CREATE POLICY "Users can view their wallets"
    ON public.user_wallets
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_wallets' AND policyname = 'Users can insert their wallets'
  ) THEN
    CREATE POLICY "Users can insert their wallets"
    ON public.user_wallets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_wallets' AND policyname = 'Users can update their wallets'
  ) THEN
    CREATE POLICY "Users can update their wallets"
    ON public.user_wallets
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_wallets' AND policyname = 'Users can delete their wallets'
  ) THEN
    CREATE POLICY "Users can delete their wallets"
    ON public.user_wallets
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- Policies for wallet_balances: users manage only their own balance records
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'wallet_balances' AND policyname = 'Users can view their wallet balances'
  ) THEN
    CREATE POLICY "Users can view their wallet balances"
    ON public.wallet_balances
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'wallet_balances' AND policyname = 'Users can insert their wallet balances'
  ) THEN
    CREATE POLICY "Users can insert their wallet balances"
    ON public.wallet_balances
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'wallet_balances' AND policyname = 'Users can update their wallet balances'
  ) THEN
    CREATE POLICY "Users can update their wallet balances"
    ON public.wallet_balances
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'wallet_balances' AND policyname = 'Users can delete their wallet balances'
  ) THEN
    CREATE POLICY "Users can delete their wallet balances"
    ON public.wallet_balances
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;