import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { BinancePayConfig } from './binance.ts'

/**
 * Retrieve a secret from Supabase Vault via the get_vault_secret RPC function.
 * Must be called with a service-role client.
 */
async function getVaultSecret(supabase: any, secretName: string): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_vault_secret', { secret_name: secretName })
  if (error) {
    console.error(`Error retrieving vault secret "${secretName}":`, error.message)
    return null
  }
  return data || null
}

/**
 * Load wallet-specific configuration from Supabase Vault (encrypted at rest).
 * Secret naming convention:
 *   Organization wallets: {wallet_name}_api_key, {wallet_name}_api_secret, {wallet_name}_merchant_id
 *   User wallets: user_{userId}_api_key, user_{userId}_api_secret, user_{userId}_merchant_id
 */
export async function loadWalletConfig(
  supabaseUrl: string,
  supabaseKey: string,
  walletName: 's2gholding' | 's2gbestow' | 'user',
  userId?: string
): Promise<BinancePayConfig | null> {
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    let prefix: string

    if (walletName === 'user' && userId) {
      prefix = `user_${userId}`
    } else {
      prefix = walletName
    }

    // Retrieve credentials from Vault
    const [apiKey, apiSecret, merchantId] = await Promise.all([
      getVaultSecret(supabase, `${prefix}_api_key`),
      getVaultSecret(supabase, `${prefix}_api_secret`),
      getVaultSecret(supabase, `${prefix}_merchant_id`),
    ])

    if (!apiKey || !apiSecret) {
      console.error(`No vault credentials found for ${prefix}. Configure secrets in Supabase Vault.`)
      return null
    }

    return {
      apiKey,
      apiSecret,
      merchantId: merchantId || undefined,
      baseUrl: 'https://bpay.binanceapi.com',
      walletName
    }
  } catch (error) {
    console.error(`Error loading wallet config for ${walletName}:`, error)
    return null
  }
}

/**
 * Get the appropriate wallet to receive payment based on product type
 */
export function getPaymentDestinationWallet(isDigitalProduct: boolean): 's2gholding' | 'user' {
  return isDigitalProduct ? 'user' : 's2gholding'
}
