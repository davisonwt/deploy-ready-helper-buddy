import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-my-custom-header',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface NotificationRequest {
  user_id: string;
  type: 'incoming_call' | 'new_message' | 'new_orchard' | 'new_product' | 'orchard_update' | 'product_purchased';
  title: string;
  body: string;
  url?: string;
  data?: Record<string, unknown>;
}

// Restrict action URLs to same-origin paths or allow-listed hosts
function sanitizeActionUrl(url?: string): string | null {
  if (!url) return null;
  // Allow relative paths like "/orchard/123"
  if (url.startsWith('/') && !url.startsWith('//')) return url.slice(0, 2048);
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    const allowed = /(^|\.)(sow2grow\.online|sow2growapp\.com|lovable\.app|lovable\.dev)$/i;
    if (allowed.test(u.hostname)) return u.toString().slice(0, 2048);
    return null;
  } catch { return null; }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization') ?? '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.slice(7).trim();

    // Trusted server-to-server callers use the service role key
    const isServiceRole = token === SUPABASE_SERVICE_ROLE_KEY;

    let callerId: string | null = null;
    let callerIsAdmin = false;
    if (!isServiceRole) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      callerId = userData.user.id;
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const { data: roles } = await admin
        .from('user_roles')
        .select('role')
        .eq('user_id', callerId);
      callerIsAdmin = !!roles?.some((r: any) => ['admin', 'gosat'].includes(r.role));
    }

    const { user_id, type, title, body, url, data }: NotificationRequest = await req.json();

    if (!user_id || !type || !title || !body) {
      return new Response(JSON.stringify({ error: 'missing fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Authorization: only allow inserting notifications for self, or if service_role/admin
    if (!isServiceRole && !callerIsAdmin && user_id !== callerId) {
      return new Response(JSON.stringify({ error: 'forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate/sanitize inputs
    const safeTitle = String(title).slice(0, 300);
    const safeBody = String(body).slice(0, 4000);
    const safeUrl = sanitizeActionUrl(url ?? undefined);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: notification, error: insertError } = await supabase
      .from('user_notifications')
      .insert({
        user_id,
        type,
        title: safeTitle,
        message: safeBody,
        action_url: safeUrl,
        metadata: data ?? null,
        is_read: false,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, notification }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error sending notification:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send notification' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
