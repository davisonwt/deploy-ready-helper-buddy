-- Which Solana cluster a solana_usdc payout row actually went out on.
-- Without this, a devnet test send and a real mainnet payout are
-- indistinguishable in the payouts table -- and today, EVERY solana_usdc
-- row is a devnet send, since payout-earnings defaults to devnet until
-- SOLANA_CLUSTER=mainnet-beta is explicitly set (see
-- _shared/cryptoNetworks.ts). NULL for paypal rows and any solana_usdc
-- rows that predate this column.
ALTER TABLE public.payouts
  ADD COLUMN solana_cluster text CHECK (solana_cluster IN ('devnet', 'mainnet-beta'));
