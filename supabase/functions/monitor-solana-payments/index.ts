import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Connection, PublicKey, clusterApiUrl } from 'https://esm.sh/@solana/web3.js@1.95.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting Solana payment monitoring...')

    // Get active organization wallet
    const { data: orgWallet, error: walletError } = await supabase
      .from('organization_wallets')
      .select('*')
      .eq('is_active', true)
      .single()

    if (walletError || !orgWallet) {
      console.error('No active organization wallet found:', walletError)
      return new Response(
        JSON.stringify({ error: 'No active organization wallet configured' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Monitoring wallet:', orgWallet.wallet_address)

    // Connect to Solana mainnet
    const connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed')
    const walletPublicKey = new PublicKey(orgWallet.wallet_address)

    // Get recent signatures for the wallet
    const signatures = await connection.getSignaturesForAddress(
      walletPublicKey,
      { limit: 50 },
      'confirmed'
    )

    console.log(`Found ${signatures.length} recent transactions`)

    let newPaymentsCount = 0

    for (const signatureInfo of signatures) {
      // Check if we already have this transaction
      const { data: existingPayment } = await supabase
        .from('organization_payments')
        .select('id')
        .eq('transaction_signature', signatureInfo.signature)
        .single()

      if (existingPayment) {
        console.log('Transaction already exists:', signatureInfo.signature)
        continue
      }

      try {
        // Get transaction details
        const transaction = await connection.getTransaction(signatureInfo.signature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0
        })

        if (!transaction) {
          console.log('Transaction not found:', signatureInfo.signature)
          continue
        }

        // Parse transaction to extract payment details
        const paymentData = parseTransactionForPayment(transaction, orgWallet.wallet_address)
        
        if (paymentData) {
          console.log('Processing new payment:', paymentData)

          // Insert payment record
          const { error: insertError } = await supabase
            .from('organization_payments')
            .insert({
              transaction_signature: signatureInfo.signature,
              sender_address: paymentData.sender,
              recipient_address: orgWallet.wallet_address,
              amount: paymentData.amount,
              token_symbol: paymentData.tokenSymbol,
              token_mint: paymentData.tokenMint,
              memo: paymentData.memo,
              block_time: transaction.blockTime ? new Date(transaction.blockTime * 1000).toISOString() : null,
              confirmation_status: signatureInfo.confirmationStatus || 'confirmed'
            })

          if (insertError) {
            console.error('Error inserting payment:', insertError)
          } else {
            newPaymentsCount++
            console.log('Successfully recorded payment:', signatureInfo.signature)
          }
        }
      } catch (txError) {
        console.error('Error processing transaction:', signatureInfo.signature, txError)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${signatures.length} transactions, found ${newPaymentsCount} new payments`,
        newPayments: newPaymentsCount,
        totalProcessed: signatures.length
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in monitor-solana-payments:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function parseTransactionForPayment(transaction: any, recipientAddress: string) {
  try {
    const { message } = transaction.transaction
    const { accountKeys, instructions } = message
    
    // Look for transfers to our wallet
    let sender = null
    let amount = 0
    let tokenSymbol = 'SOL'
    let tokenMint = null
    let memo = null

    // Check for memo in instructions
    for (const instruction of instructions) {
      // Memo program
      if (instruction.programId.toString() === 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr') {
        try {
          memo = Buffer.from(instruction.data, 'base64').toString('utf8')
        } catch (e) {
          console.log('Could not decode memo:', e)
        }
      }
    }

    // Parse account changes to detect transfers
    const preBalances = transaction.meta.preBalances
    const postBalances = transaction.meta.postBalances
    
    // Find recipient account index
    const recipientIndex = accountKeys.findIndex((key: any) => 
      key.pubkey.toString() === recipientAddress
    )

    if (recipientIndex !== -1) {
      // Check SOL balance change
      const balanceChange = postBalances[recipientIndex] - preBalances[recipientIndex]
      
      if (balanceChange > 0) {
        // SOL transfer detected
        amount = balanceChange / 1e9 // Convert lamports to SOL
        tokenSymbol = 'SOL'
        
        // Find sender (account that decreased in balance)
        for (let i = 0; i < preBalances.length; i++) {
          const senderBalanceChange = postBalances[i] - preBalances[i]
          if (senderBalanceChange < 0 && Math.abs(senderBalanceChange) >= balanceChange) {
            sender = accountKeys[i].pubkey.toString()
            break
          }
        }
      }
    }

    // Check for SPL token transfers
    if (transaction.meta.preTokenBalances && transaction.meta.postTokenBalances) {
      for (const postBalance of transaction.meta.postTokenBalances) {
        if (postBalance.owner === recipientAddress) {
          const preBalance = transaction.meta.preTokenBalances.find(
            (pre: any) => pre.accountIndex === postBalance.accountIndex
          )
          
          if (preBalance) {
            const tokenChange = Number(postBalance.uiTokenAmount.amount) - Number(preBalance.uiTokenAmount.amount)
            
            if (tokenChange > 0) {
              amount = tokenChange / Math.pow(10, postBalance.uiTokenAmount.decimals)
              tokenMint = postBalance.mint
              
              // Determine token symbol based on known mints
              if (tokenMint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') {
                tokenSymbol = 'USDC'
              } else if (tokenMint === 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB') {
                tokenSymbol = 'USDT'
              } else {
                tokenSymbol = 'UNKNOWN'
              }
              
              // Find token sender
              for (const preBalance of transaction.meta.preTokenBalances) {
                if (preBalance.mint === tokenMint && preBalance.accountIndex !== postBalance.accountIndex) {
                  const postSender = transaction.meta.postTokenBalances.find(
                    (post: any) => post.accountIndex === preBalance.accountIndex
                  )
                  if (postSender) {
                    const senderChange = Number(postSender.uiTokenAmount.amount) - Number(preBalance.uiTokenAmount.amount)
                    if (senderChange <= -tokenChange) {
                      sender = preBalance.owner
                      break
                    }
                  }
                }
              }
              break
            }
          }
        }
      }
    }

    if (sender && amount > 0) {
      return {
        sender,
        amount,
        tokenSymbol,
        tokenMint,
        memo
      }
    }

    return null
  } catch (error) {
    console.error('Error parsing transaction:', error)
    return null
  }
}