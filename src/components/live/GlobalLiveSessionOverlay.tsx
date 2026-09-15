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
 *
 *    HOST resume specifically calls goLive() again (not just a raw
 *    validation SELECT) -- confirmed live: without this, the host's OWN
 *    overlay/Daily call reconnected fine after a reload, but they vanished
 *    from everyone else's Live Now list, because presence
 *    (useTribalLiveOrchard's realtime channel.track()) is a SEPARATE
 *    mechanism from this store/localStorage, torn down by the reload's
 *    own WebSocket disconnect and never re-established by just re-
 *    rendering the overlay. goLive() re-tracks presence AND reuses the
 *    existing gathering_sessions row/jitsi room (its own already-built
 *    reuse-over-remint logic), so this is the one correct way to resume
 *    as host, not a shortcut around it.
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
  const { goLive, endLive } = useTribalLiveOrchard();
  const active = useActiveLiveSession();
  const triedResumeRef = useRef(false);

  useEffect(() => {
    if (!user || triedResumeRef.current) return;
    triedResumeRef.current = true;
    const remembered = readRememberedLiveSession();
    if (!remembered) return;
    (async () => {
      if (remembered.isHost) {
        // A remembered HOST session must still actually belong to this
        // user (a stale/forged localStorage entry can't grant host rights
        // -- goLive()/the token edge function re-verify independently
        // regardless, this just avoids a pointless goLive() call for a
        // session that was never this user's own).
        const { data } = await supabase
          .from('gathering_sessions' as any)
          .select('id, host_id, ended_at')
          .eq('seed_id', remembered.seedId)
          .is('ended_at', null)
          .maybeSingle();
        if (!data || (data as any).host_id !== user.id) { clearActiveLiveSession(); return; }
        const presence = await goLive({ id: remembered.seedId, title: remembered.title, image: remembered.images?.[0] ?? null });
        if (!presence) { clearActiveLiveSession(); return; }
        setActiveLiveSession({ ...remembered, jitsiRoom: presence.jitsi_room, hostSessionId: presence.gatheringSessionId });
        return;
      }
      // Guest: no presence of their own to re-track (only the host tracks
      // presence for a session) -- just confirm the session they were in
      // is still live before silently reconnecting the call.
      const { data } = await supabase
        .from('gathering_sessions' as any)
        .select('id, ended_at')
        .eq('seed_id', remembered.seedId)
        .is('ended_at', null)
        .maybeSingle();
      if (!data) { clearActiveLiveSession(); return; }
      setActiveLiveSession({ ...remembered, hostSessionId: (data as any).id });
    })();
  }, [user, goLive]);

  if (!active) return null;

  const handleClose = async () => {
    const info = active;
    clearActiveLiveSession();
    if (info.isHost) {
      await endLive({ seedId: info.seedId, seedTitle: info.title });
    }
  };

  return (
    // LiveStageOverlay's own root is `fixed z-[1000]` -- fine when nested
    // INSIDE a StallInteriorView's z-[9999] tree (Scripture Study's own
    // join flow does that), but this component renders as a SIBLING of
    // <Routes> (mounted above it in AppRoutes.tsx), so on any page that
    // itself renders a z-[9999] StallInteriorView (e.g. /cockpit) the two
    // are plain DOM siblings and 1000 loses to 9999 -- confirmed live:
    // clicking "Approve" (and, before that, "End live" in a different
    // flow) got intercepted by StallInteriorView's own chrome. Same fix
    // shape as the AdminButton dropdown z-index bug and DashboardPage's
    // now-retired local version of this same wrapper -- centralizing it
    // here means every entry point that hands off to this component gets
    // it for free, not just the ones that used to build it themselves.
    <div style={{ position: 'fixed', inset: 0, zIndex: 2147483647 }}>
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
    </div>
  );
}
