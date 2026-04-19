// tribal-hearts-icebreaker — when a match becomes mutual, create a chat room and seed a respectful opener from Debian.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const auth = req.headers.get('Authorization') || '';

    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { match_id } = await req.json();
    if (!match_id) return new Response(JSON.stringify({ error: 'match_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: match } = await admin.from('tribal_hearts_matches').select('*').eq('id', match_id).maybeSingle();
    if (!match) return new Response(JSON.stringify({ error: 'match not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (match.status !== 'mutual') return new Response(JSON.stringify({ error: 'match not mutual yet' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (match.member_a_id !== user.id && match.member_b_id !== user.id) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let roomId = match.chat_room_id;
    if (!roomId) {
      const { data: room, error: roomErr } = await admin.from('chat_rooms').insert({
        room_type: 'private',
        is_active: true,
        created_by: match.member_a_id,
        name: 'Tribal Hearts',
        description: 'A safe space — all chats stay inside Sow2Grow 🌸',
        room_features: { source: 'tribal_hearts', match_id },
      }).select('id').single();
      if (roomErr) throw roomErr;
      roomId = room.id;

      await admin.from('chat_participants').insert([
        { room_id: roomId, user_id: match.member_a_id },
        { room_id: roomId, user_id: match.member_b_id },
      ]);
      await admin.from('tribal_hearts_matches').update({ chat_room_id: roomId }).eq('id', match_id);
    }

    // Generate icebreaker (best-effort — fall back to fixed copy)
    let opener = `🌸 You both said yes! Take your time, text first, and only move to voice or video when you both feel ready. Everything stays safely inside Sow2Grow.`;
    if (LOVABLE_API_KEY) {
      try {
        const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: [
              { role: 'system', content: 'You are Debian the Messenger for Sow2Grow Tribal Hearts. Write a single warm 1–2 sentence opener for a new mutual match. Family-friendly, respectful, hopeful. Remind them gently that they control the pace.' },
              { role: 'user', content: `Match reasons: ${JSON.stringify(match.match_reasons)}` },
            ],
          }),
        });
        if (resp.ok) {
          const j = await resp.json();
          const text = j.choices?.[0]?.message?.content?.trim();
          if (text) opener = text;
        }
      } catch (_) { /* keep fallback */ }
    }

    await admin.from('chat_messages').insert({
      room_id: roomId,
      sender_id: null,
      content: opener,
      message_type: 'system',
      ai_generated: true,
      system_metadata: { source: 'tribal_hearts_icebreaker', agent: 'debian' },
    });

    return new Response(JSON.stringify({ room_id: roomId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('hearts-icebreaker', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
