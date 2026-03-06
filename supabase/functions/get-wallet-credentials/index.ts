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
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: corsHeaders
      });
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: corsHeaders
      });
    }

    const userId = claimsData.claims.sub as string;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Only admins can read organization wallet credentials
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: userId, _role: 'admin'
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: corsHeaders
      });
    }

    const { wallet_names } = await req.json();
    if (!Array.isArray(wallet_names) || wallet_names.length === 0) {
      return new Response(JSON.stringify({ error: 'wallet_names required' }), {
        status: 400, headers: corsHeaders
      });
    }

    const allowedWallets = ['s2gholding', 's2gbestow', 's2gdavison'];
    const results: Record<string, { has_credentials: boolean; merchant_id: string }> = {};

    for (const walletName of wallet_names) {
      if (!allowedWallets.includes(walletName)) continue;

      // Check if Vault has credentials (don't return the actual secrets to the client)
      const { data: apiKey } = await supabase.rpc('get_vault_secret', {
        secret_name: `${walletName}_api_key`
      });
      const { data: merchantId } = await supabase.rpc('get_vault_secret', {
        secret_name: `${walletName}_merchant_id`
      });

      results[walletName] = {
        has_credentials: !!apiKey,
        merchant_id: merchantId || ''
      };
    }

    return new Response(
      JSON.stringify({ success: true, wallets: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error reading wallet credentials:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
