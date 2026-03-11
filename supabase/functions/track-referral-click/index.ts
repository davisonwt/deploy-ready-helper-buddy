import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();

    if (!code || typeof code !== 'string' || code.length > 20) {
      return new Response(JSON.stringify({ error: 'Invalid code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.rpc('increment_referral_clicks', { p_code: code });

    // Fallback: direct update if RPC doesn't exist yet
    if (error) {
      await supabase
        .from('user_referrals')
        .update({ total_clicks: supabase.rpc ? undefined : 0 })
        .eq('referral_code', code);
      
      // Use raw SQL-like approach via update with increment
      const { data: current } = await supabase
        .from('user_referrals')
        .select('total_clicks')
        .eq('referral_code', code)
        .single();
      
      if (current) {
        await supabase
          .from('user_referrals')
          .update({ total_clicks: (current.total_clicks || 0) + 1 })
          .eq('referral_code', code);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
