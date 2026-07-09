import { useEffect, useState } from 'react';
import month01Autumn from '@/assets/calendar-local/month-01-autumn.jpg.asset.json';
import month02Autumn from '@/assets/calendar-local/month-02-autumn.jpg.asset.json';
import month03Autumn from '@/assets/calendar-local/month-03-autumn.jpg.asset.json';
import month04Winter from '@/assets/calendar-local/month-04-winter.jpg.asset.json';
import month05Winter from '@/assets/calendar-local/month-05-winter.jpg.asset.json';
import month06Winter from '@/assets/calendar-local/month-06-winter.jpg.asset.json';
import month07Spring from '@/assets/calendar-local/month-07-spring.jpg.asset.json';
import month08Spring from '@/assets/calendar-local/month-08-spring.jpg.asset.json';
import month09Spring from '@/assets/calendar-local/month-09-spring.jpg.asset.json';
import month10Summer from '@/assets/calendar-local/month-10-summer.jpg.asset.json';
import month11Summer from '@/assets/calendar-local/month-11-summer.jpg.asset.json';
import month12Summer from '@/assets/calendar-local/month-12-summer.jpg.asset.json';
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
// Third-slot images — chosen for distinct file sizes (verified unique from the calendar-upload set)
import calendarMonth15 from '@/assets/calendar-monthly/calendar-month-15.png.asset.json';
import calendarMonth16 from '@/assets/calendar-monthly/calendar-month-16.png.asset.json';
import calendarMonth17 from '@/assets/calendar-monthly/calendar-month-17.png.asset.json';
import calendarMonth18 from '@/assets/calendar-monthly/calendar-month-18.png.asset.json';
import calendarMonth19 from '@/assets/calendar-monthly/calendar-month-19.png.asset.json';
import calendarMonth23 from '@/assets/calendar-monthly/calendar-month-23.png.asset.json';
import calendarMonth26 from '@/assets/calendar-monthly/calendar-month-26.png.asset.json';
import calendarMonth34 from '@/assets/calendar-monthly/calendar-month-34.png.asset.json';
import calendarMonth36 from '@/assets/calendar-monthly/calendar-month-36.png.asset.json';
import calendarMonth42 from '@/assets/calendar-monthly/calendar-month-42.png.asset.json';
import calendarMonth45 from '@/assets/calendar-monthly/calendar-month-45.png.asset.json';
import calendarMonth33 from '@/assets/calendar-monthly/calendar-month-33.png.asset.json';
import { getRegion, scripturalMonthToSeason, type RegionInfo, type SeasonLabel } from '@/utils/calendarSeason';

export const MONTH_CHOICE_IMAGES: Record<number, readonly string[]> = {
  1: [month01Autumn.url, calendarUpload64.url, calendarMonth15.url],
  2: [month02Autumn.url, calendarUpload65.url, calendarMonth16.url],
  3: [month03Autumn.url, calendarUpload63.url, calendarMonth17.url],
  4: [month04Winter.url, calendarUpload66.url, calendarMonth18.url],
  5: [month05Winter.url, calendarUpload68.url, calendarMonth19.url],
  6: [month06Winter.url, calendarUpload67.url, calendarMonth23.url],
  7: [month07Spring.url, calendarUpload69.url, calendarMonth26.url],
  8: [month08Spring.url, calendarUpload70.url, calendarMonth34.url],
  9: [month09Spring.url, calendarUpload72.url, calendarMonth36.url],
  10: [month10Summer.url, calendarUpload73.url, calendarMonth42.url],
  11: [month11Summer.url, calendarUpload74.url, calendarMonth45.url],
  12: [month12Summer.url, calendarUpload75.url, calendarMonth33.url],
};

const LOCAL_SEASON_IMAGES: Record<SeasonLabel, readonly string[]> = {
  autumn: [month01Autumn.url, month02Autumn.url, month03Autumn.url],
  winter: [month04Winter.url, month05Winter.url, month06Winter.url],
  spring: [month07Spring.url, month08Spring.url, month09Spring.url],
  summer: [month10Summer.url, month11Summer.url, month12Summer.url],
  wet: [month07Spring.url, month08Spring.url, month10Summer.url],
  dry: [month01Autumn.url, month04Winter.url, month12Summer.url],
  'polar-day': [month10Summer.url, month11Summer.url, month12Summer.url],
  'polar-night': [month04Winter.url, month05Winter.url, month06Winter.url],
};

const SOUTHERN_SEASON_IMAGES: Record<SeasonLabel, readonly string[]> = {
  autumn: [calendarUpload64.url, calendarUpload65.url, calendarUpload63.url],
  winter: [calendarUpload66.url, calendarUpload68.url, calendarUpload67.url],
  spring: [calendarUpload69.url, calendarUpload70.url, calendarUpload72.url],
  summer: [calendarUpload73.url, calendarUpload74.url, calendarUpload75.url],
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
    return [month, MONTH_CHOICE_IMAGES[month][0]];
  }),
) as Record<number, string>;

export function buildSeasonalFallbackArt(scripturalMonth: number, region?: RegionInfo): string {
  if (!scripturalMonth || scripturalMonth < 1 || scripturalMonth > 12) {
    return calendarUpload64.url;
  }

  const monthChoices = MONTH_CHOICE_IMAGES[scripturalMonth];
  if (monthChoices?.[0]) return monthChoices[0];

  const season = region ? scripturalMonthToSeason(scripturalMonth, region) : scripturalMonthToSeason(scripturalMonth, getRegion(-34));
  const localSeasonSet = LOCAL_SEASON_IMAGES[season] ?? LOCAL_SEASON_IMAGES.autumn;
  const seasonalSet = SOUTHERN_SEASON_IMAGES[season] ?? SOUTHERN_SEASON_IMAGES.autumn;
  return rotateSeasonImages(localSeasonSet, scripturalMonth)[0] ?? rotateSeasonImages(seasonalSet, scripturalMonth)[0] ?? seasonalSet[0] ?? calendarUpload64.url;
}

export function buildSeasonalChoiceUrls(scripturalMonth: number, region: RegionInfo): readonly string[] {
  if (!scripturalMonth || scripturalMonth < 1 || scripturalMonth > 12) {
    return SOUTHERN_SEASON_IMAGES.autumn;
  }

  const monthChoices = MONTH_CHOICE_IMAGES[scripturalMonth];
  if (monthChoices?.length === 3) return monthChoices;

  const season = scripturalMonthToSeason(scripturalMonth, region);
  const localChoices = rotateSeasonImages(LOCAL_SEASON_IMAGES[season] ?? LOCAL_SEASON_IMAGES.autumn, scripturalMonth);
  const seasonalChoices = rotateSeasonImages(SOUTHERN_SEASON_IMAGES[season] ?? SOUTHERN_SEASON_IMAGES.autumn, scripturalMonth);
  return [localChoices[0], ...seasonalChoices].filter(Boolean).slice(0, 3);
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

