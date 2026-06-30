import { buildScripturalYear, type YearBuild } from '@/utils/calendarYearBuild';
import { getRegion, type RegionInfo } from '@/utils/calendarSeason';
import { buildSeasonalFallbackArt } from '@/hooks/useSeasonalArt';

export interface CalendarBundle {
  year: YearBuild;
  region: RegionInfo;
  monthImages: Record<number, string>;
}

/**
 * Use the curated uploaded month images immediately so the preview, PDF,
 * journal, and diary stay visually in sync.
 */
export async function loadCalendarBundle(year: number, lat: number, lon: number): Promise<CalendarBundle> {
  const region = getRegion(lat);
  const yearBuild = buildScripturalYear(year);

  const monthImages: Record<number, string> = {};
  for (const m of yearBuild.months) {
    monthImages[m.month] = buildSeasonalFallbackArt(m.month);
  }

  return { year: yearBuild, region, monthImages };
}


export function calendarFilename(year: number, regionKey: string): string {
  return `Scriptural-Calendar-Year-${year}-${regionKey.replace(':', '-')}.pdf`;
}
