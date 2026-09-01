import { supabase } from '@/integrations/supabase/client';

/**
 * Uploads a recorded voice/video note to the tribal-hearts-media bucket and
 * returns a signed URL. Storage RLS (see migration 20260613075139) only
 * lets the uploader or their mutually-matched partner read a given path, so
 * the path must start with the uploader's own user id -- same convention
 * TribalHeartsOnboarding.tsx already uses for profile photos.
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

  const { data: signed, error: signErr } = await supabase.storage
    .from('tribal-hearts-media')
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (signErr || !signed?.signedUrl) throw signErr ?? new Error('Could not create a signed URL for the recording.');
  return signed.signedUrl;
}
