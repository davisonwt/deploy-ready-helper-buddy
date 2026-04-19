/**
 * useAgentAccess — determines which S2G Agents the current member can use.
 *
 * Free for everyone:  gentoo, mint, debian
 * Ambassador-only:    tux, ubuntu, kali, fedora, arch
 *
 * Founders on `s2g_agent_free_access` are treated as ambassadors.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const FREE_AGENTS = ['gentoo', 'mint', 'debian'] as const;
export const PREMIUM_AGENTS = ['tux', 'ubuntu', 'kali', 'fedora', 'arch'] as const;
export type AgentKey = typeof FREE_AGENTS[number] | typeof PREMIUM_AGENTS[number];

export function isPremiumAgent(key: string): boolean {
  return (PREMIUM_AGENTS as readonly string[]).includes(key);
}

export function useAgentAccess() {
  const { user } = useAuth();
  const [isAmbassador, setIsAmbassador] = useState(false);
  const [hasFreeAccess, setHasFreeAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [ambRes, freeRes] = await Promise.all([
        supabase
          .from('ambassador_applications')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'approved')
          .maybeSingle(),
        supabase
          .from('s2g_agent_free_access')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setIsAmbassador(!!ambRes.data);
      setHasFreeAccess(!!freeRes.data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const canUse = (agent: string) => {
    if (!isPremiumAgent(agent)) return true;
    return isAmbassador || hasFreeAccess;
  };

  return { loading, isAmbassador, hasFreeAccess, canUse };
}
