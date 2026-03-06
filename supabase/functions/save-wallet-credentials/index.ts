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

    const { wallet_name, api_key, api_secret, merchant_id } = await req.json();

    if (!wallet_name || !api_key || !api_secret) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: corsHeaders
      });
    }

    const orgWallets = ['s2gholding', 's2gbestow', 's2gdavison'];
    let prefix: string;

    if (orgWallets.includes(wallet_name)) {
      const { data: isAdmin } = await supabase.rpc('has_role', {
        _user_id: userId, _role: 'admin'
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403, headers: corsHeaders
        });
      }
      prefix = wallet_name;
    } else if (wallet_name === 'user') {
      prefix = `user_${userId}`;
    } else {
      return new Response(JSON.stringify({ error: 'Invalid wallet name' }), {
        status: 400, headers: corsHeaders
      });
    }

    // Upsert each credential into Vault
    const upserts = [
      { name: `${prefix}_api_key`, value: api_key, desc: `API key for ${prefix}` },
      { name: `${prefix}_api_secret`, value: api_secret, desc: `API secret for ${prefix}` },
      { name: `${prefix}_merchant_id`, value: merchant_id || '', desc: `Merchant ID for ${prefix}` },
    ];

    for (const s of upserts) {
      const { error } = await supabase.rpc('upsert_vault_secret', {
        secret_name: s.name,
        secret_value: s.value,
        secret_description: s.desc,
      });
      if (error) {
        console.error(`Failed to save vault secret ${s.name}:`, error);
        throw new Error(`Failed to save credential: ${s.name}`);
      }
    }

    console.log(`✅ Vault credentials saved for ${prefix} by user ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: `Credentials encrypted and saved for ${prefix}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Error saving vault credentials:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
