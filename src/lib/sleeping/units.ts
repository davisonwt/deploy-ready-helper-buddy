/**
 * Distance units for the Sleeping Seeds hub.
 *
 * Metres are the only unit ever stored or sent to the database. Miles and
 * kilometres are a display choice made here, from the viewer's own locale.
 * Nothing in this file assumes a country.
 */

/** The four places that drive on miles. Everywhere else is metric. */
const IMPERIAL_REGIONS = new Set(['US', 'GB', 'LR', 'MM']);

export type DistanceUnit = 'km' | 'mi';

const METRES_PER_MILE = 1609.344;

/**
 * The viewer's region, from the browser locale. Returns null when the
 * locale carries no region (plain "en", say), which is treated as metric
 * rather than guessed at.
 */
export function viewerRegion(locales?: readonly string[]): string | null {
  const list = locales
    ?? (typeof navigator !== 'undefined'
      ? (navigator.languages?.length ? navigator.languages : [navigator.language])
      : []);

  for (const tag of list) {
    if (!tag) continue;
    try {
      // Intl.Locale handles "en-US", "zh-Hant-TW", "en-US-u-ca-gregory".
      const region = new Intl.Locale(tag).region;
      if (region) return region.toUpperCase();
    } catch {
      // Malformed tag: fall back to a plain split.
      const parts = tag.split('-');
      if (parts.length > 1 && parts[1].length === 2) return parts[1].toUpperCase();
    }
  }
  return null;
}

/** Miles for US, UK, Liberia and Myanmar. Kilometres for the rest of the world. */
export function unitForViewer(locales?: readonly string[]): DistanceUnit {
  const region = viewerRegion(locales);
  return region && IMPERIAL_REGIONS.has(region) ? 'mi' : 'km';
}

/** The default radius, as metres, in whichever unit the viewer reads. */
export const DEFAULT_RADIUS_M = 50_000; // 50 km, which is ~30 mi

/**
 * Radius choices offered in the selector. Stored as metres so the same
 * value means the same distance for every viewer; only the label changes.
 */
export const RADIUS_CHOICES_M = [10_000, 25_000, 50_000, 100_000, 250_000] as const;

/**
 * Great-circle distance in metres. The same formula the database uses in
 * sleeping_wheels_near, so a card and a detail page never disagree.
 */
export function haversineMetres(
  aLat: number, aLng: number, bLat: number, bLng: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const r1 = toRad(aLat);
  const r2 = toRad(bLat);
  const cos = Math.sin(r1) * Math.sin(r2)
    + Math.cos(r1) * Math.cos(r2) * Math.cos(toRad(bLng) - toRad(aLng));
  return 6371000 * Math.acos(Math.min(1, Math.max(-1, cos)));
}

export function metresToUnit(metres: number, unit: DistanceUnit): number {
  return unit === 'mi' ? metres / METRES_PER_MILE : metres / 1000;
}

/** A radius label, rounded to something a person would actually say. */
export function formatRadius(metres: number, unit: DistanceUnit): string {
  const value = metresToUnit(metres, unit);
  return `${Math.round(value)} ${unit}`;
}

/**
 * A distance label for a card. Close distances get one decimal so the
 * nearest listings stay distinguishable.
 */
export function formatDistance(metres: number | null | undefined, unit: DistanceUnit): string {
  if (metres == null || !Number.isFinite(metres)) return '';
  const value = metresToUnit(metres, unit);
  if (value < 10) return `${value.toFixed(1)} ${unit} away`;
  return `${Math.round(value)} ${unit} away`;
}
