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

  useEffect(() => {
    if (storyCache.has(params.seedId)) {
      setStory(storyCache.get(params.seedId)!);
      return;
    }

    // Deduplicate concurrent requests for the same seed
    if (pendingRequests.has(params.seedId)) {
      pendingRequests.get(params.seedId)!.then((s) => setStory(s)).catch(() => {});
      return;
    }

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

        if (error || !data?.story) return '';
        const storyText = data.story as string;
        storyCache.set(params.seedId, storyText);
        return storyText;
      } catch {
        return '';
      }
    })();

    pendingRequests.set(params.seedId, request);
    request.then((s) => {
      setStory(s);
      pendingRequests.delete(params.seedId);
    });
  }, [params.seedId]);

  return story;
};
