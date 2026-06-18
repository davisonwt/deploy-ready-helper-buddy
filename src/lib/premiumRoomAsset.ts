import { supabase } from "@/integrations/supabase/client";

// Cache signed URLs in-memory to avoid hammering the edge function on re-renders.
// TTL is 15 min from the server; we expire our cache slightly earlier to be safe.
const CACHE_TTL_MS = 13 * 60 * 1000;
const cache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Returns a short-lived signed URL for a file in the private `premium-room` bucket.
 * Access is verified server-side (owner / admin / purchaser).
 * Throws on failure — callers should handle.
 */
export async function getPremiumRoomSignedUrl(storagePath: string): Promise<string> {
  if (!storagePath) throw new Error("Missing storage path");

  const key = storagePath.replace(/^\/+/, "").replace(/^premium-room\//, "");
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const { data, error } = await supabase.functions.invoke("get-premium-room-asset", {
    body: { path: key },
  });

  if (error) throw error;
  const signedUrl = (data as any)?.signedUrl;
  if (!signedUrl) throw new Error("No signed URL returned");

  cache.set(key, { url: signedUrl, expiresAt: Date.now() + CACHE_TTL_MS });
  return signedUrl;
}

/** Best-effort: extracts the storage key from a public URL, signed URL, or raw path. */
export function extractPremiumRoomKey(input: string): string | null {
  if (!input) return null;
  try {
    const url = new URL(input);
    const m = url.pathname.match(/\/premium-room\/(.+)$/);
    if (m) return decodeURIComponent(m[1].split("?")[0]);
  } catch {
    // not a URL
  }
  const raw = input.replace(/^\/+/, "");
  if (raw.startsWith("premium-room/")) return raw.replace(/^premium-room\//, "");
  return raw || null;
}
