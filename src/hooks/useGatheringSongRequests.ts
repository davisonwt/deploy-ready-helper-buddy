/**
 * useGatheringSongRequests — visitor-facing "Request a song" + host/mod
 * Play/Skip queue (`gathering_song_requests`, see its own migration
 * comment). Never auto-plays: a request only becomes audible when the
 * host or a moderator explicitly taps Play, which hands the track to
 * LiveStage's own existing `playMusicSeed`-style mechanism -- same board
 * broadcast + `gathering_sessions.board_state` write-through every other
 * "now playing" change already goes through, not a second playback path.
 *
 * DB is the source of truth for the host/mod queue (RLS already scopes
 * `select` to the requester themselves, the session host, or a session
 * moderator -- see the migration); broadcast on top is purely so a new
 * request / a Play-Skip decision reaches an already-open queue panel
 * instantly instead of waiting on a manual refetch.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface SongRequest {
  id: string;
  song_id: string;
  song_title: string;
  requested_by: string;
  requester_name: string;
  status: 'pending' | 'played' | 'skipped';
  requested_at: number;
}

export function useGatheringSongRequests(sessionId: string | null, isHostOrMod: boolean) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Host/mod queue hydration -- a plain viewer never needs the full list
  // (RLS would refuse it anyway for anyone else's requests).
  useEffect(() => {
    if (!sessionId || !isHostOrMod) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('gathering_song_requests' as any)
        .select('id, song_id, status, requested_at, requested_by, dj_music_tracks:song_id(track_title)')
        .eq('session_id', sessionId)
        .eq('status', 'pending')
        .order('requested_at', { ascending: true });
      if (cancelled || error || !data) return;
      const rows = data as any[];
      const requesterIds = Array.from(new Set(rows.map((r) => r.requested_by)));
      const nameByUser = new Map<string, string>();
      if (requesterIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, username')
          .in('user_id', requesterIds);
        for (const p of (profiles as any[]) ?? []) {
          nameByUser.set(p.user_id, p.display_name || p.username || 'A visitor');
        }
      }
      if (cancelled) return;
      setRequests(rows.map((r) => ({
        id: r.id,
        song_id: r.song_id,
        song_title: r.dj_music_tracks?.track_title ?? 'Untitled track',
        requested_by: r.requested_by,
        requester_name: nameByUser.get(r.requested_by) ?? 'A visitor',
        status: r.status,
        requested_at: new Date(r.requested_at).getTime(),
      })));
    })();
    return () => { cancelled = true; };
  }, [sessionId, isHostOrMod]);

  // Live updates for whoever already has the queue panel open.
  useEffect(() => {
    if (!sessionId) return;
    const ch = supabase.channel(`gathering-songs:${sessionId}`, { config: { broadcast: { self: false } } });
    chRef.current = ch;
    ch.on('broadcast', { event: 'song_requested' }, ({ payload }) => {
      const r = payload as SongRequest;
      setRequests((prev) => prev.some((x) => x.id === r.id) ? prev : [...prev, r]);
    });
    ch.on('broadcast', { event: 'song_status' }, ({ payload }) => {
      const { id } = payload as { id: string; status: SongRequest['status'] };
      // Only "pending" is ever kept in local state (this is the queue view) -- Play/Skip just drops it.
      setRequests((prev) => prev.filter((r) => r.id !== id));
    });
    ch.subscribe();
    return () => { supabase.removeChannel(ch); chRef.current = null; };
  }, [sessionId]);

  const requestSong = useCallback(async (track: { id: string; title: string }) => {
    if (!user || !sessionId) return { success: false, error: 'Not signed in, or no live session.' };
    const requesterName = (user as any)?.user_metadata?.display_name || user.email?.split('@')[0] || 'A visitor';
    const { data, error } = await supabase
      .from('gathering_song_requests' as any)
      .insert({ session_id: sessionId, requested_by: user.id, song_id: track.id, status: 'pending' })
      .select('id, requested_at')
      .single();
    if (error || !data) return { success: false, error: error?.message ?? 'Could not request that song.' };
    const r: SongRequest = {
      id: (data as any).id,
      song_id: track.id,
      song_title: track.title,
      requested_by: user.id,
      requester_name: requesterName,
      status: 'pending',
      requested_at: new Date((data as any).requested_at).getTime(),
    };
    chRef.current?.send({ type: 'broadcast', event: 'song_requested', payload: r });
    setRequests((prev) => [...prev, r]);
    return { success: true };
  }, [user, sessionId]);

  const resolveRequest = useCallback((id: string, status: 'played' | 'skipped') => {
    if (!isHostOrMod) return;
    setRequests((prev) => prev.filter((r) => r.id !== id));
    chRef.current?.send({ type: 'broadcast', event: 'song_status', payload: { id, status } });
    supabase.from('gathering_song_requests' as any).update({ status }).eq('id', id)
      .then(({ error }) => { if (error) console.error('resolveRequest: update failed', error); });
  }, [isHostOrMod]);

  const markPlayed = useCallback((id: string) => resolveRequest(id, 'played'), [resolveRequest]);
  const markSkipped = useCallback((id: string) => resolveRequest(id, 'skipped'), [resolveRequest]);

  return { requests, requestSong, markPlayed, markSkipped };
}
