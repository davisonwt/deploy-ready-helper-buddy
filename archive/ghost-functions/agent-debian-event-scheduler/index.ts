// agent-debian-event-scheduler
// Weekly cron (Sunday 06:00 UTC) — auto-creates one Virtual Market and one Seed Swap
// per active circle (>= 3 members) for the upcoming week, idempotently.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CircleRow { id: string; name: string }

function nextDow(dow: number, hour: number): Date {
  // dow: 0=Sun..6=Sat. Returns next occurrence in UTC at given hour.
  const d = new Date();
  const today = d.getUTCDay();
  const diff = (dow - today + 7) % 7 || 7; // strictly future
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const created: any[] = [];

  try {
    // 1. Find active circles with >= 3 members
    const { data: circles, error: circlesErr } = await supabase
      .from('circles')
      .select('id, name')
      .limit(50);
    if (circlesErr) throw circlesErr;

    for (const circle of (circles ?? []) as CircleRow[]) {
      const { count } = await supabase
        .from('circle_members')
        .select('id', { count: 'exact', head: true })
        .eq('circle_id', circle.id);
      if (!count || count < 3) continue;

      // pick a host: most-recent member of this circle
      const { data: hostRow } = await supabase
        .from('circle_members')
        .select('user_id')
        .eq('circle_id', circle.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!hostRow?.user_id) continue;

      // 2. Virtual Market — Saturday 16:00 UTC
      const marketStart = nextDow(6, 16).toISOString();
      const { data: existingMarket } = await supabase
        .from('tribal_events')
        .select('id')
        .eq('circle_id', circle.id)
        .eq('event_type', 'virtual_market')
        .gte('starts_at', new Date().toISOString())
        .lte('starts_at', new Date(Date.now() + 8 * 86400_000).toISOString())
        .maybeSingle();

      if (!existingMarket) {
        const { data: m, error } = await supabase
          .from('tribal_events')
          .insert({
            event_type: 'virtual_market',
            title: `${circle.name} Virtual Market`,
            description: `Weekly tribal market — bring your seeds, share your harvest, meet fellow ${circle.name} members.`,
            host_id: hostRow.user_id,
            circle_id: circle.id,
            starts_at: marketStart,
            duration_minutes: 90,
            capacity: 100,
            is_auto_generated: true,
            status: 'scheduled',
            metadata: { auto_source: 'agent-debian-event-scheduler' },
          })
          .select()
          .single();
        if (!error && m) created.push(m);
      }

      // 3. Seed Swap — Wednesday 18:00 UTC
      const swapStart = nextDow(3, 18).toISOString();
      const { data: existingSwap } = await supabase
        .from('tribal_events')
        .select('id')
        .eq('circle_id', circle.id)
        .eq('event_type', 'seed_swap')
        .gte('starts_at', new Date().toISOString())
        .lte('starts_at', new Date(Date.now() + 8 * 86400_000).toISOString())
        .maybeSingle();

      if (!existingSwap) {
        const { data: s, error } = await supabase
          .from('tribal_events')
          .insert({
            event_type: 'seed_swap',
            title: `${circle.name} Seed Swap`,
            description: `Trade physical or digital seeds with the ${circle.name} tribe. Bring 1, take 1.`,
            host_id: hostRow.user_id,
            circle_id: circle.id,
            starts_at: swapStart,
            duration_minutes: 60,
            capacity: 50,
            is_auto_generated: true,
            status: 'scheduled',
            metadata: { auto_source: 'agent-debian-event-scheduler' },
          })
          .select()
          .single();
        if (!error && s) created.push(s);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, created_count: created.length, created }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e: any) {
    console.error('[event-scheduler] error', e);
    return new Response(
      JSON.stringify({ ok: false, error: e?.message ?? 'unknown' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
