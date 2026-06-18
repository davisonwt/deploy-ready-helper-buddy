import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { HeartsProfile } from '@/components/tribal-hearts/ProfileCard';

interface SparkResult {
  ok: boolean;
  mutual?: boolean;
  match_id?: string;
  remaining_today?: number;
  sent_today?: number;
  code?: string;
  message?: string;
}

export function useTribalHearts() {
  const { user } = useAuth() as any;
  const [profiles, setProfiles] = useState<HeartsProfile[]>([]);
  const [myProfile, setMyProfile] = useState<HeartsProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sparksToday, setSparksToday] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [passedIds, setPassedIds] = useState<Set<string>>(new Set());

  // Load my profile + count today's sparks
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: mine } = await supabase
        .from('tribal_hearts_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!alive) return;
      setMyProfile(mine as any);

      // Count today's sparks
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('tribal_hearts_matches')
        .select('id', { count: 'exact', head: true })
        .eq('member_a_id', user.id)
        .gte('created_at', todayStart.toISOString());
      if (!alive) return;
      setSparksToday(count ?? 0);

      // Load candidates via SECURITY DEFINER RPC that returns only safe
      // browsing columns (no raw birthdate, no exact lifestyle/timezone).
      // Server-side filter: opposite-gender, active, not me, member-gated.
      if (mine?.gender && mine?.seeking) {
        const { data: candidates } = await supabase
          .rpc('get_hearts_browse', { p_limit: 40, p_offset: 0 });


        // Filter out anyone we've already matched/sparked
        const { data: existing } = await supabase
          .from('tribal_hearts_matches')
          .select('member_a_id, member_b_id')
          .or(`member_a_id.eq.${user.id},member_b_id.eq.${user.id}`);
        const seen = new Set<string>();
        existing?.forEach((m: any) => {
          seen.add(m.member_a_id === user.id ? m.member_b_id : m.member_a_id);
        });
        const filtered =
          (candidates as any[])?.filter(
            (c) => !seen.has(c.user_id) && !passedIds.has(c.user_id)
          ) || [];
        // Mock compatibility score: shared interests
        const myInterests = new Set(mine.interests || []);
        filtered.forEach((c: any) => {
          const shared =
            (c.interests || []).filter((i: string) => myInterests.has(i)).length;
          c.compatibility_score = Math.min(
            99,
            55 + shared * 10 + Math.floor(Math.random() * 12)
          );
        });
        if (!alive) return;
        setProfiles(filtered);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const sendSpark = useCallback(
    async (
      recipientId: string,
      message: string,
      voiceUrl?: string
    ): Promise<SparkResult> => {
      const { data, error } = await supabase.rpc(
        'send_tribal_hearts_spark' as any,
        {
          _recipient_id: recipientId,
          _message: message || null,
          _voice_url: voiceUrl || null,
        }
      );
      if (error) {
        return { ok: false, message: error.message };
      }
      const result = data as SparkResult;
      if (result.ok) {
        setSparksToday((n) => n + 1);
        setProfiles((p) => p.filter((x) => x.user_id !== recipientId));
      }
      return result;
    },
    []
  );

  const passProfile = useCallback((id: string) => {
    setPassedIds((s) => new Set(s).add(id));
    setProfiles((p) => p.filter((x) => x.user_id !== id));
  }, []);

  const saveProfile = useCallback((id: string) => {
    setSavedIds((s) => new Set(s).add(id));
    setProfiles((p) => p.filter((x) => x.user_id !== id));
  }, []);

  return {
    profiles,
    myProfile,
    loading,
    sparksToday,
    sparksRemaining: Math.max(0, 8 - sparksToday),
    sendSpark,
    passProfile,
    saveProfile,
    savedIds,
  };
}
