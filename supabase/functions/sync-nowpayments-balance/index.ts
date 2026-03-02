import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSecureCorsHeaders } from "../_shared/security.ts";

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const nowpaymentsApiKey = Deno.env.get('NOWPAYMENTS_API_KEY')!;

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: corsHeaders
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: corsHeaders
      });
    }

    console.log(`🔄 Syncing balance for user: ${user.id}`);

    let synced = 0;
    let totalCredited = 0;

    // 1. Check bestowals with pending payment that have a payment_reference (NOWPayments invoice)
    const { data: pendingBestowals } = await supabase
      .from('bestowals')
      .select('*, orchards(title, user_id)')
      .eq('payment_status', 'pending')
      .not('payment_reference', 'is', null)
      .not('payment_reference', 'eq', '');

    // Filter bestowals where the orchard owner is this user
    const userBestowals = (pendingBestowals || []).filter(
      (b: any) => b.orchards?.user_id === user.id
    );

    for (const bestowal of userBestowals) {
      try {
        // Check payment status on NOWPayments
        const paymentId = bestowal.payment_reference;
        const response = await fetch(
          `https://api.nowpayments.io/v1/payment/${paymentId}`,
          {
            headers: {
              'x-api-key': nowpaymentsApiKey,
            },
          }
        );

        if (!response.ok) {
          console.warn(`⚠️ Could not check payment ${paymentId}: ${response.status}`);
          continue;
        }

        const paymentData = await response.json();
        console.log(`Payment ${paymentId} status: ${paymentData.payment_status}`);

        if (paymentData.payment_status === 'finished') {
          // Payment completed! Update bestowal and credit balance
          const sowerAmount = bestowal.amount * 0.85; // 85% to sower

          await supabase
            .from('bestowals')
            .update({
              payment_status: 'completed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', bestowal.id);

          // Credit sower balance
          await creditSowerBalance(supabase, user.id, sowerAmount);

          synced++;
          totalCredited += sowerAmount;
          console.log(`✅ Credited $${sowerAmount.toFixed(2)} for bestowal ${bestowal.id}`);
        }
      } catch (err) {
        console.error(`Error checking bestowal ${bestowal.id}:`, err);
      }
    }

    // 2. Check product_bestowals with pending status
    const { data: pendingProducts } = await supabase
      .from('product_bestowals')
      .select('*')
      .eq('sower_id', user.id)
      .eq('status', 'pending')
      .not('payment_reference', 'is', null);

    for (const pb of pendingProducts || []) {
      try {
        const paymentRef = pb.payment_reference;
        // Product bestowals may use different reference format
        // Try to extract NOWPayments payment ID
        const response = await fetch(
          `https://api.nowpayments.io/v1/payment/${paymentRef}`,
          {
            headers: { 'x-api-key': nowpaymentsApiKey },
          }
        );

        if (!response.ok) continue;

        const paymentData = await response.json();

        if (paymentData.payment_status === 'finished') {
          const sowerAmount = pb.sower_amount || pb.amount * 0.85;

          await supabase
            .from('product_bestowals')
            .update({
              status: 'completed',
              release_status: 'released',
              released_at: new Date().toISOString(),
            })
            .eq('id', pb.id);

          await creditSowerBalance(supabase, user.id, sowerAmount);

          synced++;
          totalCredited += sowerAmount;
          console.log(`✅ Credited $${sowerAmount.toFixed(2)} for product bestowal ${pb.id}`);
        }
      } catch (err) {
        console.error(`Error checking product bestowal ${pb.id}:`, err);
      }
    }

    const message = synced > 0
      ? `Found ${synced} completed payment(s), credited $${totalCredited.toFixed(2)} to your balance`
      : 'All payments are up to date';

    console.log(`✅ Sync complete: ${message}`);

    return new Response(
      JSON.stringify({ success: true, synced, totalCredited, message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Sync error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function creditSowerBalance(supabase: any, userId: string, amount: number) {
  const { data: existing } = await supabase
    .from('sower_balances')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!existing) {
    await supabase.from('sower_balances').insert({
      user_id: userId,
      available_balance: amount,
      pending_balance: 0,
      total_earned: amount,
    });
  } else {
    await supabase
      .from('sower_balances')
      .update({
        available_balance: existing.available_balance + amount,
        total_earned: existing.total_earned + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }
}
