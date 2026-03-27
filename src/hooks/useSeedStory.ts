import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const storyCache = new Map<string, string>();
const failedSeedIds = new Set<string>();
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
  const cached = storyCache.get(params.seedId);
  const hasCachedStory = !!cached?.trim();

  const [story, setStory] = useState<string | null>(hasCachedStory ? cached! : null);
  const [loading, setLoading] = useState(!hasCachedStory && !failedSeedIds.has(params.seedId));

  useEffect(() => {
    const existing = storyCache.get(params.seedId);
    if (existing?.trim()) {
      setStory(existing);
      setLoading(false);
      return;
    }

    // Clean up stale/empty cache values from earlier failed runs
    if (storyCache.has(params.seedId) && !existing?.trim()) {
      storyCache.delete(params.seedId);
    }

    if (failedSeedIds.has(params.seedId)) {
      setLoading(false);
      return;
    }

    if (pendingRequests.has(params.seedId)) {
      setLoading(true);
      pendingRequests
        .get(params.seedId)!
        .then((s) => {
          setStory(s || null);
          setLoading(false);
        })
        .catch(() => setLoading(false));
      return;
    }

    setLoading(true);

    const request = (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          return '';
        }

        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-seed-story`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            sowerName: params.sowerName,
            seedTitle: params.seedTitle,
            daysSincePlanted: params.daysSincePlanted,
            bestowalsCount: params.bestowalsCount,
            engagements: params.engagements,
            seedCategory: params.seedCategory,
          }),
        });

        if (!response.ok) {
          return '';
        }

        const data = await response.json();
        const storyText = typeof data?.story === 'string' ? data.story.trim() : '';
        if (!storyText) {
          return '';
        }

        storyCache.set(params.seedId, storyText);
        return storyText;
      } catch {
        return '';
      }
    })();

    pendingRequests.set(params.seedId, request);
    request
      .then((s) => {
        if (!s) {
          failedSeedIds.add(params.seedId);
          setStory(null);
        } else {
          setStory(s);
        }
      })
      .finally(() => {
        pendingRequests.delete(params.seedId);
        setLoading(false);
      });
  }, [
    params.seedId,
    params.sowerName,
    params.seedTitle,
    params.daysSincePlanted,
    params.bestowalsCount,
    params.engagements,
    params.seedCategory,
  ]);

  return { story, loading };
};
