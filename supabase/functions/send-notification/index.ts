import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-my-custom-header',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED_TYPES = new Set([
  'incoming_call',
  'new_message',
  'new_orchard',
  'new_product',
  'orchard_update',
  'product_purchased',
]);

interface NotificationRequest {
  user_id: string;
  type: 'incoming_call' | 'new_message' | 'new_orchard' | 'new_product' | 'orchard_update' | 'product_purchased';
  title: string;
  body: string;
  url?: string;
  data?: Record<string, unknown>;
}

const json = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json(401, { error: 'Unauthorized' });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Validate caller using anon key + provided JWT
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authClient.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return json(401, { error: 'Unauthorized' });
    }
    const callerId = claimsData.user.id;

    // Parse + validate body
    let payload: NotificationRequest;
    try {
      payload = await req.json();
    } catch {
      return json(400, { error: 'Invalid JSON body' });
    }

    const { user_id, type, title, body, url, data } = payload || ({} as NotificationRequest);

    if (!user_id || typeof user_id !== 'string') {
      return json(400, { error: 'user_id is required' });
    }
    if (!type || !ALLOWED_TYPES.has(type)) {
      return json(400, { error: 'invalid notification type' });
    }
    if (!title || typeof title !== 'string' || title.length > 200) {
      return json(400, { error: 'invalid title' });
    }
    if (!body || typeof body !== 'string' || body.length > 1000) {
      return json(400, { error: 'invalid body' });
    }
    if (url !== undefined && (typeof url !== 'string' || url.length > 2048)) {
      return json(400, { error: 'invalid url' });
    }

    // Authorization: only allow self-targeted notifications, unless caller is admin/gosat
    const adminClient = createClient(supabaseUrl, serviceKey);

    if (user_id !== callerId) {
      const { data: roleRows, error: roleErr } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', callerId);

      if (roleErr) {
        console.error('role lookup failed:', roleErr);
        return json(403, { error: 'Forbidden' });
      }

      const isPrivileged = (roleRows ?? []).some(
        (r: any) => r.role === 'admin' || r.role === 'gosat',
      );
      if (!isPrivileged) {
        return json(403, { error: 'Forbidden: cannot send notifications to other users' });
      }
    }

    console.log('Sending notification:', { caller: callerId, target: user_id, type });

    const { data: notification, error: insertError } = await adminClient
      .from('user_notifications')
      .insert({
        user_id,
        type,
        title,
        message: body,
        action_url: url,
        metadata: data,
        is_read: false,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Optional push subscription (no-op placeholder)
    const { data: subscription } = await adminClient
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', user_id)
      .single();

    if (subscription?.subscription && Deno.env.get('VAPID_PRIVATE_KEY')) {
      try {
        console.log('Would send push notification to subscription');
      } catch (pushError) {
        console.error('Failed to send push notification:', pushError);
      }
    }

    return json(200, { success: true, notification });
  } catch (error) {
    console.error('Error sending notification:', error);
    return json(500, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
});
