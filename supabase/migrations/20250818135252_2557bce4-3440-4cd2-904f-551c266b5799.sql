-- Update or insert the organization wallet address
INSERT INTO organization_wallets (wallet_address, wallet_name, is_active, supported_tokens)
VALUES (
  '13M2yVLWFmm2VeU1SD5PPPzJwBGUR3eny6Mbvdx3ztct',
  'Sow2Grow Organizational Wallet',
  true,
  ARRAY['SOL', 'USDC', 'USDT']
)
ON CONFLICT (wallet_address) 
DO UPDATE SET 
  is_active = true,
  updated_at = now()
WHERE organization_wallets.wallet_address = '13M2yVLWFmm2VeU1SD5PPPzJwBGUR3eny6Mbvdx3ztct';

-- Deactivate any other active wallets to ensure only one is active
UPDATE organization_wallets 
SET is_active = false, updated_at = now()
WHERE wallet_address != '13M2yVLWFmm2VeU1SD5PPPzJwBGUR3eny6Mbvdx3ztct' 
AND is_active = true;