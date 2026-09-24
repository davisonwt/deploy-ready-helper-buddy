/*
 * Where this month art comes from, and why it is two different places.
 *
 * Slot 0 -- the image this hook actually returns -- is a REAL file in
 * src/assets/calendar/, imported normally so Vite bundles it and Vercel
 * serves it from /assets/.
 *
 * Slots 1 and 2 are URLs from assets/hosted.ts, served out of our own
 * public app-assets bucket.
 *
 * Both used to be .asset.json descriptors pointing at Lovable's
 * assets-v1 route, added by gpt-engineer-app[bot] in 305562da on
 * 2026-07-05. Vercel serves production and has no such route, so all 85
 * calendar references returned Vercel's NOT_FOUND page and the artwork
 * rendered broken -- every month, every slot, from July until
 * 2026-09-24. Slot 0's bytes were already in this repo the whole time
 * (each file's size matched its descriptor exactly). Slots 1 and 2 only
 * existed on Lovable's preview host and were rescued from it, archived
 * with sha256s, and moved into our own bucket.
 *
 * scripts/audit-asset-refs.mjs now checks both kinds resolve.
 */
import { useEffect, useState } from 'react';
import { calendarMonth15, calendarMonth16, calendarMonth17, calendarMonth18, calendarMonth19, calendarMonth23, calendarMonth26, calendarMonth33, calendarMonth34, calendarMonth36, calendarMonth42, calendarMonth45, calendarUpload63, calendarUpload64, calendarUpload65, calendarUpload66, calendarUpload67, calendarUpload68, calendarUpload69, calendarUpload70, calendarUpload72, calendarUpload73, calendarUpload74, calendarUpload75 } from '@/assets/hosted';
import month01Autumn from '@/assets/calendar/month-01-autumn.jpg';
import month02Autumn from '@/assets/calendar/month-02-autumn.jpg';
import month03Autumn from '@/assets/calendar/month-03-autumn.jpg';
import month04Winter from '@/assets/calendar/month-04-winter.jpg';
import month05Winter from '@/assets/calendar/month-05-winter.jpg';
import month06Winter from '@/assets/calendar/month-06-winter.jpg';
import month07Spring from '@/assets/calendar/month-07-spring.jpg';
import month08Spring from '@/assets/calendar/month-08-spring.jpg';
import month09Spring from '@/assets/calendar/month-09-spring.jpg';
import month10Summer from '@/assets/calendar/month-10-summer.jpg';
import month11Summer from '@/assets/calendar/month-11-summer.jpg';
import month12Summer from '@/assets/calendar/month-12-summer.jpg';
// Third-slot images — chosen for distinct file sizes (verified unique from the calendar-upload set)
import { getRegion, scripturalMonthToSeason, type RegionInfo, type SeasonLabel } from '@/utils/calendarSeason';

export const MONTH_CHOICE_IMAGES: Record<number, readonly string[]> = {
  1: [month01Autumn, calendarUpload64, calendarMonth15],
  2: [month02Autumn, calendarUpload65, calendarMonth16],
  3: [month03Autumn, calendarUpload63, calendarMonth17],
  4: [month04Winter, calendarUpload66, calendarMonth18],
  5: [month05Winter, calendarUpload68, calendarMonth19],
  6: [month06Winter, calendarUpload67, calendarMonth23],
  7: [month07Spring, calendarUpload69, calendarMonth26],
  8: [month08Spring, calendarUpload70, calendarMonth34],
  9: [month09Spring, calendarUpload72, calendarMonth36],
  10: [month10Summer, calendarUpload73, calendarMonth42],
  11: [month11Summer, calendarUpload74, calendarMonth45],
  12: [month12Summer, calendarUpload75, calendarMonth33],
};

const LOCAL_SEASON_IMAGES: Record<SeasonLabel, readonly string[]> = {
  autumn: [month01Autumn, month02Autumn, month03Autumn],
  winter: [month04Winter, month05Winter, month06Winter],
  spring: [month07Spring, month08Spring, month09Spring],
  summer: [month10Summer, month11Summer, month12Summer],
  wet: [month07Spring, month08Spring, month10Summer],
  dry: [month01Autumn, month04Winter, month12Summer],
  'polar-day': [month10Summer, month11Summer, month12Summer],
  'polar-night': [month04Winter, month05Winter, month06Winter],
};

const SOUTHERN_SEASON_IMAGES: Record<SeasonLabel, readonly string[]> = {
  autumn: [calendarUpload64, calendarUpload65, calendarUpload63],
  winter: [calendarUpload66, calendarUpload68, calendarUpload67],
  spring: [calendarUpload69, calendarUpload70, calendarUpload72],
  summer: [calendarUpload73, calendarUpload74, calendarUpload75],
  wet: [calendarUpload69, calendarUpload70, calendarUpload72],
  dry: [calendarUpload63, calendarUpload68, calendarUpload75],
  'polar-day': [calendarUpload72, calendarUpload73, calendarUpload74],
  'polar-night': [calendarUpload66, calendarUpload67, calendarUpload68],
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
    // A real bundled file, not a calendar-uploaded descriptor: the
    // out-of-range path must not render broken either.
    return month01Autumn;
  }

  const monthChoices = MONTH_CHOICE_IMAGES[scripturalMonth];
  if (monthChoices?.[0]) return monthChoices[0];

  const season = region ? scripturalMonthToSeason(scripturalMonth, region) : scripturalMonthToSeason(scripturalMonth, getRegion(-34));
  const localSeasonSet = LOCAL_SEASON_IMAGES[season] ?? LOCAL_SEASON_IMAGES.autumn;
  const seasonalSet = SOUTHERN_SEASON_IMAGES[season] ?? SOUTHERN_SEASON_IMAGES.autumn;
  return rotateSeasonImages(localSeasonSet, scripturalMonth)[0] ?? rotateSeasonImages(seasonalSet, scripturalMonth)[0] ?? seasonalSet[0] ?? calendarUpload64;
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

