/**
 * useTribalHeartsProfile — load and mutate the current member's Tribal Hearts profile.
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface HeartsProfile {
  user_id: string;
  display_first_name: string | null;
  gender: 'male' | 'female';
  seeking: 'male' | 'female';
  birthdate: string;
  age_verified: boolean;
  photo_verified: boolean;
  bio: string | null;
  values_list: string[];
  interests: string[];
  lifestyle: Record<string, any>;
  location_country: string | null;
  location_region: string | null;
  timezone: string | null;
  distance_pref_km: number | null;
  status: 'active' | 'paused' | 'hidden';
  photos: string[];
  voice_note_url: string | null;
  voice_note_duration_sec: number | null;
  seeking_intent: 'friendship' | 'courtship' | 'connection';
  about_seen_at: string | null;
}

export function useTribalHeartsProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<HeartsProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('tribal_hearts_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    setProfile(data as HeartsProfile | null);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (patch: Partial<HeartsProfile>) => {
    if (!user?.id) throw new Error('Not signed in');
    const payload = { user_id: user.id, ...patch } as any;
    const { data, error } = await supabase
      .from('tribal_hearts_profiles')
      .upsert(payload, { onConflict: 'user_id' })
      .select('*')
      .single();
    if (error) throw error;
    setProfile(data as HeartsProfile);
    return data as HeartsProfile;
  }, [user?.id]);

  const setStatus = useCallback(async (status: HeartsProfile['status']) => {
    if (!profile) return;
    return save({ status });
  }, [profile, save]);

  return { profile, loading, save, setStatus, reload: load };
}
