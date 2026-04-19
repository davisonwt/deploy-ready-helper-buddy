// agent-gentoo-mentorship-matcher
// Pairs mentees (low tribal_score in a focus area) with mentors (high tribal_score)
// from the same circles. Creates suggested rows in mentorship_pairings.
//
// Modes:
//   - "scan_user"  → suggest pairings FOR a specific user (called from UI)
//   - "scan_all"   → batch scan (called from cron)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const FOCUS_AREAS = ['orchard_growth', 'sales_velocity', 'community_building', 'spiritual_walk'] as const;
type FocusArea = typeof FOCUS_AREAS[number];

interface ScoreRow {
  user_id: string;
  score: number;
  tier: string;
  orchards_count: number;
  bestowals_given_count: number;
  tribe_size: number;
  reviews_avg_rating: number;
}

function pickFocusForMentee(s: ScoreRow): FocusArea {
  // Pick the weakest area
  if (s.orchards_count < 2) return 'orchard_growth';
  if (s.bestowals_given_count < 5) return 'sales_velocity';
  if (s.tribe_size < 3) return 'community_building';
  return 'spiritual_walk';
}

function pickFocusForMentor(s: ScoreRow): FocusArea[] {
  // Mentors offer their strongest areas (lowered floors so early-stage mentors qualify)
  const out: FocusArea[] = [];
  if (s.orchards_count >= 2) out.push('orchard_growth');
  if (s.bestowals_given_count >= 3) out.push('sales_velocity');
  if (s.tribe_size >= 2) out.push('community_building');
  if (s.reviews_avg_rating >= 4.0) out.push('spiritual_walk');
  return out.length ? out : ['community_building'];
}

function scoreMatch(mentor: ScoreRow, mentee: ScoreRow, focus: FocusArea, sharedCircles: number): number {
  const tierGap = mentor.score - mentee.score; // bigger = better mentor
  const tierBonus = Math.min(tierGap / 10, 30); // up to 30
  const focusBonus =
    focus === 'orchard_growth' ? mentor.orchards_count * 2 :
    focus === 'sales_velocity' ? mentor.bestowals_given_count :
    focus === 'community_building' ? mentor.tribe_size * 2 :
    mentor.reviews_avg_rating * 10;
  const circleBonus = sharedCircles * 5;
  const total = 40 + tierBonus + Math.min(focusBonus, 20) + Math.min(circleBonus, 10);
  return Math.min(Math.max(total, 0), 100);
}

async function findCandidatesForMentee(
  supabase: any,
  menteeId: string,
  menteeScore: ScoreRow,
  limit = 3
) {
  const focus = pickFocusForMentee(menteeScore);

  // Mentors must score higher than the mentee AND meet a low floor (100)
  // — keeps pairings meaningful while letting an early-stage tribe generate real matches
  const MENTOR_FLOOR = 100;
  const minMentorScore = Math.max(MENTOR_FLOOR, (menteeScore.score ?? 0) + 25);
  const { data: mentors } = await supabase
    .from('tribal_scores')
    .select('user_id, score, tier, orchards_count, bestowals_given_count, tribe_size, reviews_avg_rating')
    .gte('score', minMentorScore)
    .neq('user_id', menteeId)
    .order('score', { ascending: false })
    .limit(20);

  if (!mentors || mentors.length === 0) return [];

  // Get mentee's circles
  const { data: myCircles } = await supabase
    .from('circle_members')
    .select('circle_id')
    .eq('user_id', menteeId);
  const menteeCircleIds = new Set((myCircles ?? []).map((c: any) => c.circle_id));

  // Filter & rank
  const ranked = await Promise.all(
    (mentors as ScoreRow[]).map(async (m) => {
      const offers = pickFocusForMentor(m);
      if (!offers.includes(focus)) return null;

      const { data: theirCircles } = await supabase
        .from('circle_members')
        .select('circle_id')
        .eq('user_id', m.user_id);
      const shared = (theirCircles ?? []).filter((c: any) => menteeCircleIds.has(c.circle_id)).length;

      const score = scoreMatch(m, menteeScore, focus, shared);
      return { mentor: m, focus, score, shared };
    })
  );

  return ranked
    .filter(Boolean)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, limit);
}

async function createPairing(
  supabase: any,
  mentorId: string,
  menteeId: string,
  focus: FocusArea,
  matchScore: number,
  reasoning: string
) {
  // Idempotent: skip if exists
  const { data: existing } = await supabase
    .from('mentorship_pairings')
    .select('id')
    .eq('mentor_id', mentorId)
    .eq('mentee_id', menteeId)
    .eq('focus_area', focus)
    .maybeSingle();
  if (existing) return null;

  const { data, error } = await supabase
    .from('mentorship_pairings')
    .insert({
      mentor_id: mentorId,
      mentee_id: menteeId,
      focus_area: focus,
      cadence: 'weekly',
      status: 'suggested',
      match_score: matchScore,
      match_reasoning: reasoning,
    })
    .select()
    .single();
  if (error) {
    console.error('[mentorship-matcher] insert error', error);
    return null;
  }
  return data;
}

const FOCUS_LABEL: Record<FocusArea, string> = {
  orchard_growth: '🌳 growing your first orchards',
  sales_velocity: '💰 turning seeds into sales',
  community_building: '🤝 building your tribe',
  spiritual_walk: '🌟 walking in faith and wisdom',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode ?? 'scan_user';
    const userId: string | undefined = body.user_id;
    const created: any[] = [];

    if (mode === 'scan_user') {
      if (!userId) {
        return new Response(JSON.stringify({ error: 'user_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: menteeScore } = await supabase
        .from('tribal_scores')
        .select('user_id, score, tier, orchards_count, bestowals_given_count, tribe_size, reviews_avg_rating')
        .eq('user_id', userId)
        .maybeSingle();

      if (!menteeScore) {
        return new Response(JSON.stringify({ ok: true, created: 0, note: 'No tribal score yet' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const cands = await findCandidatesForMentee(supabase, userId, menteeScore as ScoreRow, 3);
      for (const c of cands as any[]) {
        const reasoning = `Gentoo paired you on ${FOCUS_LABEL[c.focus as FocusArea]}. They share ${c.shared} of your tribal circle${c.shared === 1 ? '' : 's'} and have walked this path further.`;
        const p = await createPairing(supabase, c.mentor.user_id, userId, c.focus, c.score, reasoning);
        if (p) created.push(p);
      }
    } else if (mode === 'scan_all') {
      // Find mentees: score < 250 (seedling/sprout)
      const { data: mentees } = await supabase
        .from('tribal_scores')
        .select('user_id, score, tier, orchards_count, bestowals_given_count, tribe_size, reviews_avg_rating')
        .lt('score', 250)
        .order('score', { ascending: false })
        .limit(20);

      for (const m of (mentees ?? []) as ScoreRow[]) {
        const cands = await findCandidatesForMentee(supabase, m.user_id, m, 1);
        for (const c of cands as any[]) {
          const reasoning = `Gentoo paired you on ${FOCUS_LABEL[c.focus as FocusArea]}. They share ${c.shared} of your tribal circle${c.shared === 1 ? '' : 's'} and have walked this path further.`;
          const p = await createPairing(supabase, c.mentor.user_id, m.user_id, c.focus, c.score, reasoning);
          if (p) created.push(p);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, created: created.length, pairings: created }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[mentorship-matcher] error', e);
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
