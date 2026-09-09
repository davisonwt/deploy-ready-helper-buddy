import { useEffect, useRef, useState } from 'react';
import DailyIframe, { type DailyCall } from '@daily-co/daily-js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Video, VideoOff, Phone, Users, Hand } from 'lucide-react';
import { fetchDailyMeetingToken } from '@/lib/daily-config';

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
  const [isLoading, setIsLoading] = useState(true);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(audioOnly);
  const [participantCount, setParticipantCount] = useState(1);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;

    const updateParticipantCount = (call: DailyCall) => {
      setParticipantCount(Object.keys(call.participants()).length);
    };

    const start = async () => {
      if (!callContainer.current) return;
      try {
        const { room_url, token } = await fetchDailyMeetingToken({ roomKind: 'custom', roomId: roomName, displayName });
        if (cancelled || !callContainer.current) return;

        const call = DailyIframe.createFrame(callContainer.current, {
          iframeStyle: { width: '100%', height: '100%', border: '0' },
          showLeaveButton: false,
          showFullscreenButton: false,
        });
        callRef.current = call;

        call.on('joined-meeting', () => {
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
        call.on('error', (e: any) => {
          console.error('Error initializing Daily call:', e);
          toast({ title: 'Error', description: 'Failed to initialize video room', variant: 'destructive' });
          setIsLoading(false);
        });

        await call.join({ url: room_url, token, userName: displayName, startVideoOff: audioOnly, startAudioOff: false });
      } catch (error) {
        console.error('Error loading Daily call:', error);
        toast({ title: 'Error', description: 'Failed to load the video room. Please check your connection.', variant: 'destructive' });
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
  }, [roomName, displayName, audioOnly, toast]);

  const handleLeave = () => {
    if (callRef.current) {
      const call = callRef.current;
      callRef.current = null;
      call.leave().catch(() => {});
      call.destroy().catch(() => {});
    }
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
