-- Fix wallet_balances table to add missing user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallet_balances' 
        AND column_name = 'user_id' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE wallet_balances ADD COLUMN user_id uuid REFERENCES auth.users(id);
    END IF;
END $$;

-- Fix wallet_balances table to add missing updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallet_balances' 
        AND column_name = 'updated_at' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE wallet_balances ADD COLUMN updated_at timestamp with time zone DEFAULT now();
        -- Update existing records to copy last_updated to updated_at
        UPDATE wallet_balances SET updated_at = last_updated WHERE updated_at IS NULL;
    END IF;
END $$;