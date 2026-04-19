/**
 * useTribalHeartsMatches — fetches suggested matches for the current member,
 * lets them accept/pass, and triggers the matcher / icebreaker edge functions.
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface HeartsMatch {
  id: string;
  member_a_id: string;
  member_b_id: string;
  compatibility_score: number;
  match_reasons: any[];
  a_response: 'pending' | 'accepted' | 'passed';
  b_response: 'pending' | 'accepted' | 'passed';
  status: 'pending' | 'mutual' | 'declined' | 'expired';
  chat_room_id: string | null;
  partner_id: string;
  partner: {
    display_first_name: string | null;
    bio: string | null;
    location_country: string | null;
    location_region: string | null;
    values_list: string[];
    interests: string[];
    photo_verified: boolean;
  } | null;
  created_at: string;
}

export function useTribalHeartsMatches() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<HeartsMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    const { data: rows } = await supabase
      .from('tribal_hearts_matches')
      .select('*')
      .or(`member_a_id.eq.${user.id},member_b_id.eq.${user.id}`)
      .in('status', ['pending', 'mutual'])
      .order('compatibility_score', { ascending: false })
      .limit(20);

    const partnerIds = Array.from(new Set((rows ?? []).map(r =>
      r.member_a_id === user.id ? r.member_b_id : r.member_a_id
    )));

    let partnerMap: Record<string, any> = {};
    if (partnerIds.length) {
      const { data: profs } = await supabase
        .from('tribal_hearts_profiles')
        .select('user_id,display_first_name,bio,location_country,location_region,values_list,interests,photo_verified')
        .in('user_id', partnerIds);
      (profs ?? []).forEach(p => { partnerMap[p.user_id] = p; });
    }

    setMatches((rows ?? []).map(r => {
      const partnerId = r.member_a_id === user.id ? r.member_b_id : r.member_a_id;
      return { ...r, partner_id: partnerId, partner: partnerMap[partnerId] ?? null } as HeartsMatch;
    }));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('tribal-hearts-matcher', { body: {} });
      if (error) throw error;
      toast.success(`🌸 Found ${data?.created ?? 0} new matches`);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not refresh matches');
    } finally { setRefreshing(false); }
  }, [load]);

  const respond = useCallback(async (matchId: string, accept: boolean) => {
    if (!user?.id) return;
    const m = matches.find(x => x.id === matchId);
    if (!m) return;
    const isA = m.member_a_id === user.id;
    const field = isA ? 'a_response' : 'b_response';
    const value = accept ? 'accepted' : 'passed';
    const { data: updated, error } = await supabase
      .from('tribal_hearts_matches')
      .update({ [field]: value })
      .eq('id', matchId)
      .select('*')
      .single();
    if (error) { toast.error(error.message); return; }

    if (updated.status === 'mutual') {
      const { data: ice } = await supabase.functions.invoke('tribal-hearts-icebreaker', { body: { match_id: matchId } });
      toast.success('🌸 It\'s mutual! Your safe ChatApp room is ready.');
      await load();
      return ice?.room_id ?? null;
    }
    toast.success(accept ? '🌷 Saved — fingers crossed!' : 'Gently set aside 🍃');
    await load();
    return null;
  }, [user?.id, matches, load]);

  return { matches, loading, refreshing, refresh, respond, reload: load };
}
