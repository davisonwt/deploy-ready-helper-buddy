/**
 * GlobalLiveSessionOverlay — mounted ONCE near the app root (in
 * AppRoutes.tsx, alongside/above <Routes>, not inside any one routed
 * page), so it's never unmounted by in-app navigation. This is what makes
 * "Part 1" (silent auto-rejoin) actually general: previously, the live
 * call only stayed connected as long as whichever SPECIFIC page started
 * it (DashboardPage, LiveNowPage, StallInteriorView) stayed mounted --
 * navigating to an unrelated route, or the tab's whole JS context getting
 * reclaimed by the OS (backgrounding, a phone call) and reloaded fresh,
 * both unmounted that page and, with it, the Daily call.
 *
 * Two jobs:
 * 1. On the FIRST render after `user` resolves, check for a remembered
 *    session (activeLiveSession.ts, localStorage-backed) from a PREVIOUS
 *    tab lifetime; if the underlying gathering_sessions row is still live
 *    (ended_at IS NULL), silently resume it -- no tap, no re-prompt. A
 *    stale/ended remembered session is cleared instead.
 * 2. Render <LiveStageOverlay> whenever the shared store has an active
 *    session, for ANY entry point that hands off to it (see
 *    activeLiveSession.ts's own doc comment for exactly which ones do,
 *    and the one deliberate exception -- SeedCard.tsx's seed-attached
 *    Go Live is NOT wired to this, a known gap, not an oversight).
 */
import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useTribalLiveOrchard } from '@/hooks/useTribalLiveOrchard';
import { useActiveLiveSession } from '@/hooks/useActiveLiveSession';
import { setActiveLiveSession, clearActiveLiveSession, readRememberedLiveSession } from '@/lib/liveSession/activeLiveSession';
import LiveStageOverlay from '@/components/live/LiveStageOverlay';

export default function GlobalLiveSessionOverlay() {
  const { user } = useAuth();
  const { endLive } = useTribalLiveOrchard();
  const active = useActiveLiveSession();
  const triedResumeRef = useRef(false);

  useEffect(() => {
    if (!user || triedResumeRef.current) return;
    triedResumeRef.current = true;
    const remembered = readRememberedLiveSession();
    if (!remembered) return;
    (async () => {
      const { data } = await supabase
        .from('gathering_sessions' as any)
        .select('id, host_id, ended_at')
        .eq('seed_id', remembered.seedId)
        .is('ended_at', null)
        .maybeSingle();
      if (!data) { clearActiveLiveSession(); return; }
      // A remembered HOST session must still actually belong to this
      // user (a stale/forged localStorage entry can't grant host rights
      // -- goLive()/the token edge function re-verify independently
      // regardless, this just avoids silently resuming as a "host" the
      // server will refuse).
      if (remembered.isHost && (data as any).host_id !== user.id) { clearActiveLiveSession(); return; }
      setActiveLiveSession({ ...remembered, hostSessionId: (data as any).id });
    })();
  }, [user]);

  if (!active) return null;

  const handleClose = async () => {
    const info = active;
    clearActiveLiveSession();
    if (info.isHost) {
      await endLive({ seedId: info.seedId, seedTitle: info.title });
    }
  };

  return (
    <LiveStageOverlay
      seedId={active.seedId}
      title={active.title}
      subtitle={active.subtitle}
      jitsiRoom={active.jitsiRoom}
      isHost={active.isHost}
      hostSessionId={active.hostSessionId}
      isRadio={active.isRadio}
      sowerUserId={active.sowerUserId}
      images={active.images}
      mediaUrl={active.mediaUrl}
      mediaKind={active.mediaKind}
      whispererSharePct={active.whispererSharePct}
      openPath={active.openPath}
      onClose={() => void handleClose()}
    />
  );
}
