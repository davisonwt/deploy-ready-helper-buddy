/**
 * useGatheringModerators — PERSISTENT per-host moderators for a Gathering
 * Room live (`gathering_moderators`, see its own migration comment).
 * Host-appointed, scoped to the host's own user_id, not any one session --
 * once appointed, a moderator stays one for every room that host ever
 * runs, across sessions, until the host explicitly removes them.
 * (2026-09-15 revision -- previously session_id-scoped ("per-session
 * only"); that version was never applied to production, so this replaces
 * it outright.)
 *
 * Called independently by both LiveStage.tsx (mute/remove/advance-queue
 * gating) and LiveStageOverlay.tsx (chat-delete gating) -- they're parent/
 * child, not siblings, so there's no single shared React tree location to
 * hoist one instance into without a larger refactor of currently-working
 * board/queue code. Both instances agree because they share the same
 * source of truth: one DB table, one broadcast channel name
 * (`gathering-mods:${hostId}`).
 *
 * host-id resolution: for the host's own client, hostId is just their own
 * user_id (no query needed). For a guest/viewer, resolved from the same
 * gathering_sessions row useLiveStage.ts itself reads for late-joiner
 * hydration (host: hostSessionId prop is authoritative and instant;
 * guest: the one active un-ended row for this seed) -- duplicated rather
 * than extracted, on purpose: useLiveStage's internals are the audio/
 * board/queue engine this whole session already depends on, and this hook
 * has no reason to touch that file's working internals for an unrelated
 * feature.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useGatheringModerators(seedId: string | null, isHost: boolean, hostSessionId?: string | null) {
  const { user } = useAuth();
  const [hostId, setHostId] = useState<string | null>(null);
  const [moderatorUserIds, setModeratorUserIds] = useState<Set<string>>(new Set());
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Resolve whose room this actually is -- trivial for the host's own
  // client, one lookup for anyone else.
  useEffect(() => {
    if (!seedId) { setHostId(null); return; }
    if (isHost && user) { setHostId(user.id); return; }
    let cancelled = false;
    (async () => {
      const query = hostSessionId
        ? supabase.from('gathering_sessions' as any).select('host_id').eq('id', hostSessionId).maybeSingle()
        : supabase.from('gathering_sessions' as any).select('host_id').eq('seed_id', seedId).is('ended_at', null).maybeSingle();
      const { data } = await query;
      if (!cancelled) setHostId((data as any)?.host_id ?? null);
    })();
    return () => { cancelled = true; };
  }, [seedId, isHost, hostSessionId, user]);

  // Hydrate current moderators + subscribe for live add/remove, once the
  // host is known.
  useEffect(() => {
    if (!hostId) { setModeratorUserIds(new Set()); return; }
    let cancelled = false;

    supabase
      .from('gathering_moderators' as any)
      .select('user_id')
      .eq('host_id', hostId)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setModeratorUserIds(new Set((data as any[]).map((r) => r.user_id)));
      });

    const ch = supabase.channel(`gathering-mods:${hostId}`, { config: { broadcast: { self: false } } });
    chRef.current = ch;
    ch.on('broadcast', { event: 'mod_added' }, ({ payload }) => {
      const { user_id } = payload as { user_id: string };
      setModeratorUserIds((prev) => new Set(prev).add(user_id));
    });
    ch.on('broadcast', { event: 'mod_removed' }, ({ payload }) => {
      const { user_id } = payload as { user_id: string };
      setModeratorUserIds((prev) => { const next = new Set(prev); next.delete(user_id); return next; });
    });
    ch.subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
      chRef.current = null;
    };
  }, [hostId]);

  const addModerator = useCallback((userId: string) => {
    if (!isHost || !hostId || !user) return;
    setModeratorUserIds((prev) => new Set(prev).add(userId));
    chRef.current?.send({ type: 'broadcast', event: 'mod_added', payload: { user_id: userId } });
    supabase.from('gathering_moderators' as any)
      .upsert({ host_id: hostId, user_id: userId, added_by: user.id }, { onConflict: 'host_id,user_id' })
      .then(({ error }) => { if (error) console.error('addModerator: insert failed', error); });
  }, [isHost, hostId, user]);

  const removeModerator = useCallback((userId: string) => {
    if (!isHost || !hostId) return;
    setModeratorUserIds((prev) => { const next = new Set(prev); next.delete(userId); return next; });
    chRef.current?.send({ type: 'broadcast', event: 'mod_removed', payload: { user_id: userId } });
    supabase.from('gathering_moderators' as any)
      .delete()
      .eq('host_id', hostId)
      .eq('user_id', userId)
      .then(({ error }) => { if (error) console.error('removeModerator: delete failed', error); });
  }, [isHost, hostId]);

  const isModerator = !!user && moderatorUserIds.has(user.id);

  return {
    hostId,
    moderatorUserIds,
    isModerator,
    /** Host OR moderator -- the gate every moderation action in the spec actually uses. */
    isHostOrMod: isHost || isModerator,
    addModerator,
    removeModerator,
  };
}
