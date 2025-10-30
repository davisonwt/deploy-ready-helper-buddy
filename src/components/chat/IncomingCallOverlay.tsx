import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, PhoneOff } from 'lucide-react';
import { useCallManager } from '@/hooks/useCallManager';
import { useAuth } from '@/hooks/useAuth';

// Lightweight global incoming-call overlay rendered at the app root.
// Shows for any route and attempts to play a ringtone. Falls back to a tap-to-unlock if autoplay is blocked.
const IncomingCallOverlay: React.FC = () => {
  const { user } = useAuth();
  const { incomingCall, answerCall, declineCall } = useCallManager();
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const ringTimerRef = useRef<number | null>(null);

  // Request Notification permission once when authenticated
  useEffect(() => {
    if (!user) return;
    if ('Notification' in window && Notification.permission === 'default') {
      try { Notification.requestPermission().catch(() => {}); } catch {}
    }
  }, [user?.id]);

  // Show a browser notification on incoming call
  useEffect(() => {
    console.log('🔔 [IncomingCallOverlay] Render state:', { 
      hasIncomingCall: !!incomingCall, 
      callId: incomingCall?.id, 
      callerName: incomingCall?.caller_name,
      callType: incomingCall?.type
    });
    if (!incomingCall || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      const n = new Notification('Incoming Call', {
        body: `${incomingCall.caller_name || 'Someone'} is calling…`,
        tag: `call-${incomingCall.id}`,
      });
      n.onclick = () => {
        // Focus window and navigate to chat if needed
        window.focus();
        // no hard navigation here to avoid interfering with current route
      };
    } catch {}
  }, [incomingCall?.id]);

  // Attempt to play ringtone using Web Audio API
  useEffect(() => {
    if (!incomingCall) return;
    console.log('🔔 [IncomingCallOverlay] Starting ringtone for call:', incomingCall.id);

    const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx: AudioContext = new Ctx();
    audioCtxRef.current = ctx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0; // start silent
    osc.type = 'sine';
    osc.frequency.value = 800; // ring tone frequency
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    gainRef.current = gain;
    oscRef.current = osc;

    const toggle = () => {
      if (!gainRef.current) return;
      gainRef.current.gain.value = gainRef.current.gain.value > 0 ? 0 : 0.15;
    };
    toggle();
    const id = window.setInterval(toggle, 600);
    ringTimerRef.current = id as unknown as number;

    ctx.resume().then(() => setNeedsUnlock(false)).catch(() => setNeedsUnlock(true));

    return () => {
      if (ringTimerRef.current) { clearInterval(ringTimerRef.current); ringTimerRef.current = null; }
      try { osc.stop(); } catch {}
      try { ctx.close(); } catch {}
      oscRef.current = null;
      gainRef.current = null;
      audioCtxRef.current = null;
    };
  }, [incomingCall?.id]);

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <Card className="w-full max-w-sm border-primary/20 shadow-2xl">
        <CardContent className="p-6">
          <div className="text-center">
            <Avatar className="h-20 w-20 mx-auto mb-4">
              <AvatarImage src={undefined} />
              <AvatarFallback className="text-3xl">
                {(incomingCall.caller_name || 'U')?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <h3 className="text-xl font-semibold mb-1">Incoming Call</h3>
            <p className="text-muted-foreground mb-5">{incomingCall.caller_name || 'Unknown User'}</p>

            {needsUnlock && (
              <div className="mb-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => audioCtxRef.current?.resume().then(() => setNeedsUnlock(false)).catch(() => {})}
                >
                  Enable Sound
                </Button>
              </div>
            )}

            <div className="flex items-center justify-center gap-6">
              <Button
                size="lg"
                variant="destructive"
                className="rounded-full h-16 w-16 shadow-lg"
                onClick={() => declineCall(incomingCall.id)}
              >
                <PhoneOff className="h-7 w-7" />
              </Button>
              <Button
                size="lg"
                className="rounded-full h-16 w-16 shadow-lg"
                onClick={() => {
                  answerCall(incomingCall.id);
                  if (ringTimerRef.current) { clearInterval(ringTimerRef.current); ringTimerRef.current = null; }
                  try { oscRef.current?.stop(); } catch {}
                  try { audioCtxRef.current?.close(); } catch {}
                  oscRef.current = null; gainRef.current = null; audioCtxRef.current = null;
                }}
              >
                <Phone className="h-7 w-7" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IncomingCallOverlay;
