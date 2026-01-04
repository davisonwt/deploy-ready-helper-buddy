import { supabase } from '@/integrations/supabase/client';

type ResolveAudioUrlOptions = {
  /** When the input is a bare object key (not a full URL), attempt signing from this bucket. */
  bucketForKeys?: string;
  /** Signed URL TTL in seconds. */
  expiresIn?: number;
};

function parseSupabaseStorageObjectUrl(input: string): { bucket: string; key: string } | null {
  try {
    const u = new URL(input);
    const marker = '/storage/v1/object/';
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;

    const after = u.pathname.slice(idx + marker.length);
    const parts = after.split('/').filter(Boolean);
    if (parts.length < 2) return null;

    // Supports both:
    // - /storage/v1/object/public/<bucket>/<key>
    // - /storage/v1/object/<bucket>/<key>
    if (parts[0] === 'public') parts.shift();

    const bucket = parts.shift();
    if (!bucket) return null;

    const key = decodeURIComponent(parts.join('/'));
    if (!key) return null;

    return { bucket, key };
  } catch {
    return null;
  }
}

export async function resolveAudioUrl(input: string, options: ResolveAudioUrlOptions = {}): Promise<string> {
  const { bucketForKeys, expiresIn = 3600 } = options;

  if (!input) return input;
  if (input.startsWith('blob:') || input.startsWith('data:')) return input;

  const parsed = input.startsWith('http') ? parseSupabaseStorageObjectUrl(input) : null;

  // Full Supabase Storage URL → sign it
  if (parsed) {
    try {
      const { data, error } = await supabase.storage
        .from(parsed.bucket)
        .createSignedUrl(parsed.key, expiresIn);

      if (!error && data?.signedUrl) return data.signedUrl;

      // Fallback to public URL if signing fails
      const { data: pub } = supabase.storage.from(parsed.bucket).getPublicUrl(parsed.key);
      if (pub?.publicUrl) return pub.publicUrl;
    } catch {
      // ignore
    }

    return input;
  }

  // Bare key → sign from provided bucket
  if (!input.startsWith('http') && bucketForKeys) {
    const key = input.replace(/^\/+/, '').replace(/^public\//, '');
    try {
      const { data, error } = await supabase.storage
        .from(bucketForKeys)
        .createSignedUrl(key, expiresIn);

      if (!error && data?.signedUrl) return data.signedUrl;

      const { data: pub } = supabase.storage.from(bucketForKeys).getPublicUrl(key);
      if (pub?.publicUrl) return pub.publicUrl;
    } catch {
      // ignore
    }
  }

  return input;
}
