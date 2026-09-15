/**
 * useGatheringModerators — per-session moderators for a Gathering Room live
 * (`gathering_moderators`, see its own migration comment). Host-appointed,
 * scoped to one `gathering_sessions.id` only -- never persists across
 * sessions, matching the spec directly ("Mods are per-session only").
 *
 * Called independently by both LiveStage.tsx (mute/remove/advance-queue
 * gating) and LiveStageOverlay.tsx (chat-delete gating) -- they're parent/
 * child, not siblings, so there's no single shared React tree location to
 * hoist one instance into without a larger refactor of currently-working
 * board/queue code. Both instances agree because they share the same
 * source of truth: one DB table, one broadcast channel name
 * (`gathering-mods:${sessionId}`), keyed by the resolved session id.
 *
 * Session-id resolution mirrors useLiveStage.ts's own (host: the
 * `hostSessionId` prop is authoritative and instant; guest: the one active
 * un-ended row for this seed) -- duplicated rather than extracted, on
 * purpose: useLiveStage's internals are the audio/board/queue engine this
 * whole session already depends on, and this hook has no reason to touch
 * that file's working internals for an unrelated feature.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useGatheringModerators(seedId: string | null, isHost: boolean, hostSessionId?: string | null) {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [moderatorUserIds, setModeratorUserIds] = useState<Set<string>>(new Set());
  const chRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Resolve which gathering_sessions row this live actually is.
  useEffect(() => {
    if (!seedId) { setSessionId(null); return; }
    if (hostSessionId) { setSessionId(hostSessionId); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('gathering_sessions' as any)
        .select('id')
        .eq('seed_id', seedId)
        .is('ended_at', null)
        .maybeSingle();
      if (!cancelled) setSessionId((data as any)?.id ?? null);
    })();
    return () => { cancelled = true; };
  }, [seedId, hostSessionId]);

  // Hydrate current moderators + subscribe for live add/remove, once the
  // session id is known.
  useEffect(() => {
    if (!sessionId) { setModeratorUserIds(new Set()); return; }
    let cancelled = false;

    supabase
      .from('gathering_moderators' as any)
      .select('user_id')
      .eq('session_id', sessionId)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setModeratorUserIds(new Set((data as any[]).map((r) => r.user_id)));
      });

    const ch = supabase.channel(`gathering-mods:${sessionId}`, { config: { broadcast: { self: false } } });
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
  }, [sessionId]);

  const addModerator = useCallback((userId: string) => {
    if (!isHost || !sessionId || !user) return;
    setModeratorUserIds((prev) => new Set(prev).add(userId));
    chRef.current?.send({ type: 'broadcast', event: 'mod_added', payload: { user_id: userId } });
    supabase.from('gathering_moderators' as any)
      .insert({ session_id: sessionId, user_id: userId, added_by: user.id })
      .then(({ error }) => { if (error) console.error('addModerator: insert failed', error); });
  }, [isHost, sessionId, user]);

  const removeModerator = useCallback((userId: string) => {
    if (!isHost || !sessionId) return;
    setModeratorUserIds((prev) => { const next = new Set(prev); next.delete(userId); return next; });
    chRef.current?.send({ type: 'broadcast', event: 'mod_removed', payload: { user_id: userId } });
    supabase.from('gathering_moderators' as any)
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .then(({ error }) => { if (error) console.error('removeModerator: delete failed', error); });
  }, [isHost, sessionId]);

  const isModerator = !!user && moderatorUserIds.has(user.id);

  return {
    sessionId,
    moderatorUserIds,
    isModerator,
    /** Host OR moderator -- the gate every moderation action in the spec actually uses. */
    isHostOrMod: isHost || isModerator,
    addModerator,
    removeModerator,
  };
}
