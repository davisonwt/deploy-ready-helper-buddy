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

    if (parts[0] === 'public' || parts[0] === 'sign') parts.shift();

    const bucket = parts.shift();
    if (!bucket) return null;

    const key = decodeURIComponent(parts.join('/'));
    if (!key) return null;

    return { bucket, key };
  } catch {
    return null;
  }
}

/**
 * Try to create a signed URL. Returns the URL if the file exists, null otherwise.
 */
async function trySignedUrl(bucket: string, key: string, expiresIn: number): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(key, expiresIn);
    if (!error && data?.signedUrl) return data.signedUrl;
  } catch {
    // ignore
  }
  return null;
}

/**
 * Convert a database file_url path to a human-readable filename matching the bucket.
 * e.g. "04754d57-.../1757055059857-A_Tale_of_Beginnings_-_Spring.mp3" → "A Tale of Beginnings - Spring.mp3"
 */
function extractHumanFilename(key: string): string {
  const parts = key.split('/');
  const rawFileName = parts[parts.length - 1];
  // Remove leading timestamp like "1757055059857-" or "1757055059857-0-"
  const withoutTimestamp = rawFileName.replace(/^\d{10,}-(\d+-)?/, '');
  // Convert underscores back to spaces
  // Triple underscores ___  were used for special chars like (), commas
  return decodeURIComponent(withoutTimestamp)
    .replace(/___/g, ', ')
    .replace(/__/g, ' (')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function resolveAudioUrl(input: string, options: ResolveAudioUrlOptions = {}): Promise<string> {
  const { bucketForKeys, expiresIn = 3600 } = options;

  if (!input) return input;
  if (input.startsWith('blob:') || input.startsWith('data:')) return input;

  const parsed = input.startsWith('http') ? parseSupabaseStorageObjectUrl(input) : null;

  // Full Supabase Storage URL → sign it from the detected bucket
  if (parsed) {
    const signed = await trySignedUrl(parsed.bucket, parsed.key, expiresIn);
    if (signed) return signed;
    // If bucket was music-tracks and failed, also try dj-music with humanized name
    if (parsed.bucket === 'music-tracks') {
      const humanName = extractHumanFilename(parsed.key);
      const signed2 = await trySignedUrl('dj-music', humanName, expiresIn);
      if (signed2) return signed2;
      // Try alternate extension
      const altName = swapExtension(humanName);
      if (altName) {
        const signed3 = await trySignedUrl('dj-music', altName, expiresIn);
        if (signed3) return signed3;
      }
    }
    return input;
  }

  // Bare key (not a URL) → try multiple buckets and name variations
  if (!input.startsWith('http')) {
    const key = input.replace(/^\/+/, '').replace(/^public\//, '');
    
    // 1. Try exact key in music-tracks bucket (where full paths are stored)
    const fromMusicTracks = await trySignedUrl('music-tracks', key, expiresIn);
    if (fromMusicTracks) {
      console.log(`[resolveAudioUrl] ✅ Found in music-tracks: "${key}"`);
      return fromMusicTracks;
    }

    // 2. Try exact key in dj-music bucket
    if (bucketForKeys) {
      const fromDjMusic = await trySignedUrl(bucketForKeys, key, expiresIn);
      if (fromDjMusic) {
        console.log(`[resolveAudioUrl] ✅ Found in ${bucketForKeys}: "${key}"`);
        return fromDjMusic;
      }
    }

    // 3. Extract human-readable filename and try dj-music bucket
    const humanName = extractHumanFilename(key);
    if (humanName !== key) {
      const fromHuman = await trySignedUrl('dj-music', humanName, expiresIn);
      if (fromHuman) {
        console.log(`[resolveAudioUrl] ✅ Found in dj-music as: "${humanName}"`);
        return fromHuman;
      }
      
      // Try alternate extension (.mp3 ↔ .wav)
      const altName = swapExtension(humanName);
      if (altName) {
        const fromAlt = await trySignedUrl('dj-music', altName, expiresIn);
        if (fromAlt) {
          console.log(`[resolveAudioUrl] ✅ Found in dj-music as: "${altName}"`);
          return fromAlt;
        }
      }
    }

    // 4. Try just the raw filename (no path prefix) in dj-music
    const parts = key.split('/');
    if (parts.length > 1) {
      const rawFilename = parts[parts.length - 1];
      const fromRaw = await trySignedUrl('dj-music', rawFilename, expiresIn);
      if (fromRaw) {
        console.log(`[resolveAudioUrl] ✅ Found in dj-music as raw: "${rawFilename}"`);
        return fromRaw;
      }
    }

    console.error(`[resolveAudioUrl] ❌ Could not resolve audio file: "${input}"`);
  }

  return input;
}

function swapExtension(name: string): string | null {
  const ext = name.split('.').pop()?.toLowerCase();
  if (!ext) return null;
  const base = name.replace(/\.[^.]+$/, '');
  const altExt = ext === 'mp3' ? 'wav' : ext === 'wav' ? 'mp3' : null;
  return altExt ? `${base}.${altExt}` : null;
}
