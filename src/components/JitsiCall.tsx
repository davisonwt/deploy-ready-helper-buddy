import { useEffect, useRef, useState } from 'react';
import DailyIframe, { type DailyCall } from '@daily-co/daily-js';
import { checkDeviceAvailability, fetchDailyMeetingToken, startDailyJoinWatchdog, teardownDailyCall, type DailyRoomKind } from '@/lib/daily-config';
import { NoDeviceBanner } from '@/components/media/NoDeviceBanner';
import { useToast } from '@/hooks/use-toast';

// P1-6: was @jitsi/react-sdk against a self-hosted meet.sow2growapp.com
// domain with no JWT at all -- now a Daily.co call with a real per-user
// meeting token (create-daily-meeting-token). `roomKind` lets a caller that
// has a real backing row (a call_sessions call, a chat_room's group call)
// get properly authorized server-side; callers without one (a couple of
// legacy demo buttons that generate a throwaway random id with no
// signaling to the other party -- see UserSelector.jsx/ChatApp.tsx) fall
// back to 'custom', the same "must be logged in" floor those had under
// Jitsi's public domain.

interface JitsiCallProps {
  roomName: string;
  roomKind?: DailyRoomKind;
  onLeave: () => void;
  userInfo?: { displayName: string; email: string };
  isAudioOnly?: boolean;
}

export function JitsiCall({ roomName, roomKind = 'custom', onLeave, userInfo, isAudioOnly }: JitsiCallProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<DailyCall | null>(null);
  const joinedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [viewerMode, setViewerMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    let watchdog: ReturnType<typeof startDailyJoinWatchdog> | null = null;

    const start = async () => {
      if (!containerRef.current) return;
      try {
        // Checked before join, not reacted to after -- a PC with no
        // camera/mic left Daily's own internal getUserMedia call to hang
        // mid-join with no way back. Knowing up front means we never ask
        // Daily to acquire a device that isn't there.
        const { hasCamera, hasMic } = await checkDeviceAvailability();
        if (cancelled) return;
        if (!hasCamera && !hasMic) setViewerMode(true);

        const { room_url, token } = await fetchDailyMeetingToken({
          roomKind,
          roomId: roomName,
          displayName: userInfo?.displayName,
        });
        if (cancelled || !containerRef.current) return;

        const call = DailyIframe.createFrame(containerRef.current, {
          iframeStyle: { width: '100%', height: '100%', minHeight: '600px', border: 'none' },
          showLeaveButton: false,
          showFullscreenButton: false,
        });
        callRef.current = call;

        // Watchdog is independent of call.join()'s own promise -- with
        // the room's prejoin UI on, that promise doesn't resolve until a
        // human taps Daily's own "Join" button, which can be minutes
        // later; racing it made a real, slow-but-legitimate join
        // indistinguishable from a genuine hang and tore the frame down
        // out from under a call that had just gone live. The watchdog
        // only acts if 'joined-meeting' hasn't fired first.
        watchdog = startDailyJoinWatchdog(() => {
          if (joinedRef.current || cancelled) return;
          toast({ title: 'Call failed', description: "Call didn't connect in time. Please check your connection and try again.", variant: 'destructive' });
          setIsLoading(false);
          const stale = callRef.current;
          callRef.current = null;
          teardownDailyCall(stale);
        });

        // Remote participant video/audio (and any autoplay-blocked "tap
        // to enable sound" prompt) is rendered and handled entirely
        // inside this iframe by Daily's own prebuilt UI -- it's Daily's
        // origin, not ours, so there's no element inside it our code can
        // reach to call .play() on directly. Nothing extra to wire up
        // here on the device-less side; Daily Prebuilt already does this.
        call.on('joined-meeting', () => {
          joinedRef.current = true;
          watchdog?.clear();
          setIsLoading(false);
        });
        call.on('left-meeting', () => onLeave());
        call.on('camera-error', () => {
          toast({ title: 'Camera/mic error', description: 'Could not access your camera or microphone.', variant: 'destructive' });
        });
        call.on('error', (e: any) => {
          console.error('Daily call error', e);
          toast({ title: 'Call error', description: e?.errorMsg || 'Something went wrong with the call.', variant: 'destructive' });
          setIsLoading(false);
        });

        await call.join({
          url: room_url,
          token,
          userName: userInfo?.displayName,
          startVideoOff: isAudioOnly || !hasCamera,
          startAudioOff: !hasMic,
        });
        watchdog?.clear();
      } catch (error: any) {
        watchdog?.clear();
        if (joinedRef.current) return; // joined for real despite the rejection -- nothing to tear down or report
        console.error('Failed to start Daily call', error);
        toast({ title: 'Call failed', description: error?.message || 'Could not start the call.', variant: 'destructive' });
        setIsLoading(false);
      }
    };

    start();

    return () => {
      cancelled = true;
      watchdog?.clear();
      const call = callRef.current;
      callRef.current = null;
      teardownDailyCall(call);
    };
    // Deliberately empty: create the frame exactly once per mount, using
    // whichever roomName/roomKind/isAudioOnly/userInfo this component was
    // mounted with. A production crash ("null is not an object (evaluating
    // 'u.postMessage')") traced to this effect re-running mid-call --
    // something upstream re-rendering with new-but-equal prop values was
    // enough to tear the live frame down and recreate it while daily-js
    // still had in-flight postMessage calls against the old one. This
    // component's contract is "one Daily call for as long as I'm mounted";
    // if a caller ever needs to switch rooms without unmounting, that
    // should be an explicit `key` change from the parent, not this effect
    // silently resyncing. StrictMode's dev-only double-invoke is already
    // handled correctly by the `cancelled` guard above + the idempotent
    // teardownDailyCall on cleanup -- it settles to exactly one live frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full h-[600px] rounded-lg overflow-hidden border border-border relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}
      {!isLoading && viewerMode && <NoDeviceBanner />}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
