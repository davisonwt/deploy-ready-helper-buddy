import { useEffect, useRef, useState } from 'react';
import { useCallManager } from '@/hooks/useCallManager';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ----------  GLOBAL SINGLETON HELPERS  ---------- */
type RingHandles = {
  ctx: AudioContext | null;
  osc: OscillatorNode | null;
  gain: GainNode | null;
  interval: number | null;
};

const getGlobalRingtone = (): RingHandles | undefined =>
  (window as any).__ringtone;

const setGlobalRingtone = (r: RingHandles | undefined): void => {
  (window as any).__ringtone = r;
};

const stopGlobalRingtone = (): void => {
  const r = getGlobalRingtone();
  if (!r) return;

  try { if (r.interval != null) clearInterval(r.interval); } catch {}
  try { r.gain?.gain?.cancelScheduledValues?.(0); } catch {}
  try { if (r.gain) r.gain.gain.value = 0; } catch {}
  try { r.osc?.stop?.(); } catch {}
  try { (r.osc as any)?.disconnect?.(); } catch {}
  try { (r.gain as any)?.disconnect?.(); } catch {}
  try {
    const unlocked = (window as any).__unlockedAudioCtx;
    if (r.ctx && r.ctx !== unlocked && (r.ctx as any).state !== 'closed' && !(r.ctx as any).__closing) {
      try {
        (r.ctx as any).__closing = true;
        const p = r.ctx.close?.();
        if (p && typeof (p as any).catch === 'function') {
          (p as Promise<void>).catch(() => {});
        }
      } catch {}
    }
  } catch {}
  setGlobalRingtone(undefined);
};
/* ------------------------------------------------ */

export default function IncomingCallOverlay() {
  const { incomingCall, currentCall, answerCall, declineCall } = useCallManager();
  const [hasAnswered, setHasAnswered] = useState(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const ringTimerRef = useRef<number | null>(null);

  // Brutal, idempotent stop: local + global
  const hardStopRingtone = () => {
    // Capture current global ringtone context to avoid double-closing the same ctx
    const prev = getGlobalRingtone();
    stopGlobalRingtone(); // kill any stray global loop

    // Defensive local cleanup
    try { if (ringTimerRef.current != null) clearInterval(ringTimerRef.current); } catch {}
    ringTimerRef.current = null;
    try { gainRef.current?.gain?.cancelScheduledValues?.(0); } catch {}
    try { if (gainRef.current) gainRef.current.gain.value = 0; } catch {}
    try { oscRef.current?.stop?.(); } catch {}
    try { (oscRef.current as any)?.disconnect?.(); } catch {}
    try { (gainRef.current as any)?.disconnect?.(); } catch {}
    try {
      const ctx = audioCtxRef.current as any;
      const globalCtx: any = (window as any).__unlockedAudioCtx;
      if (ctx && ctx.state !== 'closed' && ctx !== globalCtx && ctx !== prev?.ctx && !ctx.__closing) {
        try {
          ctx.__closing = true;
          const p = ctx.close?.();
          if (p && typeof p.catch === 'function') {
            (p as Promise<void>).catch(() => {});
          }
        } catch {}
      }
    } catch {}
    oscRef.current = null;
    gainRef.current = null;
    audioCtxRef.current = null;
    setNeedsUnlock(false);
  };

  // Reset hasAnswered when a NEW incoming call arrives
  useEffect(() => {
    if (incomingCall?.id) {
      setHasAnswered(false);
    }
  }, [incomingCall?.id]);

  // Start ringtone when an incoming call appears; stop any previous one first
  useEffect(() => {
    if (!incomingCall || hasAnswered) return;

    // Pre-kill any ghost/duplicate ring before creating a new one
    hardStopRingtone();

    const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    const globalCtx: any = (window as any).__unlockedAudioCtx;
    const ctx: AudioContext = globalCtx ?? new Ctx();
    audioCtxRef.current = ctx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0; // start muted
    osc.type = 'sine';
    osc.frequency.value = 800; // ring tone frequency
    osc.connect(gain).connect(ctx.destination);
    osc.start();

    gainRef.current = gain;
    oscRef.current = osc;

    const toggle = () => {
      if (!gainRef.current) return;
      gainRef.current.gain.value = gainRef.current.gain.value > 0 ? 0 : 0.22;
      try { (navigator as any)?.vibrate?.(100); } catch {}
    };
    toggle();
    const id = window.setInterval(toggle, 600);
    ringTimerRef.current = id;

    setGlobalRingtone({ ctx, osc, gain, interval: id });

    // iOS blocks AudioContext until user gesture - show unlock button immediately
    if (ctx.state === 'suspended') {
      setNeedsUnlock(true);
    } else {
      ctx.resume()
        .then(() => setNeedsUnlock(false))
        .catch(() => setNeedsUnlock(true));
    }

    return () => { hardStopRingtone(); };
  }, [incomingCall?.id, hasAnswered]);

  // Stop when the incoming call disappears (declined/cancelled). Do NOT stop just because currentCall is set.
  useEffect(() => {
    if (!incomingCall) {
      hardStopRingtone();
    }
  }, [incomingCall?.id]);

  // Safety: if current call transitions to accepted, ensure ringtone is stopped
  useEffect(() => {
    if (currentCall?.status === 'accepted') {
      hardStopRingtone();
    }
  }, [currentCall?.id, currentCall?.status]);

  const handleAnswer = () => {
    // Stop ring first, then transition
    hardStopRingtone();
    setHasAnswered(true);
    if (incomingCall?.id) {
      answerCall(incomingCall.id);
    }
  };

  const handleDecline = () => {
    hardStopRingtone();
    if (incomingCall?.id) {
      declineCall(incomingCall.id, 'declined');
    }
  };

  if (!incomingCall || hasAnswered) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
      onClick={() => {
        // Allow a single tap to unlock audio if autoplay blocked
        if (needsUnlock && audioCtxRef.current?.resume) {
          audioCtxRef.current.resume()
            .then(() => setNeedsUnlock(false))
            .catch(() => {});
        }
      }}
    >
      <div
        className={cn(
          'flex flex-col items-center gap-4 rounded-2xl bg-white/90 px-8 py-6 text-center shadow-lg',
          'dark:bg-gray-900/90 dark:text-white'
        )}
      >
        <div className="text-lg font-semibold">Incoming call</div>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {incomingCall.caller_name || 'Unknown'}
        </div>

        {needsUnlock && (
          <div className="text-center space-y-2">
            <div className="text-xs text-gray-500">Tap to enable ringtone</div>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                audioCtxRef.current?.resume?.()
                  .then(() => {
                    setNeedsUnlock(false);
                    console.log('🔊 [RING] Audio unlocked');
                  })
                  .catch((err) => {
                    console.error('❌ [RING] Resume failed:', err);
                  });
              }}
            >
              🔊 Enable Sound
            </Button>
          </div>
        )}

        <div className="flex gap-4">
          <Button
            size="icon"
            variant="destructive"
            onClick={(e) => { e.stopPropagation(); handleDecline(); }}
            aria-label="Decline"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            onClick={(e) => { e.stopPropagation(); handleAnswer(); }}
            aria-label="Answer"
          >
            <Phone className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
