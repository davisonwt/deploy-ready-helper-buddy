/**
 * Location → climate band + scriptural-month → real local season.
 * Pure functions — used both to build the cache key and to write the image prompt.
 *
 * Scriptural Month 1 begins at the Vernal Equinox (≈ 20 Mar). For the Northern
 * hemisphere that's the start of spring; for the Southern hemisphere it's the
 * start of autumn. Tropical and polar bands override the four-season label with
 * something more appropriate (wet/dry, polar-day/polar-night).
 */

export type Hemisphere = 'N' | 'S';
export type ClimateBand = 'tropical' | 'subtropical' | 'temperate' | 'boreal' | 'polar';
export type SeasonLabel =
  | 'spring' | 'summer' | 'autumn' | 'winter'
  | 'wet' | 'dry'
  | 'polar-day' | 'polar-night';

export interface RegionInfo {
  hemisphere: Hemisphere;
  band: ClimateBand;
  /** Cache key used in seasonal_calendar_art.region_key, e.g. "S:subtropical". */
  key: string;
}

export function getRegion(lat: number): RegionInfo {
  const hemisphere: Hemisphere = lat >= 0 ? 'N' : 'S';
  const absLat = Math.abs(lat);
  let band: ClimateBand;
  if (absLat < 23.5) band = 'tropical';
  else if (absLat < 35) band = 'subtropical';
  else if (absLat < 55) band = 'temperate';
  else if (absLat < 66.5) band = 'boreal';
  else band = 'polar';
  return { hemisphere, band, key: `${hemisphere}:${band}` };
}

/**
 * Scriptural month → real local season for a given hemisphere/climate band.
 * Months 1–3 follow the equinox (spring N / autumn S), 4–6 summer N / winter S,
 * 7–9 autumn N / spring S, 10–12 winter N / summer S.
 */
export function scripturalMonthToSeason(
  month: number,
  region: RegionInfo,
): SeasonLabel {
  const m = ((month - 1) % 12) + 1;

  if (region.band === 'tropical') {
    // Simplified tropical wet/dry — for the Sahel-style bias toward N-summer rains.
    if (region.hemisphere === 'N') {
      return m >= 4 && m <= 9 ? 'wet' : 'dry';
    }
    return m >= 10 || m <= 3 ? 'wet' : 'dry';
  }

  if (region.band === 'polar') {
    if (region.hemisphere === 'N') {
      return m >= 4 && m <= 9 ? 'polar-day' : 'polar-night';
    }
    return m >= 10 || m <= 3 ? 'polar-day' : 'polar-night';
  }

  // Four-season bands.
  const northern: SeasonLabel[] = [
    'spring', 'spring', 'spring',
    'summer', 'summer', 'summer',
    'autumn', 'autumn', 'autumn',
    'winter', 'winter', 'winter',
  ];
  const southern: SeasonLabel[] = [
    'autumn', 'autumn', 'autumn',
    'winter', 'winter', 'winter',
    'spring', 'spring', 'spring',
    'summer', 'summer', 'summer',
  ];
  return (region.hemisphere === 'N' ? northern : southern)[m - 1];
}

export function describeRegion(region: RegionInfo): string {
  const hemi = region.hemisphere === 'N' ? 'Northern' : 'Southern';
  return `${hemi} hemisphere ${region.band}`;
}
