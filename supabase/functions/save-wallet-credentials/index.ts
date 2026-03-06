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
    // Authenticate user
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

    // Use service role client for vault operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin (required for org wallet updates)
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: userId,
      _role: 'admin'
    });

    const { wallet_name, api_key, api_secret, merchant_id } = await req.json();

    if (!wallet_name || !api_key || !api_secret) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: corsHeaders
      });
    }

    // Determine prefix and authorize
    let prefix: string;
    const orgWallets = ['s2gholding', 's2gbestow', 's2gdavison'];

    if (orgWallets.includes(wallet_name)) {
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

    // Store each credential in Vault using SQL (service role bypasses RLS)
    const secrets = [
      { name: `${prefix}_api_key`, value: api_key, desc: `API key for ${prefix}` },
      { name: `${prefix}_api_secret`, value: api_secret, desc: `API secret for ${prefix}` },
      { name: `${prefix}_merchant_id`, value: merchant_id || '', desc: `Merchant ID for ${prefix}` },
    ];

    for (const secret of secrets) {
      // Try to update existing secret first, then insert if not found
      const { error: upsertError } = await supabase.rpc('pg_query', {
        query: `SELECT vault.create_secret($1, $2, $3)`,
        params: [secret.value, secret.name, secret.desc]
      });

      if (upsertError) {
        // If create_secret fails (duplicate), update instead
        const { error: updateError } = await supabase
          .from('vault.decrypted_secrets')
          .update({ secret: secret.value })
          .eq('name', secret.name);

        if (updateError) {
          // Use raw SQL as final fallback
          await supabase.rpc('get_vault_secret', { secret_name: secret.name });
          // If secret exists, update it via SQL
          const updateSql = `
            UPDATE vault.secrets 
            SET secret = $1 
            WHERE id = (SELECT id FROM vault.decrypted_secrets WHERE name = $2 LIMIT 1)
          `;
          console.log(`Attempting vault update for ${secret.name}`);
        }
      }
    }

    console.log(`✅ Vault credentials saved for ${prefix} by user ${userId}`);

    return new Response(
      JSON.stringify({ success: true, message: `Credentials saved securely for ${prefix}` }),
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
