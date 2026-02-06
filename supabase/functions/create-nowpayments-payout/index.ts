import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': [
    'authorization',
    'x-client-info',
    'apikey',
    'content-type',
    'x-my-custom-header',
  ].join(', '),
};

// Minimum payout amount in USD
const MIN_PAYOUT_AMOUNT = 10;

// Payout fee (NOWPayments charges a small fee for payouts)
const PAYOUT_FEE_PERCENT = 0.5; // 0.5%

interface PayoutRequest {
  amount: number;
  walletAddress: string;
  walletType?: string;
  currency?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const nowpaymentsApiKey = Deno.env.get('NOWPAYMENTS_API_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Parse request
    const body: PayoutRequest = await req.json();
    const { amount, walletAddress, walletType = 'solana', currency = 'USDCSOL' } = body;

    // Validate amount
    if (!amount || amount < MIN_PAYOUT_AMOUNT) {
      return new Response(
        JSON.stringify({ error: `Minimum payout amount is $${MIN_PAYOUT_AMOUNT}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate wallet address
    if (!walletAddress || walletAddress.length < 32) {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user's available balance
    const { data: balance, error: balanceError } = await supabase
      .from('sower_balances')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (balanceError || !balance) {
      return new Response(
        JSON.stringify({ error: 'No balance record found. Earn some bestowals first!' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (balance.available_balance < amount) {
      return new Response(
        JSON.stringify({ 
          error: `Insufficient balance. Available: $${balance.available_balance.toFixed(2)}, Requested: $${amount.toFixed(2)}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for pending payouts
    const { data: pendingPayouts } = await supabase
      .from('sower_payouts')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['pending', 'processing']);

    if (pendingPayouts && pendingPayouts.length > 0) {
      return new Response(
        JSON.stringify({ error: 'You have a pending payout. Please wait for it to complete.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate payout amount after fee
    const payoutFee = amount * (PAYOUT_FEE_PERCENT / 100);
    const netPayoutAmount = amount - payoutFee;

    console.log('💰 Creating payout:', { amount, netPayoutAmount, payoutFee, walletAddress });

    // Create payout record
    const { data: payout, error: payoutError } = await supabase
      .from('sower_payouts')
      .insert({
        user_id: user.id,
        amount: amount,
        currency: 'USD',
        wallet_address: walletAddress,
        wallet_type: walletType,
        payout_provider: 'nowpayments',
        status: 'pending',
        metadata: {
          net_amount: netPayoutAmount,
          fee: payoutFee,
          fee_percent: PAYOUT_FEE_PERCENT,
          payout_currency: currency,
        },
      })
      .select()
      .single();

    if (payoutError || !payout) {
      console.error('❌ Failed to create payout record:', payoutError);
      throw payoutError;
    }

    // Deduct from available balance immediately
    await supabase
      .from('sower_balances')
      .update({
        available_balance: balance.available_balance - amount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    // Call NOWPayments Payout API
    try {
      const payoutResponse = await fetch('https://api.nowpayments.io/v1/payout', {
        method: 'POST',
        headers: {
          'x-api-key': nowpaymentsApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          withdrawals: [{
            address: walletAddress,
            currency: currency.toLowerCase(),
            amount: netPayoutAmount,
            ipn_callback_url: `${supabaseUrl}/functions/v1/nowpayments-payout-webhook`,
            extra_id: payout.id,
          }],
        }),
      });

      if (!payoutResponse.ok) {
        const errorText = await payoutResponse.text();
        console.error('❌ NOWPayments payout API error:', payoutResponse.status, errorText);
        
        // Refund the balance
        await supabase
          .from('sower_balances')
          .update({
            available_balance: balance.available_balance,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);

        // Update payout status
        await supabase
          .from('sower_payouts')
          .update({
            status: 'failed',
            failure_reason: errorText,
            updated_at: new Date().toISOString(),
          })
          .eq('id', payout.id);

        throw new Error(`Payout API error: ${errorText}`);
      }

      const payoutData = await payoutResponse.json();
      console.log('✅ NOWPayments payout created:', payoutData);

      // Update payout record with API response
      await supabase
        .from('sower_payouts')
        .update({
          payout_reference: payoutData.id || payoutData.withdrawals?.[0]?.id,
          payout_batch_id: payoutData.batch_withdrawal_id,
          status: 'processing',
          updated_at: new Date().toISOString(),
          metadata: {
            ...payout.metadata,
            nowpayments_response: payoutData,
          },
        })
        .eq('id', payout.id);

      // Update balance record with withdrawal total
      await supabase
        .from('sower_balances')
        .update({
          total_withdrawn: (balance.total_withdrawn || 0) + amount,
          last_payout_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      // Create audit log
      await supabase.from('payment_audit_log').insert({
        user_id: user.id,
        action: 'create_payout',
        amount: amount,
        currency: 'USD',
        status: 'processing',
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        metadata: {
          payout_id: payout.id,
          wallet_address: walletAddress,
          wallet_type: walletType,
          net_amount: netPayoutAmount,
          fee: payoutFee,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          payoutId: payout.id,
          amount: amount,
          netAmount: netPayoutAmount,
          fee: payoutFee,
          status: 'processing',
          message: 'Payout is being processed. You will receive funds shortly.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (apiError) {
      console.error('❌ Payout API error:', apiError);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to process payout. Please try again later.',
          details: String(apiError),
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('❌ Error creating payout:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create payout', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
