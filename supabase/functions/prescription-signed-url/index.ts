// Return a short-lived signed URL for a prescription file. Only the client
// who owns the request or the pharmacist (sower) it was addressed to may read.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { prescription_request_id } = await req.json().catch(() => ({}));
    if (!prescription_request_id) {
      return new Response(JSON.stringify({ error: 'prescription_request_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: pr, error } = await admin
      .from('prescription_requests')
      .select('id, user_id, prescription_file_path, sower_id, sowers!inner(user_id)')
      .eq('id', prescription_request_id)
      .maybeSingle();
    if (error) throw error;
    if (!pr) {
      return new Response(JSON.stringify({ error: 'not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const pharmacistId = (pr as any).sowers?.user_id;
    if (pr.user_id !== user.id && pharmacistId !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!pr.prescription_file_path) {
      return new Response(JSON.stringify({ url: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: signed, error: sErr } = await admin.storage
      .from('prescriptions')
      .createSignedUrl(pr.prescription_file_path, 300);
    if (sErr) throw sErr;
    return new Response(JSON.stringify({ url: signed?.signedUrl ?? null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
