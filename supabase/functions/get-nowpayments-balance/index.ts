import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSecureCorsHeaders } from "../_shared/security.ts";

serve(async (req) => {
  const corsHeaders = getSecureCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const nowpaymentsApiKey = Deno.env.get('NOWPAYMENTS_API_KEY')!;

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: corsHeaders
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: corsHeaders
      });
    }

    const userId = claimsData.claims.sub;

    // Check if user has gosat role
    // Use service role client to check user_roles table (bypasses RLS)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'gosat')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden: GoSat role required' }), {
        status: 403, headers: corsHeaders
      });
    }

    // Fetch balance from NOWPayments API
    const balanceResponse = await fetch('https://api.nowpayments.io/v1/balance', {
      headers: {
        'x-api-key': nowpaymentsApiKey,
      },
    });

    if (!balanceResponse.ok) {
      const errorText = await balanceResponse.text();
      console.error('NOWPayments balance error:', balanceResponse.status, errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch NOWPayments balance',
        status: balanceResponse.status 
      }), {
        status: 502, headers: corsHeaders
      });
    }

    const balanceData = await balanceResponse.json();
    console.log('NOWPayments balance fetched successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      balance: balanceData 
    }), {
      headers: corsHeaders
    });

  } catch (error) {
    console.error('Error fetching NOWPayments balance:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: corsHeaders
    });
  }
});
