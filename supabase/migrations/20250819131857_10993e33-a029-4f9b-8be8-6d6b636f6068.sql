-- Insert initial organization wallet for testing
INSERT INTO organization_wallets (
  wallet_address,
  wallet_name,
  supported_tokens,
  is_active
) VALUES (
  'Demo1234567890123456789012345678901234567890',
  'Sow2Grow Organization Wallet',
  ARRAY['SOL', 'USDC', 'USDT'],
  true
)
ON CONFLICT (wallet_address) DO NOTHING;