/**
 * useGatheringSessionId — resolves the current live's own
 * `gathering_sessions.id`. Trivial for the host (the `hostSessionId` prop
 * is already authoritative), one lookup for anyone else. Small and
 * standalone on purpose: useLiveStage.ts resolves this same value
 * internally for its own late-joiner hydration, but doesn't expose it, and
 * its internals are the audio/board/queue engine this whole session
 * already depends on -- this hook exists so a caller that only needs the
 * bare id (e.g. LiveStage.tsx's song-request queue, scoped per session,
 * not per host) doesn't have to touch that file.
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useGatheringSessionId(seedId: string | null, hostSessionId?: string | null): string | null {
  const [sessionId, setSessionId] = useState<string | null>(null);

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

  return sessionId;
}
