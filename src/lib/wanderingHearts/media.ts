import { supabase } from '@/integrations/supabase/client';
import { moderateStorageUpload, moderationRejectionMessage } from '@/lib/moderation/moderateUpload';

export class ModerationRejectedError extends Error {
  constructor(reason?: string) {
    super(moderationRejectionMessage(reason));
    this.name = 'ModerationRejectedError';
  }
}

/**
 * Uploads a recorded voice/video note to the tribal-hearts-media bucket and
 * returns a signed URL. Storage RLS (see migration 20260613075139 and
 * 20260902114500) only lets the uploader or their mutually-matched partner
 * read a given path, so the path must start with the uploader's own user
 * id -- same convention TribalHeartsOnboarding.tsx already uses for
 * profile photos.
 *
 * Video notes are scanned before signing, same reasoning as the photos
 * path: a signed URL is a bearer token storage RLS never re-checks, so
 * this call is the real gate, not just the RLS backstop. Voice notes are
 * audio-only -- Sightengine's nudity model has nothing to detect in an
 * audio waveform, so they're not scanned here (out of scope for this
 * feature; a spoken-word moderation pass would be a different tool).
 */
export async function uploadWanderingHeartsNote(
  userId: string,
  blob: Blob,
  kind: 'voice' | 'video',
): Promise<string> {
  const ext = kind === 'voice' ? 'webm' : 'webm';
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from('tribal-hearts-media')
    .upload(path, blob, { contentType: blob.type || (kind === 'voice' ? 'audio/webm' : 'video/webm') });
  if (error) throw error;

  if (kind === 'video') {
    const { verdict, reason } = await moderateStorageUpload('tribal-hearts-media', path, 'video');
    if (verdict !== 'allow') throw new ModerationRejectedError(reason);
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from('tribal-hearts-media')
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (signErr || !signed?.signedUrl) throw signErr ?? new Error('Could not create a signed URL for the recording.');
  return signed.signedUrl;
}
