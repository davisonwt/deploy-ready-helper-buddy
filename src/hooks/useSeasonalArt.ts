import { useEffect, useState } from 'react';
import calendarMonth15 from '@/assets/calendar-monthly/calendar-month-15.png.asset.json';
import calendarMonth16 from '@/assets/calendar-monthly/calendar-month-16.png.asset.json';
import calendarMonth17 from '@/assets/calendar-monthly/calendar-month-17.png.asset.json';
import calendarMonth18 from '@/assets/calendar-monthly/calendar-month-18.png.asset.json';
import calendarMonth19 from '@/assets/calendar-monthly/calendar-month-19.png.asset.json';
import calendarMonth20 from '@/assets/calendar-monthly/calendar-month-20.png.asset.json';
import calendarMonth21 from '@/assets/calendar-monthly/calendar-month-21.png.asset.json';
import calendarMonth22 from '@/assets/calendar-monthly/calendar-month-22.png.asset.json';
import calendarMonth23 from '@/assets/calendar-monthly/calendar-month-23.png.asset.json';
import calendarMonth24 from '@/assets/calendar-monthly/calendar-month-24.png.asset.json';
import calendarMonth25 from '@/assets/calendar-monthly/calendar-month-25.png.asset.json';
import calendarMonth26 from '@/assets/calendar-monthly/calendar-month-26.png.asset.json';
import calendarMonth27 from '@/assets/calendar-monthly/calendar-month-27.png.asset.json';
import calendarMonth28 from '@/assets/calendar-monthly/calendar-month-28.png.asset.json';
import calendarMonth29 from '@/assets/calendar-monthly/calendar-month-29.png.asset.json';
import calendarMonth30 from '@/assets/calendar-monthly/calendar-month-30.png.asset.json';
import calendarMonth31 from '@/assets/calendar-monthly/calendar-month-31.png.asset.json';
import calendarMonth32 from '@/assets/calendar-monthly/calendar-month-32.png.asset.json';
import calendarMonth33 from '@/assets/calendar-monthly/calendar-month-33.png.asset.json';
import calendarMonth34 from '@/assets/calendar-monthly/calendar-month-34.png.asset.json';
import calendarMonth35 from '@/assets/calendar-monthly/calendar-month-35.png.asset.json';
import calendarMonth36 from '@/assets/calendar-monthly/calendar-month-36.png.asset.json';
import calendarMonth37 from '@/assets/calendar-monthly/calendar-month-37.png.asset.json';
import calendarMonth38 from '@/assets/calendar-monthly/calendar-month-38.png.asset.json';
import calendarMonth39 from '@/assets/calendar-monthly/calendar-month-39.png.asset.json';
import calendarMonth40 from '@/assets/calendar-monthly/calendar-month-40.png.asset.json';
import calendarMonth41 from '@/assets/calendar-monthly/calendar-month-41.png.asset.json';
import calendarMonth42 from '@/assets/calendar-monthly/calendar-month-42.png.asset.json';
import calendarMonth43 from '@/assets/calendar-monthly/calendar-month-43.png.asset.json';
import calendarMonth44 from '@/assets/calendar-monthly/calendar-month-44.png.asset.json';
import calendarMonth45 from '@/assets/calendar-monthly/calendar-month-45.png.asset.json';
import calendarMonth46 from '@/assets/calendar-monthly/calendar-month-46.png.asset.json';
import calendarMonth47 from '@/assets/calendar-monthly/calendar-month-47.png.asset.json';
import calendarMonth48 from '@/assets/calendar-monthly/calendar-month-48.png.asset.json';
import calendarMonth49 from '@/assets/calendar-monthly/calendar-month-49.png.asset.json';
import calendarMonth50 from '@/assets/calendar-monthly/calendar-month-50.png.asset.json';
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

const MONTH_CHOICE_IMAGES: Record<number, readonly string[]> = {
  1: [calendarMonth15.url, calendarMonth16.url, calendarMonth17.url],
  2: [calendarMonth18.url, calendarMonth19.url, calendarMonth20.url],
  3: [calendarMonth21.url, calendarMonth22.url, calendarMonth23.url],
  4: [calendarMonth24.url, calendarMonth25.url, calendarMonth26.url],
  5: [calendarMonth27.url, calendarMonth28.url, calendarMonth29.url],
  6: [calendarMonth30.url, calendarMonth31.url, calendarMonth32.url],
  7: [calendarMonth33.url, calendarMonth34.url, calendarMonth35.url],
  8: [calendarMonth36.url, calendarMonth37.url, calendarMonth38.url],
  9: [calendarMonth39.url, calendarMonth40.url, calendarMonth41.url],
  10: [calendarMonth42.url, calendarMonth43.url, calendarMonth44.url],
  11: [calendarMonth45.url, calendarMonth46.url, calendarMonth47.url],
  12: [calendarMonth48.url, calendarMonth49.url, calendarMonth50.url],
};

const SOUTHERN_MONTH_IMAGE_SEQUENCE = Object.fromEntries(
  Array.from({ length: 12 }, (_, index) => [index + 1, MONTH_CHOICE_IMAGES[index + 1]?.[0]]),
) as Record<number, string>;

export const BUNDLED_SEASONAL_ART: Record<number, string> = SOUTHERN_MONTH_IMAGE_SEQUENCE;

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

export function buildSeasonalFallbackArt(scripturalMonth: number, region?: RegionInfo): string {
  if (!scripturalMonth || scripturalMonth < 1 || scripturalMonth > 12) {
    return MONTH_CHOICE_IMAGES[1]?.[0] ?? calendarUpload64.url;
  }

  const monthlyDefault = MONTH_CHOICE_IMAGES[scripturalMonth]?.[0];

  if (!region) {
    return monthlyDefault ?? BUNDLED_SEASONAL_ART[scripturalMonth] ?? calendarUpload64.url;
  }

  const season = scripturalMonthToSeason(scripturalMonth, region);
  const seasonalSet = SOUTHERN_SEASON_IMAGES[season] ?? SOUTHERN_SEASON_IMAGES.autumn;
  return monthlyDefault ?? seasonalSet[getSeasonPhaseIndex(scripturalMonth)] ?? seasonalSet[0] ?? calendarUpload64.url;
}

export function buildSeasonalChoiceUrls(scripturalMonth: number, _region: RegionInfo): readonly string[] {
  if (!scripturalMonth || scripturalMonth < 1 || scripturalMonth > 12) {
    return MONTH_CHOICE_IMAGES[1] ?? SOUTHERN_SEASON_IMAGES.autumn;
  }

  return MONTH_CHOICE_IMAGES[scripturalMonth] ?? SOUTHERN_SEASON_IMAGES.autumn;
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

