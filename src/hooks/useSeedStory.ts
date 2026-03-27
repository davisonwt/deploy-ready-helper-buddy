import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// In-memory cache so stories don't regenerate on scroll
const storyCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string>>();

interface SeedStoryParams {
  seedId: string;
  sowerName: string;
  seedTitle: string;
  daysSincePlanted: number;
  bestowalsCount: number;
  engagements: number;
  seedCategory: string;
}

export const useSeedStory = (params: SeedStoryParams) => {
  const [story, setStory] = useState<string | null>(storyCache.get(params.seedId) || null);
  const [loading, setLoading] = useState(!storyCache.has(params.seedId));

  useEffect(() => {
    if (storyCache.has(params.seedId)) {
      setStory(storyCache.get(params.seedId)!);
      setLoading(false);
      return;
    }

    // Deduplicate concurrent requests for the same seed
    if (pendingRequests.has(params.seedId)) {
      setLoading(true);
      pendingRequests.get(params.seedId)!.then((s) => {
        setStory(s);
        setLoading(false);
      }).catch(() => setLoading(false));
      return;
    }

    setLoading(true);
    console.log('🌱 Fetching story for seed:', params.seedId, params.seedTitle);

    const request = (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('generate-seed-story', {
          body: {
            sowerName: params.sowerName,
            seedTitle: params.seedTitle,
            daysSincePlanted: params.daysSincePlanted,
            bestowalsCount: params.bestowalsCount,
            engagements: params.engagements,
            seedCategory: params.seedCategory,
          },
        });

        console.log('🌱 Story response for', params.seedId, ':', { data, error });

        if (error) {
          console.error('🌱 Story error:', error);
          return '';
        }
        if (!data?.story) {
          console.warn('🌱 No story in response:', data);
          return '';
        }
        const storyText = data.story as string;
        storyCache.set(params.seedId, storyText);
        return storyText;
      } catch (e) {
        console.error('🌱 Story fetch failed:', e);
        return '';
      }
    })();

    pendingRequests.set(params.seedId, request);
    request.then((s) => {
      setStory(s);
      setLoading(false);
      pendingRequests.delete(params.seedId);
    });
  }, [params.seedId]);

  return { story, loading };
};
