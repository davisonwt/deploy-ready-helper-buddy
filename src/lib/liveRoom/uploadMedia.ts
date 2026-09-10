import { supabase } from '@/integrations/supabase/client';
import { moderateStorageUpload, moderationRejectionMessage } from '@/lib/moderation/moderateUpload';

const BUCKET = 'chat-media';
const MAX_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME = new Set([
  'audio/webm',
  'audio/mp4',
  'video/webm',
  'video/webm;codecs=vp9',
  // iOS Safari's MediaRecorder only produces video/mp4 -- see
  // src/hooks/useMediaRecorder.ts's mimeType fallback chain.
  'video/mp4',
  'audio/mpeg',
  'audio/wav',
]);

export async function uploadChatMedia(
  roomId: string,
  blob: Blob,
  ext: string,
): Promise<{ path: string; signedUrl: string }> {
  if (blob.size > MAX_BYTES) {
    throw new Error(`File too large (${(blob.size / 1024 / 1024).toFixed(1)}MB). Max 50MB.`);
  }
  if (!ALLOWED_MIME.has(blob.type)) {
    throw new Error(`Unsupported media type "${blob.type || 'unknown'}". Allowed: ${[...ALLOWED_MIME].join(', ')}.`);
  }
  const path = `${roomId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type,
    upsert: false,
  });
  if (error) throw error;

  // Exact-string match on 'video/webm' would misclassify every other video
  // mimeType (video/mp4 from iOS Safari, the vp9-codec variant) as 'image'.
  const { verdict, reason } = await moderateStorageUpload(BUCKET, path, blob.type.startsWith('video/') ? 'video' : 'image');
  if (verdict !== 'allow') throw new Error(moderationRejectionMessage(reason));

  const { data, error: sErr } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (sErr) throw sErr;
  return { path, signedUrl: data.signedUrl };
}

// Backwards-compatible alias for OneOnOneRoom / live_rooms callers.
export const uploadLiveRoomMedia = uploadChatMedia;

export async function signChatMedia(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 5);
  if (error) throw error;
  return data.signedUrl;
}

export const signLiveRoomMedia = signChatMedia;

