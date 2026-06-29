import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getRegion, scripturalMonthToSeason, describeRegion } from '@/utils/calendarSeason';

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
          setImageUrl('');
        } else {
          const url = (data as { imageUrl?: string })?.imageUrl ?? '';
          setImageUrl(url);
        }
      })
      .catch((e) => {
        if (!cancelled) setError((e as Error).message);
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
