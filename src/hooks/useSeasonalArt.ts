import { useEffect, useState } from 'react';
import calendarUpload63 from '@/assets/calendar-uploaded/calendar-upload-63.png.asset.json';
import calendarUpload64 from '@/assets/calendar-uploaded/calendar-upload-64.png.asset.json';
import calendarUpload65 from '@/assets/calendar-uploaded/calendar-upload-65.png.asset.json';
import calendarUpload66 from '@/assets/calendar-uploaded/calendar-upload-66.png.asset.json';
import calendarUpload67 from '@/assets/calendar-uploaded/calendar-upload-67.png.asset.json';
import calendarUpload68 from '@/assets/calendar-uploaded/calendar-upload-68.png.asset.json';
import calendarUpload69 from '@/assets/calendar-uploaded/calendar-upload-69.png.asset.json';
import calendarUpload70 from '@/assets/calendar-uploaded/calendar-upload-70.png.asset.json';
import calendarUpload72 from '@/assets/calendar-uploaded/calendar-upload-72.png.asset.json';
import calendarUpload73 from '@/assets/calendar-uploaded/calendar-upload-73.png.asset.json';
import calendarUpload74 from '@/assets/calendar-uploaded/calendar-upload-74.png.asset.json';
import calendarUpload75 from '@/assets/calendar-uploaded/calendar-upload-75.png.asset.json';
import { getRegion, scripturalMonthToSeason, type RegionInfo, type SeasonLabel } from '@/utils/calendarSeason';

const SOUTHERN_SEASON_IMAGES: Record<SeasonLabel, readonly string[]> = {
  autumn: [calendarUpload64.url, calendarUpload65.url, calendarUpload63.url],
  winter: [calendarUpload66.url, calendarUpload68.url, calendarUpload67.url],
  spring: [calendarUpload69.url, calendarUpload70.url, calendarUpload74.url],
  summer: [calendarUpload72.url, calendarUpload73.url, calendarUpload75.url],
  wet: [calendarUpload69.url, calendarUpload70.url, calendarUpload72.url],
  dry: [calendarUpload63.url, calendarUpload68.url, calendarUpload75.url],
  'polar-day': [calendarUpload72.url, calendarUpload73.url, calendarUpload74.url],
  'polar-night': [calendarUpload66.url, calendarUpload67.url, calendarUpload68.url],
};

function getSeasonPhaseIndex(month: number) {
  return (month - 1) % 3;
}

function rotateSeasonImages(images: readonly string[], month: number): readonly string[] {
  const offset = getSeasonPhaseIndex(month);
  return [images[offset], images[(offset + 1) % images.length], images[(offset + 2) % images.length]].filter(Boolean);
}

export const BUNDLED_SEASONAL_ART: Record<number, string> = Object.fromEntries(
  Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return [month, rotateSeasonImages(SOUTHERN_SEASON_IMAGES[scripturalMonthToSeason(month, getRegion(-34))], month)[0]];
  }),
) as Record<number, string>;

export function buildSeasonalFallbackArt(scripturalMonth: number, region?: RegionInfo): string {
  if (!scripturalMonth || scripturalMonth < 1 || scripturalMonth > 12) {
    return calendarUpload64.url;
  }

  const season = region ? scripturalMonthToSeason(scripturalMonth, region) : scripturalMonthToSeason(scripturalMonth, getRegion(-34));
  const seasonalSet = SOUTHERN_SEASON_IMAGES[season] ?? SOUTHERN_SEASON_IMAGES.autumn;
  return rotateSeasonImages(seasonalSet, scripturalMonth)[0] ?? seasonalSet[0] ?? calendarUpload64.url;
}

export function buildSeasonalChoiceUrls(scripturalMonth: number, region: RegionInfo): readonly string[] {
  if (!scripturalMonth || scripturalMonth < 1 || scripturalMonth > 12) {
    return SOUTHERN_SEASON_IMAGES.autumn;
  }

  const season = scripturalMonthToSeason(scripturalMonth, region);
  return rotateSeasonImages(SOUTHERN_SEASON_IMAGES[season] ?? SOUTHERN_SEASON_IMAGES.autumn, scripturalMonth);
}

export function useSeasonalArt(scripturalMonth: number, lat: number, _lon: number) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scripturalMonth || scripturalMonth < 1 || scripturalMonth > 12) return;
    const region = getRegion(lat);
    setImageUrl(buildSeasonalFallbackArt(scripturalMonth, region));
    setLoading(false);
    setError(null);
  }, [scripturalMonth, lat]);

  return { imageUrl, loading, error };
}

