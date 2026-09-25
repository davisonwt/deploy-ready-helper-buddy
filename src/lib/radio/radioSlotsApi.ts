import { supabase } from '@/integrations/supabase/client';
import { ensureFreshSession } from '@/lib/payments/invokeFunction';
import * as tus from 'tus-js-client';

export type SlotMode = 'live' | 'prerecorded';
export type SlotStatus = 'draft' | 'submitted' | 'scheduled' | 'aired' | 'cancelled';
export type SegmentKind = 'opening' | 'talk' | 'song' | 'advert' | 'jingle' | 'handover' | 'show';

export const SLOT_SECONDS = 7200;

/**
 * Calls a Grove Station edge function. Radio functions return
 * { error: <code>, message: <plain sentence> }; the sentence is what the
 * member sees, never the code.
 */
export async function invokeRadioFunction<T>(name: string, body: unknown): Promise<T> {
  const session = await ensureFreshSession();
  if (!session?.access_token) throw new Error('Your session has expired. Sign in again and retry.');
  const { data, error } = await supabase.functions.invoke(name, { body: body as Record<string, unknown> });
  if (error) {
    let message = error.message;
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const parsed = await ctx.json();
        message = parsed?.message || parsed?.error || message;
      } catch { /* keep the generic message */ }
    }
    throw new Error(message);
  }
  return data as T;
}

export interface RadioSlot {
  id: string;
  dj_user_id: string;
  title: string | null;
  starts_at: string;
  mode: SlotMode;
  status: SlotStatus;
  ad_price: number | null;
  created_at: string;
  cancel_reason?: string | null;
  cancelled_at?: string | null;
  scheduled_at?: string | null;
}

export interface RundownSegment {
  id: string;
  slot_id: string;
  position: number;
  kind: SegmentKind;
  duration_seconds: number;
  track_product_id: string | null;
  /** Snapshotted at add time (2026-09-20) -- a sower deleting their own
   *  song nulls track_product_id (ON DELETE SET NULL) rather than being
   *  blocked; this survives that so the builder can still show what the
   *  segment used to be. */
  track_title_snapshot: string | null;
  audio_path: string | null;
  doc_path: string | null;
  image_path: string | null;
  notes: string | null;
}

export interface SongOption {
  id: string;
  title: string;
  durationSeconds: number;
  sowerName: string;
  sowerUsername: string | null;
  cover: string | null;
}

/** Every even 2h UTC boundary from the next one through `days` out. */
export function upcomingBoundaries(days = 14, fromMs = Date.now()): Date[] {
  const next = Math.ceil(fromMs / (SLOT_SECONDS * 1000)) * (SLOT_SECONDS * 1000);
  const count = Math.floor((days * 24) / 2);
  return Array.from({ length: count }, (_, i) => new Date(next + i * SLOT_SECONDS * 1000));
}

export async function fetchUpcomingSlots(fromIso: string, toIso: string): Promise<RadioSlot[]> {
  const { data, error } = await supabase
    .from('radio_slots')
    .select('*')
    .gte('starts_at', fromIso)
    .lte('starts_at', toIso)
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as RadioSlot[];
}

export async function fetchMySlots(userId: string): Promise<RadioSlot[]> {
  const { data, error } = await supabase
    .from('radio_slots')
    .select('*')
    .eq('dj_user_id', userId)
    .neq('status', 'cancelled')
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as RadioSlot[];
}

/** Live hosting is not built yet; every booking is pre-recorded (the insert policy enforces it too). */
export async function bookSlot(djUserId: string, startsAt: Date, title: string | null): Promise<RadioSlot> {
  const { data, error } = await supabase
    .from('radio_slots')
    .insert({ dj_user_id: djUserId, starts_at: startsAt.toISOString(), mode: 'prerecorded', title, status: 'draft' })
    .select('*')
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('That slot was just taken — pick another.');
    throw error;
  }
  return data as RadioSlot;
}

export async function cancelSlot(slotId: string): Promise<void> {
  const { error } = await supabase.from('radio_slots').update({ status: 'cancelled' }).eq('id', slotId);
  if (error) {
    // The 24h-notice guard lives in the UPDATE policy's WITH CHECK — a
    // late cancel comes back as a generic RLS violation, not a friendly
    // message, so translate it here.
    if (error.code === '42501' || /row-level security/i.test(error.message)) {
      throw new Error("Slots can only be cancelled 24 hours or more before they start.");
    }
    throw error;
  }
}

export async function fetchSlotWithSegments(slotId: string): Promise<{ slot: RadioSlot; segments: RundownSegment[] }> {
  const [{ data: slot, error: slotError }, { data: segments, error: segmentsError }] = await Promise.all([
    supabase.from('radio_slots').select('*').eq('id', slotId).single(),
    supabase.from('radio_rundown_segments').select('*').eq('slot_id', slotId).order('position', { ascending: true }),
  ]);
  if (slotError) throw slotError;
  if (segmentsError) throw segmentsError;
  return { slot: slot as RadioSlot, segments: (segments ?? []) as RundownSegment[] };
}

export async function addSongSegment(slotId: string, position: number, track: SongOption): Promise<RundownSegment> {
  const { data, error } = await supabase
    .from('radio_rundown_segments')
    .insert({
      slot_id: slotId, position, kind: 'song',
      duration_seconds: track.durationSeconds, track_product_id: track.id,
      track_title_snapshot: track.title,
    })
    .select('*').single();
  if (error) throw error;
  return data as RundownSegment;
}

export async function addAudioSegment(
  slotId: string, position: number, kind: Exclude<SegmentKind, 'song'>,
  audioPath: string, durationSeconds: number, notes: string | null,
): Promise<RundownSegment> {
  const { data, error } = await supabase
    .from('radio_rundown_segments')
    .insert({ slot_id: slotId, position, kind, audio_path: audioPath, duration_seconds: durationSeconds, notes })
    .select('*').single();
  if (error) throw error;
  return data as RundownSegment;
}

export async function updateSegmentAttachments(segmentId: string, fields: { doc_path?: string | null; image_path?: string | null; notes?: string | null }): Promise<void> {
  const { error } = await supabase.from('radio_rundown_segments').update(fields).eq('id', segmentId);
  if (error) throw error;
}

export async function deleteSegment(segmentId: string): Promise<void> {
  const { data, error } = await supabase.from('radio_rundown_segments').delete().eq('id', segmentId).select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('That segment could not be removed. The rundown may already be submitted; reload to check.');
}

/**
 * Renumbers `position` for every segment in a slot to match the given
 * order, in one database statement (reorder_radio_rundown), so a swap
 * never collides with the (slot_id, position) unique constraint and a
 * failure is reported instead of leaving the screen out of step.
 */
export async function reorderSegments(slotId: string, orderedIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_radio_rundown', { p_slot_id: slotId, p_ordered_ids: orderedIds });
  if (error) throw new Error(error.message || "Couldn't save the new order.");
}

/** Removes a segment and closes the gap in positions. */
export async function removeSegment(slotId: string, segmentId: string, remainingIds: string[]): Promise<void> {
  await deleteSegment(segmentId);
  await reorderSegments(slotId, remainingIds);
}

function extOf(file: File): string {
  return file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
}

/** The bucket's own per-file cap (150 MB) -- a 2-hour 128 kbps MP3 is about 115 MB. */
export const MAX_AUDIO_BYTES = 150 * 1024 * 1024;

const SUPABASE_PROJECT_REF = 'zuwkgasbkpjlxzsjzumu';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';
// Supabase requires exactly 6 MB chunks for resumable uploads.
const TUS_CHUNK_BYTES = 6 * 1024 * 1024;

/**
 * Resumable (TUS) upload into dj-rundown-segments, so a long show survives
 * a dropped mobile connection: tus-js-client retries each 6 MB chunk and
 * resumes from the last acknowledged offset instead of starting over.
 */
function tusUpload(path: string, file: File, accessToken: string, onProgress?: (fraction: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `https://${SUPABASE_PROJECT_REF}.storage.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000, 10000, 20000, 30000],
      headers: { authorization: `Bearer ${accessToken}`, apikey: SUPABASE_PUBLISHABLE_KEY, 'x-upsert': 'false' },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      chunkSize: TUS_CHUNK_BYTES,
      metadata: {
        bucketName: 'dj-rundown-segments',
        objectName: path,
        contentType: file.type || (path.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg'),
        cacheControl: '3600',
      },
      onError: (err) => reject(new Error(`Upload failed: ${err.message}`)),
      onProgress: (sent, total) => onProgress?.(total > 0 ? sent / total : 0),
      onSuccess: () => resolve(),
    });
    upload.findPreviousUploads().then((previous) => {
      if (previous.length > 0) upload.resumeFromPreviousUpload(previous[0]);
      upload.start();
    }).catch(reject);
  });
}

export async function uploadSegmentAudio(
  userId: string, slotId: string, file: File, onProgress?: (fraction: number) => void,
): Promise<{ path: string; durationSeconds: number }> {
  const ext = extOf(file);
  if (ext !== 'wav' && ext !== 'mp3') {
    throw new Error("That file type isn't supported — use WAV or MP3.");
  }
  if (file.size > MAX_AUDIO_BYTES) {
    throw new Error(`That file is ${(file.size / 1024 / 1024).toFixed(0)} MB; the limit is 150 MB. A 2-hour MP3 at 128 kbps is about 115 MB, so export at 128 kbps or lower.`);
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Your session has expired. Sign in again, then retry the upload.');
  const path = `${userId}/${slotId}/${Date.now()}.${ext}`;
  await tusUpload(path, file, session.access_token, onProgress);

  const { durationSeconds } = await invokeRadioFunction<{ durationSeconds: number }>('probe-audio-duration', { path, bucket: 'dj-rundown-segments' });
  return { path, durationSeconds };
}

export async function uploadSegmentFile(userId: string, slotId: string, file: File, allowed: string[]): Promise<string> {
  const ext = extOf(file);
  if (!allowed.includes(ext)) {
    throw new Error(`That file type isn't supported. Allowed: ${allowed.join(', ')}.`);
  }
  const path = `${userId}/${slotId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('dj-rundown-segments').upload(path, file, { upsert: false });
  if (uploadError) throw uploadError;
  return path;
}

export async function searchSongPool(query: string): Promise<SongOption[]> {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, title, duration, cover_image_url, sower_id')
    .eq('type', 'music')
    .eq('status', 'active')
    .gt('duration', 0)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  const rows = (products ?? []) as Array<{ id: string; title: string; duration: number; cover_image_url: string | null; sower_id: string }>;
  if (rows.length === 0) return [];

  const sowerIds = [...new Set(rows.map((r) => r.sower_id).filter(Boolean))];
  const { data: sowers } = await supabase.from('sowers').select('id, user_id').in('id', sowerIds);
  const userIdBySowerId = new Map((sowers ?? []).map((s: any) => [s.id, s.user_id]));
  const userIds = [...new Set([...userIdBySowerId.values()])];
  const { data: profiles } = await supabase.from('profiles_public').select('user_id, display_name, first_name, username').in('user_id', userIds);
  const profileByUserId = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));

  const options: SongOption[] = rows.map((row) => {
    const sowerUserId = userIdBySowerId.get(row.sower_id);
    const p = sowerUserId ? profileByUserId.get(sowerUserId) : null;
    const sowerName = p?.display_name?.trim() || p?.first_name?.trim() || p?.username?.trim() || 'A sower';
    return {
      id: row.id, title: row.title, durationSeconds: row.duration,
      sowerName, sowerUsername: p?.username?.trim() || null, cover: row.cover_image_url,
    };
  });

  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter((o) => o.title.toLowerCase().includes(q) || o.sowerName.toLowerCase().includes(q));
}

export async function submitSlot(slotId: string): Promise<{ ok: true; totalSeconds: number; shortfallSeconds: number }> {
  return invokeRadioFunction('submit-radio-slot', { slotId });
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export async function staffCancelSlot(slotId: string, reason: string): Promise<{ ok: true; notified: boolean }> {
  return invokeRadioFunction('cancel-radio-slot', { slotId, reason });
}
