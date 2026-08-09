import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { BinancePayConfig } from './binance.ts'

/**
 * Load wallet-specific Binance Pay configuration from database
 */
export async function loadWalletConfig(
  supabaseUrl: string,
  supabaseKey: string,
  walletName: 's2gholding' | 's2gbestow' | 'user',
  userId?: string
): Promise<BinancePayConfig | null> {
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    if (walletName === 'user' && userId) {
      // Load user's personal wallet credentials
      const { data, error } = await supabase
        .from('user_wallets')
        .select('api_key, api_secret, merchant_id')
        .eq('user_id', userId)
        .eq('wallet_origin', 'binance_pay')
        .single()

      if (error || !data) {
        console.log(`No wallet config found for user ${userId}`)
        return null
      }

      if (!data.api_key || !data.api_secret) {
        console.log(`Incomplete API credentials for user ${userId}`)
        return null
      }

      return {
        apiKey: data.api_key,
        apiSecret: data.api_secret,
        merchantId: data.merchant_id || undefined,
        baseUrl: 'https://bpay.binanceapi.com',
        walletName: 'user'
      }
    } else {
      // Organization wallet credentials live ONLY in secret storage, never in the database.
      const apiKey = Deno.env.get('BINANCE_PAY_API_KEY')
      const apiSecret = Deno.env.get('BINANCE_PAY_API_SECRET')
      const merchantId = Deno.env.get('BINANCE_PAY_MERCHANT_ID') || undefined

      if (!apiKey || !apiSecret) {
        console.log(`Missing Binance Pay credentials for ${walletName}`)
        return null
      }

      // Ensure the organization wallet is configured and active
      const { data, error } = await supabase
        .from('organization_wallets')
        .select('id, merchant_id')
        .eq('wallet_name', walletName)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        console.log(`No active wallet found for ${walletName}`)
        return null
      }

      return {
        apiKey,
        apiSecret,
        merchantId: data.merchant_id || merchantId,
        baseUrl: 'https://bpay.binanceapi.com',
        walletName
      }
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
  // Digital products (music, PDFs, ebooks) go directly to user wallets
  // Physical products go to s2gholding first, then distributed after courier delivery
  return isDigitalProduct ? 'user' : 's2gholding'
}
