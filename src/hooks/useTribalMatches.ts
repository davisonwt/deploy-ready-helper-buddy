/**
 * useTribalMatches — fetches and manages tribal collaboration suggestions for the
 * current member (both as initiator and as receiver), and exposes mutators to
 * accept / decline / refresh via the agent-bestowal-matcher edge function.
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface TribalMatch {
  id: string;
  member_a_id: string;
  member_b_id: string;
  match_type: string;
  match_reason: string;
  suggested_action: string | null;
  confidence_score: number;
  status: string;
  metadata: Record<string, any>;
  seed_a_id: string | null;
  seed_b_id: string | null;
  created_at: string;
  partner_id: string;       // computed: the OTHER member
  partner_name?: string;
  partner_avatar?: string | null;
}

export function useTribalMatches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<TribalMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('tribal_matches')
      .select('*')
      .or(`member_a_id.eq.${user.id},member_b_id.eq.${user.id}`)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(12);
    const rows = (data ?? []) as any[];
    const partnerIds = Array.from(new Set(rows.map(r => r.member_a_id === user.id ? r.member_b_id : r.member_a_id)));
    let profileMap: Record<string, { display_name?: string; avatar_url?: string | null }> = {};
    if (partnerIds.length) {
      const { data: profs } = await supabase
        .from('profiles_public')
        .select('user_id,display_name,avatar_url')
        .in('user_id', partnerIds);
      (profs ?? []).forEach((p: any) => { profileMap[p.user_id] = p; });
    }
    setMatches(rows.map(r => {
      const partnerId = r.member_a_id === user.id ? r.member_b_id : r.member_a_id;
      return {
        ...r,
        partner_id: partnerId,
        partner_name: profileMap[partnerId]?.display_name,
        partner_avatar: profileMap[partnerId]?.avatar_url ?? null,
      } as TribalMatch;
    }));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(async (dispatchDm = false) => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('agent-bestowal-matcher', {
        body: { mode: 'scan', dispatch_dm: dispatchDm, max_pairs: 5 },
      });
      if (error) throw error;
      toast.success(`🤝 ${data?.created ?? 0} new tribal match${(data?.created ?? 0) === 1 ? '' : 'es'} found`);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not refresh matches');
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, load]);

  const respond = useCallback(async (matchId: string, accept: boolean) => {
    if (!user?.id) return;
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    const isA = match.member_a_id === user.id;
    const responseField = isA ? 'member_a_response' : 'member_b_response';
    const newStatus = accept ? 'accepted' : 'declined';
    const { error } = await supabase
      .from('tribal_matches')
      .update({ [responseField]: newStatus, status: newStatus })
      .eq('id', matchId);
    if (error) { toast.error(error.message); return; }
    toast.success(accept ? '🌿 Match accepted — Debian will introduce you' : 'Suggestion gently set aside');
    setMatches(prev => prev.filter(m => m.id !== matchId));
  }, [user?.id, matches]);

  return { matches, loading, refreshing, refresh, respond };
}
