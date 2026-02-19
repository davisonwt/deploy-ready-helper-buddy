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
    
    // Try the key as-is first
    try {
      const { data, error } = await supabase.storage
        .from(bucketForKeys)
        .createSignedUrl(key, expiresIn);

      if (!error && data?.signedUrl) return data.signedUrl;
    } catch {
      // ignore
    }

    // Fallback: extract just the filename (strip userId prefix and timestamp)
    // e.g. "04754d57-.../1757055059857-A_Tale_of_Beginnings_-_Spring.mp3" → "A Tale of Beginnings - Spring.mp3"
    const parts = key.split('/');
    const rawFileName = parts[parts.length - 1];
    // Remove leading timestamp like "1757055059857-" or "1757055059857-0-"
    const withoutTimestamp = rawFileName.replace(/^\d{10,}-(\d+-)?/, '');
    // Convert underscores back to spaces, collapse triple underscores to special chars patterns
    const humanName = decodeURIComponent(withoutTimestamp)
      .replace(/___/g, ' ') // triple underscore often replaces special chars like (),"
      .replace(/_/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Also try alternate extensions (.mp3 ↔ .wav)
    const ext = humanName.split('.').pop()?.toLowerCase();
    const base = humanName.replace(/\.[^.]+$/, '');
    const altExt = ext === 'mp3' ? 'wav' : 'mp3';
    const altName = `${base}.${altExt}`;
    
    const fallbackKeys = [rawFileName, withoutTimestamp, humanName, altName].filter(
      (v, i, arr) => v && v !== key && arr.indexOf(v) === i
    );

    for (const fallbackKey of fallbackKeys) {
      try {
        const { data, error } = await supabase.storage
          .from(bucketForKeys)
          .createSignedUrl(fallbackKey, expiresIn);
        if (!error && data?.signedUrl) {
          console.log(`[resolveAudioUrl] Fallback key matched: "${fallbackKey}"`);
          return data.signedUrl;
        }
      } catch {
        // ignore
      }

      // Try public URL
      try {
        const { data: pub } = supabase.storage.from(bucketForKeys).getPublicUrl(fallbackKey);
        if (pub?.publicUrl) {
          // Verify it exists by checking if the URL is valid (public bucket)
          console.log(`[resolveAudioUrl] Using public URL for: "${fallbackKey}"`);
          return pub.publicUrl;
        }
      } catch {
        // ignore
      }
    }

    // Last resort: try public URL with original key
    try {
      const { data: pub } = supabase.storage.from(bucketForKeys).getPublicUrl(key);
      if (pub?.publicUrl) return pub.publicUrl;
    } catch {
      // ignore
    }
  }

  return input;
}
