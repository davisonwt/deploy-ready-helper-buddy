import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'chat-media';

export async function uploadLiveRoomMedia(
  roomId: string,
  blob: Blob,
  ext: string,
): Promise<{ path: string; signedUrl: string }> {
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
