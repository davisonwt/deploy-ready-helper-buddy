// Grove Station DJ Slots, Phase 1 -- the playout override radio-stream and
// radio-now-playing both consult BEFORE falling back to the normal
// autopilot (computeCurrentTrack/fetchRadioTracks in radioSchedule.ts).
// Reads radio_slots/radio_rundown_segments ONLY -- the old radio_schedule
// approval-gated table is not consulted for anything that airs.
//
// Design: a slot is a 2h window. If `now` falls inside a scheduled slot's
// window AND inside the sum of its segments' real durations, that segment
// (at the right mid-segment offset, for a mid-slot join) overrides
// autopilot. Once elapsed-in-slot exceeds the segment total (a rundown
// shorter than 2h) or no slot is scheduled at all, this resolver returns
// null and the caller falls through to exact-unchanged autopilot -- this
// is also how "shortfall allowed, autopilot pads the remainder" and "no
// scheduled show -> exact current autopilot" both fall out for free,
// without a special case for either.

export type SegmentKind = 'opening' | 'talk' | 'song' | 'advert' | 'jingle' | 'handover';

export interface SlotSegmentOverride {
  id: string;
  kind: SegmentKind;
  offsetSeconds: number;
  durationSeconds: number;
  trackProductId: string | null; // set only for kind === 'song'
  audioPath: string | null; // set for every non-song kind
  imagePath: string | null;
  docPath: string | null;
  notes: string | null;
}

export interface SlotOverride {
  slotId: string;
  djUserId: string;
  djName: string;
  djUsername: string | null;
  showTitle: string | null;
  mode: 'live' | 'prerecorded';
  adPrice: number | null;
  segment: SlotSegmentOverride;
}

const SLOT_SECONDS = 7200;

// deno-lint-ignore no-explicit-any
export async function resolveSlotOverride(service: any, nowMs: number): Promise<SlotOverride | null> {
  const nowSeconds = Math.floor(nowMs / 1000);
  const nowIso = new Date(nowMs).toISOString();
  const windowStartIso = new Date(nowMs - SLOT_SECONDS * 1000).toISOString();

  const { data: slots, error: slotsError } = await service
    .from('radio_slots')
    .select('id, dj_user_id, title, starts_at, mode, ad_price')
    .eq('status', 'scheduled')
    .lte('starts_at', nowIso)
    .gte('starts_at', windowStartIso)
    .order('starts_at', { ascending: false })
    .limit(1);
  if (slotsError) throw slotsError;
  const slot = (slots ?? [])[0] as
    | { id: string; dj_user_id: string; title: string | null; starts_at: string; mode: 'live' | 'prerecorded'; ad_price: number | null }
    | undefined;
  if (!slot) return null;

  const startsAtSeconds = Math.floor(new Date(slot.starts_at).getTime() / 1000);
  if (nowSeconds >= startsAtSeconds + SLOT_SECONDS) return null; // window already ended
  const elapsedInSlot = nowSeconds - startsAtSeconds;

  const { data: segments, error: segmentsError } = await service
    .from('radio_rundown_segments')
    .select('id, kind, duration_seconds, track_product_id, audio_path, image_path, doc_path, notes')
    .eq('slot_id', slot.id)
    .order('position', { ascending: true });
  if (segmentsError) throw segmentsError;
  const rows = (segments ?? []) as Array<{
    id: string; kind: SegmentKind; duration_seconds: number; track_product_id: string | null;
    audio_path: string | null; image_path: string | null; doc_path: string | null; notes: string | null;
  }>;
  if (rows.length === 0) return null;

  let pos = elapsedInSlot;
  let current: (typeof rows)[number] | null = null;
  let offsetSeconds = 0;
  for (const row of rows) {
    if (pos < row.duration_seconds) {
      current = row;
      offsetSeconds = pos;
      break;
    }
    pos -= row.duration_seconds;
  }
  if (!current) return null; // shortfall -- rundown finished before slot end, autopilot pads the rest

  const { data: profile } = await service
    .from('profiles_public')
    .select('display_name, first_name, username')
    .eq('user_id', slot.dj_user_id)
    .maybeSingle();
  const djName = profile?.display_name?.trim() || profile?.first_name?.trim() || profile?.username?.trim() || 'A DJ';

  return {
    slotId: slot.id,
    djUserId: slot.dj_user_id,
    djName,
    djUsername: profile?.username?.trim() || null,
    showTitle: slot.title,
    mode: slot.mode,
    adPrice: slot.ad_price,
    segment: {
      id: current.id,
      kind: current.kind,
      offsetSeconds,
      durationSeconds: current.duration_seconds,
      trackProductId: current.track_product_id,
      audioPath: current.audio_path,
      imagePath: current.image_path,
      docPath: current.doc_path,
      notes: current.notes,
    },
  };
}

export interface ResolvedSongTrack {
  id: string;
  title: string;
  sowerUserId: string;
  sowerName: string;
  sowerUsername: string | null;
  cover: string | null;
  durationSeconds: number;
  price: number | null;
}

/** Same shape/lookup as fetchRadioTracks() in radioSchedule.ts, for one product id -- used to resolve a rundown 'song' segment's full sower info. */
// deno-lint-ignore no-explicit-any
export async function resolveSongTrack(service: any, productId: string): Promise<ResolvedSongTrack | null> {
  const { data: product, error: productError } = await service
    .from('products')
    .select('id, title, duration, cover_image_url, sower_id, price')
    .eq('id', productId)
    .maybeSingle();
  if (productError || !product) return null;

  const { data: sower } = await service.from('sowers').select('user_id').eq('id', product.sower_id).maybeSingle();
  if (!sower?.user_id) return null;

  const { data: profile } = await service
    .from('profiles_public')
    .select('display_name, first_name, username')
    .eq('user_id', sower.user_id)
    .maybeSingle();
  const sowerName = profile?.display_name?.trim() || profile?.first_name?.trim() || profile?.username?.trim() || 'A sower';

  return {
    id: product.id,
    title: product.title,
    sowerUserId: sower.user_id,
    sowerName,
    sowerUsername: profile?.username?.trim() || null,
    cover: product.cover_image_url,
    durationSeconds: product.duration,
    price: product.price,
  };
}
