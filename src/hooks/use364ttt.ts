import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export interface LeaderboardSong {
  song_id: string;
  track_title: string;
  artist_name: string;
  file_url: string;
  vote_count: number;
  rank: number;
  dj_id?: string;
}

export interface WeeklyPlaylist {
  id: string;
  week_id: string;
  title: string;
  theme: string | null;
  song_ids: string[];
  rank_data: {
    song_id: string;
    vote_count: number;
    rank: number;
    title: string;
    artist: string;
  }[];
  total_votes: number;
  total_voters: number;
  generated_at: string;
}

// Calculate current week ID based on Creator calendar
export function getCurrentWeekId(): string {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const sunriseMinutes = 5 * 60 + 13; // 05:13
  const currentTimeMinutes = currentHour * 60 + currentMinute;
  
  let effectiveDate = now;
  if (currentTimeMinutes < sunriseMinutes) {
    effectiveDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  const epochDate = new Date(2025, 2, 20); // March 20, 2025
  const daysSinceEpoch = Math.floor((effectiveDate.getTime() - epochDate.getTime()) / (24 * 60 * 60 * 1000));
  
  const year = 6028 + Math.floor(daysSinceEpoch / 364);
  let weekNum = Math.floor((daysSinceEpoch % 364) / 7) + 1;
  if (weekNum > 52) weekNum = 52;
  if (weekNum < 1) weekNum = 1;

  return `${year}_${String(weekNum).padStart(2, '0')}`;
}

// Get time until next Sabbath sunrise (end of voting week)
export function getTimeUntilWeekEnd(): { days: number; hours: number; minutes: number } {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const sunriseMinutes = 5 * 60 + 13;
  const currentTimeMinutes = currentHour * 60 + currentMinute;
  
  let effectiveDate = now;
  if (currentTimeMinutes < sunriseMinutes) {
    effectiveDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  const epochDate = new Date(2025, 2, 20);
  const daysSinceEpoch = Math.floor((effectiveDate.getTime() - epochDate.getTime()) / (24 * 60 * 60 * 1000));
  
  // Day of week (1-7, where 7 is Sabbath)
  const dayOfYear = (daysSinceEpoch % 364) + 1;
  const weekDay = ((dayOfYear - 1 + 3) % 7) + 1;
  
  // Days until next Sabbath (day 7)
  const daysUntilSabbath = weekDay === 7 ? 7 : 7 - weekDay;
  
  // Calculate exact time until Sabbath sunrise
  const sabbathDate = new Date(effectiveDate);
  sabbathDate.setDate(sabbathDate.getDate() + daysUntilSabbath);
  sabbathDate.setHours(5, 13, 0, 0);
  
  const diff = sabbathDate.getTime() - now.getTime();
  const totalMinutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  
  return { days: Math.max(0, days), hours: Math.max(0, hours), minutes: Math.max(0, minutes) };
}

export function use364ttt() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const weekId = getCurrentWeekId();

  // Fetch leaderboard
  const { data: leaderboard = [], isLoading: leaderboardLoading, refetch: refetchLeaderboard } = useQuery({
    queryKey: ['364ttt-leaderboard', weekId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_weekly_leaderboard', { limit_count: 10 });
      if (error) throw error;
      return (data || []) as LeaderboardSong[];
    },
    staleTime: 15000, // 15 seconds
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch all community music for voting (same sources as Community Music Library)
  const { data: allSongs = [], isLoading: songsLoading } = useQuery({
    queryKey: ['364ttt-all-songs'],
    queryFn: async () => {
      const tracks: { id: string; track_title: string; artist_name: string; file_url: string; dj_id?: string; created_at: string; preview_url: string | null }[] = [];
      const seenTitles = new Set<string>();

      // 1. DJ tracks
      const { data: djTracks } = await supabase
        .from('dj_music_tracks')
        .select('*, radio_djs ( user_id, dj_name, avatar_url )')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (djTracks) {
        const djUserIds = [...new Set(djTracks.map(t => (t as any).radio_djs?.user_id).filter(Boolean))];
        const { data: djProfiles } = djUserIds.length > 0
          ? await supabase.from('profiles').select('user_id, display_name').in('user_id', djUserIds)
          : { data: [] };
        const profileMap = new Map((djProfiles || []).map(p => [p.user_id, p]));

        djTracks.forEach(t => {
          const dj = (t as any).radio_djs;
          const profile = dj?.user_id ? profileMap.get(dj.user_id) : null;
          const key = t.track_title.toLowerCase();
          if (!seenTitles.has(key)) {
            seenTitles.add(key);
            tracks.push({
              id: t.id,
              track_title: t.track_title,
              artist_name: t.artist_name || dj?.dj_name || profile?.display_name || 'Unknown Artist',
              file_url: t.file_url,
              dj_id: t.dj_id,
              created_at: t.created_at,
              preview_url: t.preview_url || t.file_url,
            });
          }
        });
      }

      // 2. S2G library music items
      const { data: libraryMusic } = await supabase
        .from('s2g_library_items')
        .select('*')
        .eq('is_public', true)
        .eq('type', 'music')
        .order('created_at', { ascending: false });

      if (libraryMusic) {
        const userIds = [...new Set(libraryMusic.map(item => item.user_id))];
        const { data: profiles } = userIds.length > 0
          ? await supabase.from('profiles').select('user_id, display_name').in('user_id', userIds)
          : { data: [] };
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

        libraryMusic.forEach(item => {
          const profile = profileMap.get(item.user_id);
          const key = item.title.toLowerCase();
          if (!seenTitles.has(key)) {
            seenTitles.add(key);
            tracks.push({
              id: item.id,
              track_title: item.title,
              artist_name: item.description || profile?.display_name || 'Unknown Artist',
              file_url: item.file_url,
              created_at: item.created_at,
              preview_url: item.preview_url || item.file_url,
            });
          }
        });
      }

      // 3. Products (music seeds)
      const { data: productMusic } = await supabase
        .from('products')
        .select('*, sowers ( user_id, display_name, logo_url )')
        .eq('type', 'music')
        .order('created_at', { ascending: false });

      if (productMusic) {
        const sowerUserIds = [...new Set(productMusic.map(p => (p as any).sowers?.user_id).filter(Boolean))];
        const { data: sowerProfiles } = sowerUserIds.length > 0
          ? await supabase.from('profiles').select('user_id, display_name').in('user_id', sowerUserIds)
          : { data: [] };
        const sowerProfileMap = new Map((sowerProfiles || []).map(p => [p.user_id, p]));

        productMusic.forEach(p => {
          const sower = (p as any).sowers;
          const profile = sower?.user_id ? sowerProfileMap.get(sower.user_id) : null;
          const key = (p.title || '').toLowerCase();
          if (p.file_url && !seenTitles.has(key)) {
            seenTitles.add(key);
            tracks.push({
              id: p.id,
              track_title: p.title,
              artist_name: sower?.display_name || profile?.display_name || 'Community Artist',
              file_url: p.file_url,
              created_at: p.created_at,
              preview_url: p.file_url,
            });
          }
        });
      }

      return tracks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
  });

  // Fetch user's votes for current week
  const { data: userVotes = [], refetch: refetchUserVotes } = useQuery({
    queryKey: ['364ttt-user-votes', weekId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('song_votes')
        .select('song_id')
        .eq('user_id', user.id)
        .eq('week_id', weekId);
      if (error) throw error;
      return data?.map(v => v.song_id) || [];
    },
    enabled: !!user,
  });

  // Fetch previous weekly playlists
  const { data: previousPlaylists = [], isLoading: playlistsLoading } = useQuery({
    queryKey: ['364ttt-playlists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_playlists')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []).map(p => ({
        ...p,
        rank_data: (p.rank_data || []) as WeeklyPlaylist['rank_data'],
      })) as WeeklyPlaylist[];
    },
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async (songId: string) => {
      if (!user) throw new Error('Must be logged in to vote');
      
      const { error } = await supabase
        .from('song_votes')
        .insert({ user_id: user.id, song_id: songId, week_id: weekId });
      
      if (error) {
        if (error.code === '23505') throw new Error('Already voted for this song');
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['364ttt-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['364ttt-user-votes'] });
      toast({ title: 'Vote recorded!', description: 'Your vote has been counted.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Vote failed', description: error.message, variant: 'destructive' });
    },
  });

  // Remove vote mutation
  const unvoteMutation = useMutation({
    mutationFn: async (songId: string) => {
      if (!user) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('song_votes')
        .delete()
        .eq('user_id', user.id)
        .eq('song_id', songId)
        .eq('week_id', weekId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['364ttt-leaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['364ttt-user-votes'] });
      toast({ title: 'Vote removed', description: 'Your vote has been removed.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to remove vote', description: error.message, variant: 'destructive' });
    },
  });

  // Real-time subscription for vote updates
  useEffect(() => {
    const channel = supabase
      .channel('364ttt-votes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'song_votes', filter: `week_id=eq.${weekId}` },
        () => {
          refetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [weekId, refetchLeaderboard]);

  const remainingVotes = 10 - userVotes.length;
  const hasVotedFor = (songId: string) => userVotes.includes(songId);

  return {
    weekId,
    leaderboard,
    leaderboardLoading,
    allSongs,
    songsLoading,
    userVotes,
    remainingVotes,
    hasVotedFor,
    vote: voteMutation.mutate,
    unvote: unvoteMutation.mutate,
    isVoting: voteMutation.isPending,
    previousPlaylists,
    playlistsLoading,
  };
}

// Hook to fetch a specific album
export function useWeeklyPlaylist(weekId: string) {
  return useQuery({
    queryKey: ['364ttt-album', weekId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_playlists')
        .select('*')
        .eq('week_id', weekId)
        .single();
      if (error) throw error;
      return {
        ...data,
        rank_data: (data.rank_data || []) as WeeklyPlaylist['rank_data'],
      } as WeeklyPlaylist;
    },
    enabled: !!weekId,
  });
}

// Fetch songs by IDs for album display
export function useAlbumSongs(songIds: string[]) {
  return useQuery({
    queryKey: ['364ttt-album-songs', songIds],
    queryFn: async () => {
      if (!songIds.length) return [];
      const { data, error } = await supabase
        .from('dj_music_tracks')
        .select('id, track_title, artist_name, file_url, dj_id, preview_url')
        .in('id', songIds);
      if (error) throw error;
      
      // Sort by the order in songIds
      const songMap = new Map(data?.map(s => [s.id, s]));
      return songIds.map(id => songMap.get(id)).filter(Boolean);
    },
    enabled: songIds.length > 0,
  });
}
