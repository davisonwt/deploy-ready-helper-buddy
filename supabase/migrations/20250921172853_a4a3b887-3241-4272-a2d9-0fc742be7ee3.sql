-- Add recipient_pubkey field to orchards table for USDC payments
ALTER TABLE public.orchards 
ADD COLUMN IF NOT EXISTS recipient_pubkey text;

-- Add tx_signature field to bestowals table to track USDC transactions
ALTER TABLE public.bestowals 
ADD COLUMN IF NOT EXISTS tx_signature text,
ADD COLUMN IF NOT EXISTS blockchain_network text DEFAULT 'solana';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bestowals_tx_signature ON public.bestowals(tx_signature);
CREATE INDEX IF NOT EXISTS idx_orchards_recipient_pubkey ON public.orchards(recipient_pubkey);