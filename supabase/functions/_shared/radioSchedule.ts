// Grove Station's playout schedule -- the one piece of logic that MUST
// give identical answers to every caller, so it lives here once and is
// imported by both radio-now-playing (metadata for the now-playing card)
// and radio-stream (the actual audio relay). Neither may recompute this
// independently -- that's how they'd disagree about what's "live."
//
// Deterministic, no stored schedule row, no cron job: the whole track
// pool is treated as one repeating cycle, and "what's live right now" is
// a pure function of (the pool, in a stable order) and wall-clock time.
// A fresh upload extends the cycle immediately for everyone, equally --
// there is nothing to regenerate.
//
// Known, accepted limitation (not hidden): because the order and each
// track's duration are stable and knowable, a determined listener could
// compute in advance exactly when their song of choice will next be
// "live" and simply wait for it, then use radio-stream at that moment.
// This is the same property real scheduled radio has always had (a
// station's rotation is not a secret) and is not the thing Davison's rule
// is against -- that rule is about an interface that lets someone pick
// any song on demand. radio-stream never accepts a track selection from
// the caller; it only ever serves whatever this function says is live.

export interface RadioTrack {
  id: string;
  title: string;
  durationSeconds: number;
  sowerUserId: string;
  sowerName: string;
  sowerUsername: string | null;
  cover: string | null;
  price: number | null;
}

export interface CurrentTrack {
  track: RadioTrack;
  offsetSeconds: number;
  index: number;
  cycleSeconds: number;
}

/** Stable order (created_at, id) -- must never change between calls for the same underlying rows, or two callers a moment apart could compute different "current" tracks from the same track list. */
export function computeCurrentTrack(tracks: RadioTrack[], nowMs: number): CurrentTrack | null {
  if (tracks.length === 0) return null;
  const cycleSeconds = tracks.reduce((sum, t) => sum + t.durationSeconds, 0);
  if (cycleSeconds <= 0) return null;

  const nowSeconds = Math.floor(nowMs / 1000);
  let pos = nowSeconds % cycleSeconds;
  for (let i = 0; i < tracks.length; i++) {
    const d = tracks[i].durationSeconds;
    if (pos < d) {
      return { track: tracks[i], offsetSeconds: pos, index: i, cycleSeconds };
    }
    pos -= d;
  }
  // Floating-point/rounding fallback -- land on the last track rather than
  // returning null, which would show as dead air for no real reason.
  const last = tracks[tracks.length - 1];
  return { track: last, offsetSeconds: Math.max(0, last.durationSeconds - 1), index: tracks.length - 1, cycleSeconds };
}

// deno-lint-ignore no-explicit-any
export async function fetchRadioTracks(service: any): Promise<RadioTrack[]> {
  // Two-step fetch-then-merge (same pattern useConversations.ts uses)
  // rather than a nested PostgREST embed through sowers -> profiles_public
  // -- that embed's FK path isn't guaranteed inferrable through a view,
  // and this is only 3 small queries against a pool that tops out at a
  // few hundred rows.
  const { data: products, error: productsError } = await service
    .from('products')
    .select('id, title, duration, cover_image_url, sower_id, price')
    .eq('type', 'music')
    .eq('status', 'active')
    .gt('duration', 0)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });
  if (productsError) throw productsError;
  const rows = (products ?? []) as Array<{ id: string; title: string; duration: number; cover_image_url: string | null; sower_id: string; price: number | null }>;
  if (rows.length === 0) return [];

  const sowerIds = [...new Set(rows.map((r) => r.sower_id).filter(Boolean))];
  const { data: sowers, error: sowersError } = await service
    .from('sowers')
    .select('id, user_id')
    .in('id', sowerIds);
  if (sowersError) throw sowersError;
  const userIdBySowerId = new Map((sowers ?? []).map((s: { id: string; user_id: string }) => [s.id, s.user_id]));

  const userIds = [...new Set([...userIdBySowerId.values()])];
  const { data: profiles, error: profilesError } = await service
    .from('profiles_public')
    .select('user_id, display_name, first_name, username')
    .in('user_id', userIds);
  if (profilesError) throw profilesError;
  const profileByUserId = new Map((profiles ?? []).map((p: { user_id: string; display_name: string | null; first_name: string | null; username: string | null }) => [p.user_id, p]));

  const tracks: RadioTrack[] = [];
  for (const row of rows) {
    const sowerUserId = userIdBySowerId.get(row.sower_id);
    if (!sowerUserId) continue;
    const p = profileByUserId.get(sowerUserId);
    const sowerName = p?.display_name?.trim() || p?.first_name?.trim() || p?.username?.trim() || 'A sower';
    tracks.push({
      id: row.id,
      title: row.title,
      durationSeconds: row.duration,
      sowerUserId,
      sowerName,
      sowerUsername: p?.username?.trim() || null,
      cover: row.cover_image_url,
      price: row.price,
    });
  }
  return tracks;
}
