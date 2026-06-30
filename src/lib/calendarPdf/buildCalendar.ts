import { supabase } from '@/integrations/supabase/client';
import { buildScripturalYear, type YearBuild } from '@/utils/calendarYearBuild';
import { getRegion, scripturalMonthToSeason, describeRegion, type RegionInfo } from '@/utils/calendarSeason';
import { buildSeasonalFallbackArt } from '@/hooks/useSeasonalArt';

export interface CalendarBundle {
  year: YearBuild;
  region: RegionInfo;
  monthImages: Record<number, string>;
}

async function fetchArt(region: RegionInfo, month: number, lat: number): Promise<string> {
  const season = scripturalMonthToSeason(month, region);
  const { data, error } = await supabase.functions.invoke('get-or-generate-calendar-art', {
    body: {
      region_key: region.key,
      scriptural_month: month,
      season_label: season,
      region_description: describeRegion(region),
    },
  });
  if (error) throw new Error(error.message ?? 'Failed to fetch calendar art');
  const response = data as { imageUrl?: string; fallback?: boolean };
  if (response?.fallback) return buildSeasonalFallbackArt(month, lat);
  const url = response?.imageUrl;
  if (!url) throw new Error('Calendar art response missing imageUrl');
  return url;
}

/**
 * Fetch (and on first request, generate) the full set of 12 month images for
 * the user's region. Subsequent users in the same region reuse the cached images.
 */
export async function loadCalendarBundle(year: number, lat: number, lon: number): Promise<CalendarBundle> {
  const region = getRegion(lat);
  const yearBuild = buildScripturalYear(year);

  const monthImages: Record<number, string> = {};
  for (const m of yearBuild.months) {
    monthImages[m.month] = buildSeasonalFallbackArt(m.month, lat);
  }

  return { year: yearBuild, region, monthImages };
}

export function calendarFilename(year: number, regionKey: string): string {
  return `Scriptural-Calendar-Year-${year}-${regionKey.replace(':', '-')}.pdf`;
}
