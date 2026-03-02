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
    const globalApiKey = Deno.env.get('NOWPAYMENTS_API_KEY');

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

    // Load API keys from organization_wallets table for both wallets
    const { data: wallets, error: walletsError } = await serviceClient
      .from('organization_wallets')
      .select('wallet_name, api_key')
      .in('wallet_name', ['s2gholding', 's2gbestow'])
      .eq('is_active', true);

    if (walletsError) {
      console.error('Error loading wallet configs:', walletsError);
    }

    const walletApiKeys: Record<string, string> = {};
    if (wallets) {
      for (const w of wallets) {
        if (w.api_key) {
          walletApiKeys[w.wallet_name] = w.api_key;
        }
      }
    }

    // Fall back to global env key if no per-wallet keys found
    if (!walletApiKeys['s2gholding'] && globalApiKey) {
      walletApiKeys['s2gholding'] = globalApiKey;
    }

    // Helper to parse NOWPayments balance response
    function parseBalance(raw: any): Array<{ currency: string; amount: number }> {
      const currencies: Array<{ currency: string; amount: number }> = [];
      if (raw && typeof raw === 'object') {
        if (Array.isArray(raw)) {
          raw.forEach((item: any) => {
            if (item.currency && item.amount !== undefined) {
              currencies.push({ currency: item.currency.toUpperCase(), amount: Number(item.amount) });
            }
          });
        } else {
          for (const [key, value] of Object.entries(raw)) {
            if (typeof value === 'number') {
              currencies.push({ currency: key.toUpperCase(), amount: value });
            } else if (typeof value === 'object' && value !== null && 'amount' in (value as any)) {
              currencies.push({ currency: key.toUpperCase(), amount: Number((value as any).amount) });
            }
          }
        }
      }
      return currencies;
    }

    // Fetch balance for each wallet that has an API key
    const results: Record<string, { currencies: Array<{ currency: string; amount: number }>; error?: string }> = {};

    const walletNames = ['s2gholding', 's2gbestow'];

    await Promise.all(walletNames.map(async (name) => {
      const apiKey = walletApiKeys[name];
      if (!apiKey) {
        results[name] = { currencies: [], error: 'No API key configured' };
        return;
      }

      try {
        const balanceResponse = await fetch('https://api.nowpayments.io/v1/balance', {
          headers: { 'x-api-key': apiKey },
        });

        if (!balanceResponse.ok) {
          const errorText = await balanceResponse.text();
          console.error(`NOWPayments balance error for ${name}:`, balanceResponse.status, errorText);
          results[name] = { currencies: [], error: `HTTP ${balanceResponse.status}` };
          return;
        }

        const balanceData = await balanceResponse.json();
        results[name] = { currencies: parseBalance(balanceData) };
      } catch (err: any) {
        console.error(`Error fetching balance for ${name}:`, err);
        results[name] = { currencies: [], error: err.message };
      }
    }));

    console.log('NOWPayments balances fetched successfully');

    return new Response(JSON.stringify({
      success: true,
      wallets: results,
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
