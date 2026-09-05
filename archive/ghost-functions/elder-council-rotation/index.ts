// Elder Council Rotation - weekly cron
// Auto-seats top members by Tribal Score (Elder tier, score >= 750)
// Curated seats are left untouched.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ELDER_FLOOR = 750;
const MAX_AUTO_SEATS = 12;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Find top elders by tribal score
    const { data: topElders, error: scoreErr } = await supabase
      .from('tribal_scores')
      .select('user_id, score, tier')
      .gte('score', ELDER_FLOOR)
      .order('score', { ascending: false })
      .limit(MAX_AUTO_SEATS);

    if (scoreErr) throw scoreErr;

    const eligibleIds = new Set((topElders || []).map(e => e.user_id));

    // 2. Get current auto-seated council members
    const { data: currentAuto } = await supabase
      .from('elder_council_seats')
      .select('id, user_id')
      .eq('seat_type', 'auto')
      .eq('is_active', true);

    const currentAutoIds = new Set((currentAuto || []).map(s => s.user_id));

    // 3. Deactivate auto seats no longer eligible
    const toDeactivate = (currentAuto || []).filter(s => !eligibleIds.has(s.user_id));
    let deactivatedCount = 0;
    for (const seat of toDeactivate) {
      const { error } = await supabase
        .from('elder_council_seats')
        .update({ is_active: false })
        .eq('id', seat.id);
      if (!error) deactivatedCount++;
    }

    // 4. Seat newly eligible elders (auto)
    const toSeat = (topElders || []).filter(e => !currentAutoIds.has(e.user_id));
    const termEnds = new Date();
    termEnds.setDate(termEnds.getDate() + 28); // 4-week term

    let seatedCount = 0;
    for (const elder of toSeat) {
      const { error } = await supabase.from('elder_council_seats').insert({
        user_id: elder.user_id,
        seat_type: 'auto',
        term_ends_at: termEnds.toISOString(),
        is_active: true,
        notes: `Auto-seated with score ${elder.score}`,
      });
      if (!error) seatedCount++;
    }

    return new Response(JSON.stringify({
      ok: true,
      eligible_elders: topElders?.length || 0,
      seated: seatedCount,
      deactivated: deactivatedCount,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
