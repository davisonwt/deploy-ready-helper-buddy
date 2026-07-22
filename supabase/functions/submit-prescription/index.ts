// Submit a prescription request to a regulated seller (pharmacy pilot).
// Client uploads the prescription file to the private `prescriptions` bucket
// first (path: {sower_id}/{ts}-{filename}), then calls this function with the
// resulting object path. We validate, create a 1-on-1 chat room, insert the
// prescription_requests row, drop a system message with the signed URL, and
// notify the pharmacist.
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
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const {
      sower_id,
      prescription_file_path,
      prescription_file_name,
      client_notes,
      fulfillment_mode,
      delivery_address,
      contact_phone,
    } = body as Record<string, string | undefined>;

    if (!sower_id || typeof sower_id !== 'string') {
      return new Response(JSON.stringify({ error: 'sower_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (client_notes && client_notes.length > 4000) {
      return new Response(JSON.stringify({ error: 'client_notes too long (max 4000)' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const allowedModes = ['pickup', 'self_deliver', 'community_driver', 'courier_quote'];
    if (fulfillment_mode && !allowedModes.includes(fulfillment_mode)) {
      return new Response(JSON.stringify({ error: 'invalid fulfillment_mode' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Verify sower exists and is a regulated_business
    const { data: sower, error: sowerErr } = await admin
      .from('sowers')
      .select('id, user_id, display_name, seller_template')
      .eq('id', sower_id)
      .maybeSingle();
    if (sowerErr) throw sowerErr;
    if (!sower) {
      return new Response(JSON.stringify({ error: 'Sower not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (sower.seller_template !== 'regulated_business') {
      return new Response(JSON.stringify({ error: 'This seller does not accept prescriptions' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (sower.user_id === user.id) {
      return new Response(JSON.stringify({ error: 'Cannot submit prescription to your own sower' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a 1-on-1 chat room (private)
    const { data: room, error: roomErr } = await admin
      .from('chat_rooms')
      .insert({
        name: `Consult with ${sower.display_name ?? 'Pharmacist'}`,
        description: 'Prescription consult',
        room_type: 'direct',
        category: 'consult',
        is_active: true,
        created_by: user.id,
        max_participants: 2,
      })
      .select()
      .single();
    if (roomErr) throw roomErr;

    // Add both participants (client + pharmacist)
    await admin.from('chat_participants').insert([
      { room_id: room.id, user_id: user.id, is_moderator: false, is_active: true },
      { room_id: room.id, user_id: sower.user_id, is_moderator: true, is_active: true },
    ]);

    // Insert prescription request row
    const { data: presReq, error: presErr } = await admin
      .from('prescription_requests')
      .insert({
        user_id: user.id,
        sower_id: sower.id,
        chat_room_id: room.id,
        prescription_file_path: prescription_file_path ?? null,
        prescription_file_name: prescription_file_name ?? null,
        client_notes: client_notes ?? null,
        fulfillment_mode: fulfillment_mode ?? null,
        delivery_address: delivery_address ?? null,
        contact_phone: contact_phone ?? null,
        status: 'submitted',
      })
      .select()
      .single();
    if (presErr) throw presErr;

    // Post intro message in the chat
    const intro = [
      '📋 **New prescription consult**',
      client_notes ? `\n**Symptoms / notes:** ${client_notes}` : '',
      fulfillment_mode ? `\n**Preferred fulfillment:** ${fulfillment_mode.replace('_', ' ')}` : '',
      prescription_file_name ? `\n**Prescription file attached:** ${prescription_file_name}` : '',
    ].filter(Boolean).join('');

    await admin.from('chat_messages').insert({
      room_id: room.id,
      user_id: user.id,
      content: intro,
      message_type: 'text',
    });

    // Notify pharmacist
    await admin.from('user_notifications').insert({
      user_id: sower.user_id,
      type: 'prescription_request',
      title: 'New prescription consult',
      message: `A client has submitted a prescription for review.`,
      data: { prescription_request_id: presReq.id, chat_room_id: room.id, sower_id: sower.id },
    }).then(() => {}).catch(() => {}); // notifications table may vary; do not fail request

    return new Response(JSON.stringify({
      prescription_request_id: presReq.id,
      chat_room_id: room.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('submit-prescription error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
