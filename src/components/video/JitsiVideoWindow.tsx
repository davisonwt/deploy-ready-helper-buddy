import { useEffect, useRef, useState } from 'react';
import DailyIframe, { type DailyCall } from '@daily-co/daily-js';
import { launchConfetti, launchSparkles, playSoundEffect } from '@/utils/confetti';
import { fetchDailyMeetingToken } from '@/lib/daily-config';

// P1-6: was a JitsiMeetExternalAPI room on the public meet.jit.si domain
// with a soft "room password" and no JWT at all. Now a Daily.co call with a
// real per-user meeting token (create-daily-meeting-token) -- the token
// itself is the access control now, so `password` is accepted (existing
// callers like OrchardVoiceChatButton still pass one) but no longer does
// anything; it's not a Daily concept.

interface JitsiVideoWindowProps {
  isOpen: boolean;
  roomName: string;
  displayName?: string;
  password?: string | null;
  onClose: () => void;
}

export function JitsiVideoWindow({
  isOpen,
  roomName,
  displayName = 'Sower',
  onClose,
}: JitsiVideoWindowProps) {
  const callContainer = useRef<HTMLDivElement>(null);
  const callRef = useRef<DailyCall | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !callContainer.current) return;
    let cancelled = false;
    setIsLoading(true);

    const start = async () => {
      try {
        const { room_url, token } = await fetchDailyMeetingToken({ roomKind: 'custom', roomId: roomName, displayName });
        if (cancelled || !callContainer.current) return;

        callContainer.current.innerHTML = '';
        const call = DailyIframe.createFrame(callContainer.current, {
          iframeStyle: { width: '100%', height: '100%', border: '0' },
          showLeaveButton: false,
          showFullscreenButton: false,
        });
        callRef.current = call;

        call.on('joined-meeting', () => {
          setIsLoading(false);
          launchSparkles();
          playSoundEffect('mysterySeed', 0.6);
          document.body.style.overflow = 'hidden';
        });
        call.on('participant-joined', () => launchConfetti());
        call.on('left-meeting', () => handleEndCall());
        call.on('error', (e: any) => {
          console.error('Error initializing Daily call:', e);
          setIsLoading(false);
        });

        await call.join({ url: room_url, token, userName: displayName });
      } catch (error) {
        console.error('Error loading Daily call:', error);
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
  }, [isOpen, roomName, displayName]);

  const handleEndCall = () => {
    if (callRef.current) {
      const call = callRef.current;
      callRef.current = null;
      call.leave().catch(() => {});
      call.destroy().catch(() => {});
    }
    document.body.style.overflow = 'auto';
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl">
      <div className="absolute top-4 right-4 z-10 flex gap-4">
        {isLoading && (
          <div className="bg-white/20 backdrop-blur p-4 rounded-full text-white font-semibold">Connecting…</div>
        )}
        <button
          onClick={handleEndCall}
          className="bg-red-600 hover:bg-red-500 p-4 rounded-full text-white text-2xl font-bold transition"
        >
          End Call
        </button>
      </div>
      <div ref={callContainer} className="w-full h-full" />
    </div>
  );
}

// Global function to start a video call (for use from anywhere)
export function startJitsiCall(
  roomName: string,
  displayName: string = 'Sower',
  password: string | null = null
) {
  // Dispatch custom event that Layout can listen to
  window.dispatchEvent(
    new CustomEvent('jitsi-start-call', {
      detail: { roomName, displayName, password },
    })
  );
}
