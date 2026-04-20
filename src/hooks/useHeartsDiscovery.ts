/**
 * useHeartsDiscovery — Ambassador-only browse of opposite-gender active profiles.
 * Server-side RLS already restricts what this query can return.
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTribalHeartsProfile } from '@/hooks/useTribalHeartsProfile';

export interface HeartsBrowseProfile {
  user_id: string;
  display_first_name: string | null;
  bio: string | null;
  photos: string[];
  voice_note_url: string | null;
  voice_note_duration_sec: number | null;
  birthdate: string;
  location_country: string | null;
  location_region: string | null;
  values_list: string[];
  interests: string[];
  seeking_intent: string;
  photo_verified: boolean;
}

export function useHeartsDiscovery() {
  const { profile } = useTribalHeartsProfile();
  const [profiles, setProfiles] = useState<HeartsBrowseProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.user_id) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('tribal_hearts_profiles')
      .select('user_id,display_first_name,bio,photos,voice_note_url,voice_note_duration_sec,birthdate,location_country,location_region,values_list,interests,seeking_intent,photo_verified')
      .eq('status', 'active')
      .neq('user_id', profile.user_id)
      .eq('gender', profile.gender === 'male' ? 'female' : 'male')
      .order('last_active_at', { ascending: false })
      .limit(80);
    setProfiles((data ?? []) as HeartsBrowseProfile[]);
    setLoading(false);
  }, [profile?.user_id, profile?.gender]);

  useEffect(() => { load(); }, [load]);

  return { profiles, loading, reload: load };
}

export function calcAge(birthdate: string): number {
  if (!birthdate) return 0;
  const b = new Date(birthdate);
  const diff = Date.now() - b.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}
