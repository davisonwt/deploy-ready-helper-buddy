import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CommunityGrowthStats {
  sowers: number;
  orchards: number;
  seeds: number;
  /** Never actually queried (pre-existing: DashboardPage.jsx's own copy of
   *  this never set it either) -- kept at 0 for parity with "Harvest
   *  forming" as it already renders today. Not this batch's job to fix. */
  members: number;
}

const DEFAULT_STATS: CommunityGrowthStats = { sowers: 4, orchards: 0, seeds: 56, members: 0 };

/**
 * Platform-wide "Your Growth" counts -- verified sowers, active orchards,
 * total seeds. Extracted from DashboardPage.jsx's own inline queries
 * (Farm-Stalls batch 2e) so the stall interior's Today/Omer/Growth panel
 * can show the same numbers without a second copy of the queries.
 */
export function useCommunityGrowthStats(): CommunityGrowthStats {
  const [stats, setStats] = useState<CommunityGrowthStats>(DEFAULT_STATS);

  useEffect(() => {
    let alive = true;
    supabase.from('sowers').select('*', { count: 'exact', head: true }).eq('is_verified', true)
      .then(({ count }) => { if (alive) setStats((s) => ({ ...s, sowers: count || 4 })); });
    supabase.from('orchards').select('*', { count: 'exact', head: true }).eq('status', 'active')
      .then(({ count }) => { if (alive) setStats((s) => ({ ...s, orchards: count || 0 })); });
    supabase.from('seeds').select('*', { count: 'exact', head: true })
      .then(({ count }) => { if (alive) setStats((s) => ({ ...s, seeds: count || 56 })); });
    return () => { alive = false; };
  }, []);

  return stats;
}
