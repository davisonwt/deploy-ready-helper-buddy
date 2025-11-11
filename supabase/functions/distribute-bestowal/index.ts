import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { bestowId } = await req.json();

    if (!bestowId) {
      throw new Error('bestowId is required');
    }

    // Get bestowal details with distribution data
    const { data: bestowal, error: bestowError } = await supabaseClient
      .from('bestowals')
      .select('*, distribution_data')
      .eq('id', bestowId)
      .single();

    if (bestowError) throw bestowError;

    if (!bestowal.distribution_data) {
      throw new Error('No distribution data found');
    }

    const dist = bestowal.distribution_data;

    // Log the distribution (in production, this would trigger actual blockchain transfers)
    console.log('Distributing bestowal:', {
      bestowId,
      totalAmount: bestowal.amount,
      distributions: {
        holding: dist.holding_wallet,
        tithingAdmin: {
          wallet: dist.tithing_admin_wallet,
          amount: dist.tithing_admin_amount
        },
        sower: {
          wallet: dist.sower_wallet,
          amount: dist.sower_amount
        },
        grower: dist.grower_wallet ? {
          wallet: dist.grower_wallet,
          amount: dist.grower_amount
        } : null
      }
    });

    // TODO: Implement actual blockchain transfers using Binance Pay API
    // For now, we just log and mark as distributed

    // Update bestowal as distributed
    const { error: updateError } = await supabaseClient
      .from('bestowals')
      .update({
        payment_status: 'distributed',
        distributed_at: new Date().toISOString()
      })
      .eq('id', bestowId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Bestowal distributed successfully',
        bestowId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error distributing bestowal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
