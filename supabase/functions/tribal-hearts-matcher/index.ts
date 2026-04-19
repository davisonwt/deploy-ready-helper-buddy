// tribal-hearts-matcher — finds compatible opposite-gender matches for a member
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function score(a: any, b: any): { score: number; reasons: any[] } {
  const reasons: any[] = [];
  let s = 0;
  const sharedValues = (a.values_list || []).filter((v: string) => (b.values_list || []).includes(v));
  if (sharedValues.length) { s += sharedValues.length * 8; reasons.push({ kind: 'values', items: sharedValues }); }
  const sharedInterests = (a.interests || []).filter((v: string) => (b.interests || []).includes(v));
  if (sharedInterests.length) { s += sharedInterests.length * 5; reasons.push({ kind: 'interests', items: sharedInterests }); }
  if (a.location_country && a.location_country === b.location_country) { s += 10; reasons.push({ kind: 'country' }); }
  if (a.location_region && a.location_region === b.location_region) { s += 8; reasons.push({ kind: 'region' }); }
  if (a.timezone && a.timezone === b.timezone) { s += 4; reasons.push({ kind: 'timezone' }); }
  return { score: Math.min(99, s), reasons };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const auth = req.headers.get('Authorization') || '';
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: me } = await admin.from('tribal_hearts_profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (!me || me.status !== 'active') return new Response(JSON.stringify({ created: 0, reason: 'profile not active' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Find blocks both directions
    const { data: blocks } = await admin.from('tribal_hearts_blocks').select('blocker_id,blocked_id').or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
    const blockedIds = new Set<string>();
    (blocks || []).forEach(b => { blockedIds.add(b.blocker_id); blockedIds.add(b.blocked_id); });
    blockedIds.delete(user.id);

    // Existing matches to skip
    const { data: existing } = await admin.from('tribal_hearts_matches').select('member_a_id,member_b_id').or(`member_a_id.eq.${user.id},member_b_id.eq.${user.id}`);
    const existingIds = new Set<string>();
    (existing || []).forEach(m => { existingIds.add(m.member_a_id); existingIds.add(m.member_b_id); });

    // Pull candidates of opposite gender
    const { data: candidates } = await admin
      .from('tribal_hearts_profiles')
      .select('*')
      .eq('gender', me.seeking)
      .eq('status', 'active')
      .neq('user_id', user.id)
      .limit(200);

    const scored = (candidates || [])
      .filter(c => !blockedIds.has(c.user_id) && !existingIds.has(c.user_id))
      .map(c => ({ c, ...score(me, c) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    let created = 0;
    for (const m of scored) {
      const malePart = me.gender === 'male' ? user.id : m.c.user_id;
      const femalePart = me.gender === 'female' ? user.id : m.c.user_id;
      const { error } = await admin.from('tribal_hearts_matches').insert({
        member_a_id: malePart,
        member_b_id: femalePart,
        compatibility_score: m.score,
        match_reasons: m.reasons,
      });
      if (!error) created++;
    }

    return new Response(JSON.stringify({ created }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('hearts-matcher', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
