import { supabase } from '@/integrations/supabase/client';
import { buildScripturalYear, type YearBuild } from '@/utils/calendarYearBuild';
import { getRegion, scripturalMonthToSeason, describeRegion, type RegionInfo } from '@/utils/calendarSeason';

export interface CalendarBundle {
  year: YearBuild;
  region: RegionInfo;
  monthImages: Record<number, string>;
}

async function fetchArt(region: RegionInfo, month: number): Promise<string> {
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
  const url = (data as { imageUrl?: string })?.imageUrl;
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

  const entries = await Promise.all(
    yearBuild.months.map(async (m) => {
      try {
        const url = await fetchArt(region, m.month);
        return [m.month, url] as const;
      } catch (e) {
        console.warn(`Month ${m.month} art failed`, e);
        return [m.month, ''] as const;
      }
    }),
  );

  const monthImages: Record<number, string> = {};
  for (const [m, url] of entries) monthImages[m] = url;

  return { year: yearBuild, region, monthImages };
}

export function calendarFilename(year: number, regionKey: string): string {
  return `Scriptural-Calendar-Year-${year}-${regionKey.replace(':', '-')}.pdf`;
}
