import { useEffect, useRef, useState } from 'react';
import DailyIframe, { type DailyCall } from '@daily-co/daily-js';
import { checkDeviceAvailability, fetchDailyMeetingToken, withDailyJoinTimeout, type DailyRoomKind } from '@/lib/daily-config';
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
  const [isLoading, setIsLoading] = useState(true);
  const [viewerMode, setViewerMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

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

        // Remote participant video/audio (and any autoplay-blocked "tap
        // to enable sound" prompt) is rendered and handled entirely
        // inside this iframe by Daily's own prebuilt UI -- it's Daily's
        // origin, not ours, so there's no element inside it our code can
        // reach to call .play() on directly. Nothing extra to wire up
        // here on the device-less side; Daily Prebuilt already does this.
        call.on('joined-meeting', () => {
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

        await withDailyJoinTimeout(call.join({
          url: room_url,
          token,
          userName: userInfo?.displayName,
          startVideoOff: isAudioOnly || !hasCamera,
          startAudioOff: !hasMic,
        }));
      } catch (error: any) {
        console.error('Failed to start Daily call', error);
        toast({ title: 'Call failed', description: error?.message || 'Could not start the call.', variant: 'destructive' });
        setIsLoading(false);
      }
    };

    start();

    return () => {
      cancelled = true;
      if (callRef.current) {
        const call = callRef.current;
        callRef.current = null;
        call.leave().catch(() => {});
        call.destroy().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, roomKind, isAudioOnly]);

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
