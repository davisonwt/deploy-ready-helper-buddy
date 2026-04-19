import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type TribalTier = 'seedling' | 'sprout' | 'sower' | 'mentor' | 'elder';

export interface TribalScore {
  user_id: string;
  score: number;
  tier: TribalTier;
  badges: string[];
  breakdown: Record<string, number>;
  bestowals_given_count: number;
  bestowals_received_count: number;
  orchards_count: number;
  tribe_size: number;
  helpful_votes: number;
  reviews_avg_rating: number;
  last_recomputed_at: string;
}

export const TIER_META: Record<TribalTier, { emoji: string; label: string; gradient: string; min: number }> = {
  seedling: { emoji: '🌱', label: 'Seedling',  gradient: 'from-lime-400 to-emerald-400',  min: 0 },
  sprout:   { emoji: '🌿', label: 'Sprout',    gradient: 'from-emerald-400 to-teal-500',  min: 75 },
  sower:    { emoji: '🌾', label: 'Sower',     gradient: 'from-teal-500 to-cyan-500',     min: 250 },
  mentor:   { emoji: '🌳', label: 'Mentor',    gradient: 'from-amber-400 to-orange-500',  min: 500 },
  elder:    { emoji: '🌟', label: 'Elder',     gradient: 'from-fuchsia-500 to-rose-500',  min: 750 },
};

export const BADGE_META: Record<string, { emoji: string; label: string; description: string }> = {
  bestower:  { emoji: '🎁', label: 'Bestower',   description: 'Has given 10+ bestowals to the tribe' },
  sower:     { emoji: '🌱', label: 'Sower',      description: 'Has planted 5+ orchards' },
  connector: { emoji: '🤝', label: 'Connector',  description: 'Built a tribe of 5+ members' },
  mentor:    { emoji: '🧙', label: 'Mentor',     description: 'Maintains a 4.5+ rating' },
  helper:    { emoji: '💬', label: 'Helper',     description: '50+ helpful community contributions' },
};

export function useTribalScore(userId?: string) {
  const { user } = useAuth();
  const targetId = userId ?? user?.id ?? null;
  const [score, setScore] = useState<TribalScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!targetId) { setLoading(false); return; }
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('tribal_scores')
        .select('*')
        .eq('user_id', targetId)
        .maybeSingle();
      if (active) {
        setScore(data as TribalScore | null);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [targetId]);

  const recompute = async () => {
    if (!targetId) return;
    await supabase.rpc('recompute_tribal_score', { _user_id: targetId });
    const { data } = await supabase
      .from('tribal_scores').select('*').eq('user_id', targetId).maybeSingle();
    setScore(data as TribalScore | null);
  };

  return { score, loading, recompute };
}
