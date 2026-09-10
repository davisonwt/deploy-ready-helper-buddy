import { useEffect, useRef, useState } from 'react';
import DailyIframe, { type DailyCall } from '@daily-co/daily-js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Video, VideoOff, Phone, Users, Hand } from 'lucide-react';
import { checkDeviceAvailability, fetchDailyMeetingToken, startDailyJoinWatchdog, teardownDailyCall } from '@/lib/daily-config';
import { NoDeviceBanner } from '@/components/media/NoDeviceBanner';

// P1-6: was a JitsiMeetExternalAPI room against a public/self-hosted domain
// with no JWT at all -- now a Daily.co call with a real per-user meeting
// token minted server-side (create-daily-meeting-token). `roomName` isn't
// backed by one specific table across this component's callers (radio DJ
// sessions, 1:1 "s2g-1v1-<roomId>" rooms), so it's authorized as a
// 'custom' room: must be logged in, same trust floor the old public-domain
// room had, plus a real signed token this time.

interface JitsiRoomProps {
  roomName: string;
  displayName?: string;
  onLeave?: () => void;
  isModerator?: boolean;
  audioOnly?: boolean;
}

export default function JitsiRoom({
  roomName,
  displayName = 'Guest',
  onLeave,
  audioOnly = false,
}: JitsiRoomProps) {
  const callContainer = useRef<HTMLDivElement>(null);
  const callRef = useRef<DailyCall | null>(null);
  const joinedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(audioOnly);
  const [participantCount, setParticipantCount] = useState(1);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [viewerMode, setViewerMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    let watchdog: ReturnType<typeof startDailyJoinWatchdog> | null = null;

    const updateParticipantCount = (call: DailyCall) => {
      setParticipantCount(Object.keys(call.participants()).length);
    };

    const start = async () => {
      if (!callContainer.current) return;
      try {
        // Checked before join, not reacted to after -- a PC with no
        // camera/mic left Daily's own internal getUserMedia call to hang
        // mid-join with no way back. Knowing up front means we never ask
        // Daily to acquire a device that isn't there.
        const { hasCamera, hasMic } = await checkDeviceAvailability();
        if (cancelled) return;
        if (!hasCamera && !hasMic) setViewerMode(true);
        // Keep the mute-toggle buttons honest: a viewer with no mic/camera
        // shows muted/off from the start rather than a toggle that would
        // silently do nothing when pressed.
        setIsAudioMuted(!hasMic);
        setIsVideoMuted(audioOnly || !hasCamera);

        const { room_url, token } = await fetchDailyMeetingToken({ roomKind: 'custom', roomId: roomName, displayName });
        if (cancelled || !callContainer.current) return;

        const call = DailyIframe.createFrame(callContainer.current, {
          iframeStyle: { width: '100%', height: '100%', border: '0' },
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
          toast({ title: 'Error', description: "Call didn't connect in time. Please check your connection and try again.", variant: 'destructive' });
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
          toast({ title: 'Connected', description: 'You joined the live room' });
        });
        call.on('left-meeting', () => handleLeave());
        call.on('participant-joined', () => updateParticipantCount(call));
        call.on('participant-left', () => updateParticipantCount(call));
        call.on('app-message', (ev: any) => {
          // Lightweight raise-hand: Daily has no native concept of it (Jitsi
          // did), so it's broadcast as a custom app message -- fine for a
          // best-effort UI signal, not something the DB tracks.
          if (ev?.data?.type === 'raise-hand') {
            toast({ title: `${ev.data.name || 'Someone'} raised a hand` });
          }
        });
        call.on('camera-error', () => {
          toast({ title: 'Camera/mic error', description: 'Could not access your camera or microphone.', variant: 'destructive' });
        });
        call.on('error', (e: any) => {
          console.error('Error initializing Daily call:', e);
          toast({ title: 'Error', description: 'Failed to initialize video room', variant: 'destructive' });
          setIsLoading(false);
        });

        await call.join({
          url: room_url,
          token,
          userName: displayName,
          startVideoOff: audioOnly || !hasCamera,
          startAudioOff: !hasMic,
        });
        watchdog?.clear();
      } catch (error: any) {
        watchdog?.clear();
        if (joinedRef.current) return; // joined for real despite the rejection -- nothing to tear down or report
        console.error('Error loading Daily call:', error);
        toast({ title: 'Error', description: error?.message || 'Failed to load the video room. Please check your connection.', variant: 'destructive' });
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
  }, [roomName, displayName, audioOnly, toast]);

  const handleLeave = () => {
    const call = callRef.current;
    callRef.current = null;
    teardownDailyCall(call);
    onLeave?.();
  };

  const toggleAudio = () => {
    if (!callRef.current) return;
    setIsAudioMuted((muted) => {
      const next = !muted;
      callRef.current?.setLocalAudio(!next);
      return next;
    });
  };

  const toggleVideo = () => {
    if (!callRef.current) return;
    setIsVideoMuted((muted) => {
      const next = !muted;
      callRef.current?.setLocalVideo(!next);
      return next;
    });
  };

  const toggleRaiseHand = () => {
    setIsHandRaised((raised) => {
      const next = !raised;
      if (next) callRef.current?.sendAppMessage({ type: 'raise-hand', name: displayName }, '*');
      return next;
    });
  };

  return (
    <div className="relative w-full h-screen bg-background">
      {!isLoading && viewerMode && <NoDeviceBanner />}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
          <Card className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg">Connecting to {roomName}...</p>
          </Card>
        </div>
      )}

      <div ref={callContainer} className="w-full h-full" />

      {/* Custom Control Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
        <Card className="p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-background/50 rounded-md">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">{participantCount}</span>
            </div>

            <Button variant={isAudioMuted ? 'destructive' : 'secondary'} size="icon" onClick={toggleAudio} className="rounded-full h-12 w-12">
              {isAudioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            <Button variant={isVideoMuted ? 'destructive' : 'secondary'} size="icon" onClick={toggleVideo} className="rounded-full h-12 w-12">
              {isVideoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>

            <Button variant={isHandRaised ? 'default' : 'outline'} size="icon" onClick={toggleRaiseHand} className="rounded-full h-12 w-12">
              <Hand className="h-5 w-5" />
            </Button>

            <Button variant="destructive" size="icon" onClick={handleLeave} className="rounded-full h-12 w-12 ml-2">
              <Phone className="h-5 w-5 rotate-135" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
