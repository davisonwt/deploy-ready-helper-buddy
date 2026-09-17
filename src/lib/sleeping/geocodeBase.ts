import { supabase } from '@/integrations/supabase/client';

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string | null;
  /** The variant of the typed text that actually resolved. */
  matched: string;
}

/**
 * Turn a typed place into coordinates, or nothing at all.
 *
 * Never returns a guess. A listing with no coordinates is skipped by the
 * proximity search and says so on the card; a listing with the *wrong*
 * coordinates is worse, because it is silently offered to the wrong town.
 *
 * Nominatim matches a free-text string as a whole, so one unrecognised
 * segment fails the entire query: "Mossel Bay, Seven Bells, Western Cape"
 * returns nothing even though "Mossel Bay, Western Cape" is exact. We
 * therefore retry with the most specific segment plus the broadest one,
 * then the most specific alone. Every attempt is cached server-side.
 */
export async function geocodeBaseLocation(place: string): Promise<GeocodeResult | null> {
  const attempts = candidates(place);
  for (const attempt of attempts) {
    const hit = await lookup(attempt);
    if (hit) return { ...hit, matched: attempt };
  }
  return null;
}

/** Ordered, deduped query variants. At most three lookups. */
export function candidates(place: string): string[] {
  const parts = place.split(',').map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  const push = (s: string) => {
    if (s.length >= 2 && !out.includes(s)) out.push(s);
  };
  push(parts.join(', '));
  if (parts.length >= 3) push(`${parts[0]}, ${parts[parts.length - 1]}`);
  if (parts.length >= 2) push(parts[0]);
  return out;
}

async function lookup(place: string): Promise<{ lat: number; lng: number; displayName: string | null } | null> {
  try {
    const { data, error } = await supabase.functions.invoke('geocode-place', { body: { place } });
    // invoke resolves on a non-2xx rather than throwing, so an unchecked
    // `data` here is how a 404 used to pass for success.
    if (error || !data) return null;
    const lat = Number((data as any).lat);
    const lng = Number((data as any).lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, displayName: (data as any).displayName ?? null };
  } catch {
    return null;
  }
}
