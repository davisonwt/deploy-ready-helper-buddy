import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getRegion, scripturalMonthToSeason, describeRegion } from '@/utils/calendarSeason';
import month01Art from '@/assets/calendar/month-01-autumn.jpg';
import month02Art from '@/assets/calendar/month-02-autumn.jpg';
import month03Art from '@/assets/calendar/month-03-autumn.jpg';
import month04Art from '@/assets/calendar/month-04-winter.jpg';
import month05Art from '@/assets/calendar/month-05-winter.jpg';
import month06Art from '@/assets/calendar/month-06-winter.jpg';
import month07Art from '@/assets/calendar/month-07-spring.jpg';
import month08Art from '@/assets/calendar/month-08-spring.jpg';
import month09Art from '@/assets/calendar/month-09-spring.jpg';
import month10Art from '@/assets/calendar/month-10-summer.jpg';
import month11Art from '@/assets/calendar/month-11-summer.jpg';
import month12Art from '@/assets/calendar/month-12-summer.jpg';

export const BUNDLED_SEASONAL_ART: Record<number, string> = {
  1: month01Art,
  2: month02Art,
  3: month03Art,
  4: month04Art,
  5: month05Art,
  6: month06Art,
  7: month07Art,
  8: month08Art,
  9: month09Art,
  10: month10Art,
  11: month11Art,
  12: month12Art,
};

export function buildSeasonalFallbackArt(scripturalMonth: number, lat = -26.2): string {
  const bundled = BUNDLED_SEASONAL_ART[scripturalMonth];
  if (bundled) return bundled;

  const region = getRegion(lat);
  const season = scripturalMonthToSeason(scripturalMonth, region);
  const palettes: Record<string, { sky: string; glow: string; land: string; water: string; flower: string; accent: string }> = {
    spring: { sky: '#8fd7ff', glow: '#fff0a8', land: '#2f8b57', water: '#4ab5c9', flower: '#f7a8c8', accent: '#ffffff' },
    summer: { sky: '#4fb4ff', glow: '#ffd36e', land: '#4f8f2f', water: '#147c9a', flower: '#ffe07a', accent: '#fff7d6' },
    autumn: { sky: '#f0a35b', glow: '#ffe2a3', land: '#8f4d22', water: '#6aa0aa', flower: '#d85d2a', accent: '#f9d28b' },
    winter: { sky: '#91b8d8', glow: '#f4f8ff', land: '#4b6f62', water: '#355e78', flower: '#d9eef8', accent: '#ffffff' },
    wet: { sky: '#5fb6b8', glow: '#e6ffd3', land: '#1f7d4a', water: '#2f9fb3', flower: '#f8d36a', accent: '#e9fff4' },
    dry: { sky: '#eead6b', glow: '#fff1b8', land: '#9a6b32', water: '#6eb0c0', flower: '#f2c35c', accent: '#fff7df' },
    'polar-day': { sky: '#9fdcff', glow: '#ffffff', land: '#cfe9f7', water: '#6eb8d6', flower: '#b7dfff', accent: '#ffffff' },
    'polar-night': { sky: '#17274d', glow: '#96fff0', land: '#d8eef8', water: '#283f66', flower: '#b6fff2', accent: '#ffffff' },
  };
  const p = palettes[season];
  const monthName = `Month ${scripturalMonth}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200" role="img" aria-label="${monthName} ${season} seasonal artwork">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky}"/><stop offset="0.62" stop-color="${p.glow}"/><stop offset="1" stop-color="${p.land}"/></linearGradient>
      <radialGradient id="sun" cx="50%" cy="28%" r="26%"><stop offset="0" stop-color="${p.accent}" stop-opacity="0.98"/><stop offset="0.45" stop-color="${p.glow}" stop-opacity="0.72"/><stop offset="1" stop-color="${p.glow}" stop-opacity="0"/></radialGradient>
      <linearGradient id="water" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.water}" stop-opacity="0.94"/><stop offset="1" stop-color="${p.sky}" stop-opacity="0.55"/></linearGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="14"/></filter>
    </defs>
    <rect width="900" height="1200" fill="url(#sky)"/>
    <circle cx="450" cy="285" r="245" fill="url(#sun)"/>
    <path d="M0 580 C180 430 290 470 430 330 C580 185 720 300 900 165 L900 1200 L0 1200 Z" fill="#ffffff" opacity="0.26"/>
    <path d="M0 670 C135 535 250 575 385 438 C540 280 704 420 900 280 L900 1200 L0 1200 Z" fill="${p.land}" opacity="0.72"/>
    <path d="M0 770 C165 705 300 730 450 650 C620 560 735 620 900 540 L900 1200 L0 1200 Z" fill="#1d3b2d" opacity="0.44"/>
    <path d="M92 930 C280 800 514 1040 808 835 C724 1085 308 1145 92 930 Z" fill="url(#water)" opacity="0.88"/>
    <path d="M0 1020 C140 930 245 1010 374 940 C520 860 650 955 900 830 L900 1200 L0 1200 Z" fill="#0f2f25" opacity="0.38"/>
    ${Array.from({ length: 18 }, (_, i) => {
      const x = 55 + ((i * 73) % 790);
      const y = 910 + ((i * 47) % 210);
      const r = 12 + (i % 5) * 4;
      return `<g opacity="0.72"><circle cx="${x}" cy="${y}" r="${r}" fill="${p.flower}"/><circle cx="${x + r}" cy="${y + 5}" r="${Math.max(6, r - 5)}" fill="${p.accent}" opacity="0.7"/></g>`;
    }).join('')}
    <g opacity="0.22" filter="url(#soft)"><ellipse cx="180" cy="210" rx="130" ry="32" fill="${p.accent}"/><ellipse cx="690" cy="170" rx="150" ry="34" fill="${p.accent}"/></g>
    <rect x="0" y="0" width="900" height="1200" fill="#000" opacity="0.08"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Fetch (or trigger generation of) the cached seasonal calendar image for the
 * user's region and a given scriptural month (1–12). One image per region/month,
 * reused for every user in that region.
 */
export function useSeasonalArt(scripturalMonth: number, lat: number, lon: number) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!scripturalMonth || scripturalMonth < 1 || scripturalMonth > 12) return;

    const region = getRegion(lat);
    const season = scripturalMonthToSeason(scripturalMonth, region);

    setImageUrl(buildSeasonalFallbackArt(scripturalMonth, lat));
    setLoading(true);
    setError(null);

    supabase.functions
      .invoke('get-or-generate-calendar-art', {
        body: {
          region_key: region.key,
          scriptural_month: scripturalMonth,
          season_label: season,
          region_description: describeRegion(region),
        },
      })
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          setError(err.message);
          setImageUrl(buildSeasonalFallbackArt(scripturalMonth, lat));
        } else {
          const response = data as { imageUrl?: string; fallback?: boolean };
          const url = response?.imageUrl ?? '';
          setImageUrl(response?.fallback ? buildSeasonalFallbackArt(scripturalMonth, lat) : (url || buildSeasonalFallbackArt(scripturalMonth, lat)));
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError((e as Error).message);
          setImageUrl(buildSeasonalFallbackArt(scripturalMonth, lat));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scripturalMonth, lat, lon]);

  return { imageUrl, loading, error };
}
