import { useEffect, useState } from 'react';
import calendarUpload63 from '@/assets/calendar-uploaded/calendar-upload-63.png.asset.json';
import calendarUpload64 from '@/assets/calendar-uploaded/calendar-upload-64.png.asset.json';
import calendarUpload65 from '@/assets/calendar-uploaded/calendar-upload-65.png.asset.json';
import calendarUpload66 from '@/assets/calendar-uploaded/calendar-upload-66.png.asset.json';
import calendarUpload67 from '@/assets/calendar-uploaded/calendar-upload-67.png.asset.json';
import calendarUpload68 from '@/assets/calendar-uploaded/calendar-upload-68.png.asset.json';
import calendarUpload69 from '@/assets/calendar-uploaded/calendar-upload-69.png.asset.json';
import calendarUpload70 from '@/assets/calendar-uploaded/calendar-upload-70.png.asset.json';

const MONTH_IMAGE_SEQUENCE = [
  calendarUpload70.url,
  calendarUpload71Fallback(calendarUpload64.url),
  calendarUpload71Fallback(calendarUpload69.url),
  calendarUpload63.url,
  calendarUpload64.url,
  calendarUpload65.url,
  calendarUpload70.url,
  calendarUpload69.url,
  calendarUpload67.url,
  calendarUpload66.url,
  calendarUpload68.url,
  calendarUpload67.url,
] as const;

function calendarUpload71Fallback(url: string) {
  return url;
}

export const BUNDLED_SEASONAL_ART: Record<number, string> = Object.fromEntries(
  MONTH_IMAGE_SEQUENCE.map((url, index) => [index + 1, url]),
) as Record<number, string>;

export function buildSeasonalFallbackArt(scripturalMonth: number): string {
  return BUNDLED_SEASONAL_ART[scripturalMonth] ?? calendarUpload63.url;
}

export function useSeasonalArt(scripturalMonth: number, _lat: number, _lon: number) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scripturalMonth || scripturalMonth < 1 || scripturalMonth > 12) return;
    setImageUrl(buildSeasonalFallbackArt(scripturalMonth));
    setLoading(false);
    setError(null);
  }, [scripturalMonth]);

  return { imageUrl, loading, error };
}

