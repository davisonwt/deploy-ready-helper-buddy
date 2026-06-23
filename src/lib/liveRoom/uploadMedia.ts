import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'chat-media';
const MAX_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME = new Set([
  'audio/webm',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
]);

export async function uploadLiveRoomMedia(
  roomId: string,
  blob: Blob,
  ext: string,
): Promise<{ path: string; signedUrl: string }> {
  if (blob.size > MAX_BYTES) {
    throw new Error(`File too large (${(blob.size / 1024 / 1024).toFixed(1)}MB). Max 50MB.`);
  }
  if (!ALLOWED_MIME.has(blob.type)) {
    throw new Error(`Unsupported media type "${blob.type || 'unknown'}". Allowed: audio/webm, video/webm, audio/mpeg, audio/wav.`);
  }
  const path = `${roomId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type,
    upsert: false,
  });
  if (error) throw error;
  const { data, error: sErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (sErr) throw sErr;
  return { path, signedUrl: data.signedUrl };
}

export async function signLiveRoomMedia(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 5);
  if (error) throw error;
  return data.signedUrl;
}
