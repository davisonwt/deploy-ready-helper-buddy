import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCallManager } from '@/hooks/useCallManager';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { stopAllRingtones, startRingbackTone } from '@/lib/ringtone';

/* ----------  GLOBAL SINGLETON HELPERS  ---------- */
interface WindowWithAudioRingtone extends Window {
  webkitAudioContext?: typeof AudioContext;
  __unlockedAudioCtx?: AudioContext;
  __ringtone?: RingHandles;
}

interface AudioContextWithClosing extends AudioContext {
  __closing?: boolean;
}

type RingHandles = {
  ctx: AudioContext | null;
  osc: OscillatorNode | null;
  gain: GainNode | null;
  interval: number | null;
};

const getGlobalRingtone = (): RingHandles | undefined =>
  (window as WindowWithAudioRingtone).__ringtone;

const setGlobalRingtone = (r: RingHandles | undefined): void => {
  (window as WindowWithAudioRingtone).__ringtone = r;
};

const stopGlobalRingtone = (): void => {
  const r = getGlobalRingtone();
  if (!r) return;

  try { if (r.interval != null) clearInterval(r.interval); } catch { /* interval may already be cleared */ }
  try { r.gain?.gain?.cancelScheduledValues?.(0); } catch { /* gain may be disconnected */ }
  try { if (r.gain) r.gain.gain.value = 0; } catch { /* gain may be null */ }
  try { r.osc?.stop?.(); } catch { /* oscillator may already be stopped */ }
  try { r.osc?.disconnect?.(); } catch { /* oscillator may already be disconnected */ }
  try { r.gain?.disconnect?.(); } catch { /* gain may already be disconnected */ }
  try {
    const w = window as WindowWithAudioRingtone;
    const unlocked = w.__unlockedAudioCtx;
    const ctx = r.ctx as AudioContextWithClosing | null;
    if (ctx && ctx !== unlocked && ctx.state !== 'closed' && !ctx.__closing) {
      try {
        ctx.__closing = true;
        const p = ctx.close?.();
        if (p && typeof p.catch === 'function') {
          (p as Promise<void>).catch(() => { /* ignore close errors */ });
        }
      } catch { /* context close may fail */ }
    }
  } catch { /* context check may fail */ }
  setGlobalRingtone(undefined);
};
/* ------------------------------------------------ */

export default function IncomingCallOverlay() {
  const { incomingCall, currentCall, outgoingCall, answerCall, declineCall, endCall, signalStatus } = useCallManager();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hasAnswered, setHasAnswered] = useState(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  
  // DEBUG: Log state on every render
  console.log('📞 [OVERLAY] Component render - State:', {
    incomingCall: incomingCall ? { id: incomingCall.id, status: incomingCall.status, caller_name: incomingCall.caller_name } : null,
    outgoingCall: outgoingCall ? { id: outgoingCall.id, status: outgoingCall.status, receiver_name: outgoingCall.receiver_name } : null,
    currentCall: currentCall ? { id: currentCall.id, status: currentCall.status } : null,
    hasAnswered
  });

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
    try { if (ringTimerRef.current != null) clearInterval(ringTimerRef.current); } catch { /* interval may already be cleared */ }
    ringTimerRef.current = null;
    try { gainRef.current?.gain?.cancelScheduledValues?.(0); } catch { /* gain may be disconnected */ }
    try { if (gainRef.current) gainRef.current.gain.value = 0; } catch { /* gain may be null */ }
    try { oscRef.current?.stop?.(); } catch { /* oscillator may already be stopped */ }
    try { oscRef.current?.disconnect?.(); } catch { /* oscillator may already be disconnected */ }
    try { gainRef.current?.disconnect?.(); } catch { /* gain may already be disconnected */ }
    try {
      const ctx = audioCtxRef.current as AudioContextWithClosing | null;
      const w = window as WindowWithAudioRingtone;
      const globalCtx = w.__unlockedAudioCtx;
      if (ctx && ctx.state !== 'closed' && ctx !== globalCtx && ctx !== prev?.ctx && !ctx.__closing) {
        try {
          ctx.__closing = true;
          const p = ctx.close?.();
          if (p && typeof p.catch === 'function') {
            (p as Promise<void>).catch(() => { /* ignore close errors */ });
          }
        } catch { /* context close may fail */ }
      }
    } catch { /* context check may fail */ }
    oscRef.current = null;
    gainRef.current = null;
    audioCtxRef.current = null;
    setNeedsUnlock(false);
  };

  // Caller-side ring-back: audible feedback that the call is actually
  // going out, not just a silent "Calling..." screen. Starts the moment
  // there's an outgoing call with no accepted currentCall yet (ringing),
  // and stops on all three ways that state can resolve -- answer
  // (currentCall gets set), decline (handleCallDeclined clears
  // outgoingCall), and timeout (the auto-cancel timeout in
  // useCallManager's startCall calls endCall, which also clears
  // outgoingCall) -- all of which this effect already reacts to via
  // outgoingCall/currentCall themselves, no separate wiring needed.
  const ringbackRef = useRef<{ stop: () => void } | null>(null);
  useEffect(() => {
    const ringing = !!outgoingCall && !currentCall;
    if (ringing) {
      if (!ringbackRef.current) ringbackRef.current = startRingbackTone();
    } else {
      ringbackRef.current?.stop();
      ringbackRef.current = null;
    }
    return () => {
      ringbackRef.current?.stop();
      ringbackRef.current = null;
    };
  }, [outgoingCall, currentCall]);

  // Reset hasAnswered when a NEW incoming call arrives OR when currentCall ends
  useEffect(() => {
    if (incomingCall?.id) {
      setHasAnswered(false);
    }
  }, [incomingCall?.id]);
  
  // CRITICAL FIX: Reset hasAnswered when currentCall ends or is cleared
  useEffect(() => {
    if (!currentCall) {
      setHasAnswered(false);
    }
  }, [currentCall]);

  // Start ringtone when an incoming call appears; stop any previous one first
  useEffect(() => {
    console.log('📞 [OVERLAY][RINGTONE] Effect triggered:', {
      hasIncomingCall: !!incomingCall,
      incomingCallId: incomingCall?.id,
      hasAnswered,
      hasCurrentCall: !!currentCall,
      currentCallId: currentCall?.id
    });
    
    if (!incomingCall) {
      console.log('📞 [OVERLAY][RINGTONE] No incoming call, stopping ringtone');
      hardStopRingtone();
      return;
    }
    
    // CRITICAL FIX: Only skip if answered OR active call exists for THIS call
    if (hasAnswered || (currentCall && currentCall.id === incomingCall.id)) {
      console.log('📞 [OVERLAY][RINGTONE] Skipping ringtone - call answered or active:', { 
        incomingCall: !!incomingCall,
        incomingCallId: incomingCall.id,
        hasAnswered, 
        currentCall: !!currentCall,
        currentCallId: currentCall?.id,
        sameCall: currentCall?.id === incomingCall.id
      });
      hardStopRingtone();
      return;
    }
    
    console.log('📞 [OVERLAY] 🚨🚨🚨 STARTING RINGTONE FOR INCOMING CALL:', incomingCall.id, 'caller:', incomingCall.caller_name);

    // Pre-kill any ghost/duplicate ring before creating a new one
    hardStopRingtone();

    const w = window as WindowWithAudioRingtone;
    const AudioContextConstructor = window.AudioContext || w.webkitAudioContext;
    const globalCtx = w.__unlockedAudioCtx;
    const ctx: AudioContext = globalCtx ?? (AudioContextConstructor ? new AudioContextConstructor() : new AudioContext());
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
      try { 
        if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
          navigator.vibrate(100);
        }
      } catch { /* vibrate may not be supported */ }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingCall?.id, hasAnswered]);

  // CRITICAL FIX: Stop ringtone immediately when incoming call disappears OR when currentCall is set
  useEffect(() => {
    if (!incomingCall || currentCall) {
      console.log('📞 [OVERLAY] Stopping ringtone - incomingCall:', !!incomingCall, 'currentCall:', !!currentCall);
      hardStopRingtone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingCall?.id, currentCall?.id]);

  // Safety: if current call transitions to accepted for THIS incoming call, ensure ringtone is stopped
  useEffect(() => {
    if (currentCall && incomingCall && currentCall.id === incomingCall.id) {
      console.log('📞 [OVERLAY] Current call matches incoming call, stopping ringtone');
      hardStopRingtone();
      setHasAnswered(true);
    }
  }, [currentCall?.id, currentCall?.status, incomingCall?.id]);

  const handleAnswer = async () => {
    console.log('📞 [OVERLAY] handleAnswer called, incomingCall:', incomingCall);
    // Stop ring first
    hardStopRingtone();
    try { stopAllRingtones?.(); } catch { /* stopAllRingtones may not be available */ }
    
    if (incomingCall?.id) {
      console.log('📞 [OVERLAY] Calling answerCall with id:', incomingCall.id);
      try {
        const result = await answerCall(incomingCall.id);
        console.log('📞 [OVERLAY] answerCall result:', result);
        // Set hasAnswered after a brief delay to allow currentCall to be set
        setTimeout(() => {
          setHasAnswered(true);
        }, 200);

        // The only thing that actually renders <JitsiCall> is
        // ChatRoom.tsx's own inline block -- this overlay is global (any
        // page), so answering while that specific chat room isn't the
        // page currently open left currentCall.status flip to 'accepted'
        // with nothing on screen to show it, and the callee had to find
        // and open the right chat room manually to see the call at all.
        // room_id rides along on the primary broadcast payload (see
        // startCall in useCallManager.jsx); the DB-insert/poll fallback
        // paths don't carry it (call_sessions has no room_id column), so
        // fall back to resolving the caller's direct room the same way
        // every other "message this person" entry point in the app does.
        let targetRoomId = incomingCall.room_id || null;
        if (!targetRoomId && user?.id && incomingCall.caller_id) {
          try {
            const { data, error } = await supabase.rpc('get_or_create_direct_room', {
              user1_id: user.id,
              user2_id: incomingCall.caller_id,
            });
            if (!error && data) targetRoomId = data;
          } catch (e) {
            console.warn('📞 [OVERLAY] Could not resolve direct room to navigate to:', e);
          }
        }
        if (targetRoomId) {
          navigate(`/chatapp?room=${targetRoomId}`);
        }
      } catch (error) {
        console.error('📞 [OVERLAY] Error answering call:', error);
        // If answer fails, don't set hasAnswered so user can try again
      }
    } else {
      console.error('📞 [OVERLAY] No incomingCall.id to answer!');
    }
  };

  const handleDecline = () => {
    console.log('📞 [OVERLAY] handleDecline called, incomingCall:', incomingCall);
    hardStopRingtone();
    try { stopAllRingtones?.(); } catch { /* stopAllRingtones may not be available */ }
    if (incomingCall?.id) {
      console.log('📞 [OVERLAY] Calling declineCall with id:', incomingCall.id);
      declineCall(incomingCall.id, 'declined');
    } else {
      console.error('📞 [OVERLAY] No incomingCall.id to decline!');
    }
  };
  
  const handleCancel = () => {
    console.log('📞 [OVERLAY] handleCancel called, outgoingCall:', outgoingCall);
    hardStopRingtone();
    try { stopAllRingtones?.(); } catch { /* stopAllRingtones may not be available */ }
    if (outgoingCall?.id) {
      console.log('📞 [OVERLAY] Calling endCall with id:', outgoingCall.id);
      endCall(outgoingCall.id, 'cancelled');
    } else {
      console.error('📞 [OVERLAY] No outgoingCall.id to cancel!');
    }
  };

  // CRITICAL FIX: Show overlay for incoming calls OR outgoing calls
  // For incoming: show if exists AND (not answered OR currentCall not set yet)
  // This prevents the overlay from disappearing before currentCall is set
  const showIncomingOverlay = incomingCall && (!hasAnswered || !currentCall) && incomingCall.status === 'ringing';
  // For outgoing: show if exists and no active call (keep showing until answered/declined)
  const showOutgoingOverlay = outgoingCall && !currentCall;
  
  // DEBUG: Log decision
  console.log('📞 [OVERLAY] Render decision:', {
    showIncomingOverlay,
    showOutgoingOverlay,
    incomingCall: incomingCall ? { id: incomingCall.id, status: incomingCall.status } : null,
    outgoingCall: outgoingCall ? { id: outgoingCall.id, status: outgoingCall.status } : null,
    hasAnswered,
    currentCall: currentCall ? { id: currentCall.id, status: currentCall.status } : null
  });
  
  // Don't render if no call to show OR if call is fully active
  if ((!showIncomingOverlay && !showOutgoingOverlay) || (currentCall && currentCall.status === 'accepted')) {
    console.log('📞 [OVERLAY] ❌ NOT RENDERING - No call to show or call is active');
    return null;
  }
  
  console.log('📞 [OVERLAY] ✅ RENDERING - Will show overlay');

  const callToShow = showIncomingOverlay ? incomingCall : outgoingCall;
  const isIncoming = !!showIncomingOverlay;
  
  console.log('📞 [OVERLAY] Rendering call overlay:', { 
    type: isIncoming ? 'INCOMING' : 'OUTGOING',
    call: callToShow 
  });

  // CRITICAL: Force render - this overlay MUST be visible
  console.log('📞 [OVERLAY] 🚨 FORCE RENDERING OVERLAY - Call exists:', !!callToShow);
  
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      style={{ 
        zIndex: 99999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={(e) => {
        // Prevent closing on background click
        e.stopPropagation();
        // Allow a single tap to unlock audio if autoplay blocked
        if (needsUnlock && audioCtxRef.current?.resume) {
          audioCtxRef.current.resume()
            .then(() => {
              setNeedsUnlock(false);
              console.log('🔊 [RING] Audio unlocked via background tap');
            })
            .catch((err) => {
              console.error('❌ [RING] Resume failed:', err);
            });
        }
      }}
    >
      <div
        className={cn(
          'flex flex-col items-center gap-6 rounded-2xl bg-white px-10 py-8 text-center shadow-2xl border-2 border-primary/20',
          'dark:bg-gray-900 dark:text-white min-w-[320px]'
        )}
        onClick={(e) => e.stopPropagation()}
        style={{ 
          position: 'relative',
          zIndex: 100001,
          pointerEvents: 'auto',
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '1rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
      >
        <div className="text-2xl font-bold mb-2">
          {isIncoming ? '📞 Incoming Call' : '📞 Calling...'}
        </div>
        <div className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
          {isIncoming 
            ? (callToShow.caller_name || 'Unknown Caller')
            : (callToShow.receiver_name || 'Unknown User')}
        </div>
        <div className="text-sm text-gray-500 mb-4">
          {isIncoming 
            ? (callToShow.type === 'video' ? 'Video Call' : 'Voice Call')
            : 'Waiting for answer...'}
        </div>
        
        {/* DEBUG: Show call ID for troubleshooting */}
        <div className="text-xs text-gray-400 mb-1">
          Call ID: {callToShow.id?.substring(0, 8)}...
        </div>
        {/* signal: whether the realtime channel is actually up, or we're
            relying on the 3s poll fallback -- exactly what this overlay
            can't otherwise show when "nothing happens" on one side. */}
        <div className="text-xs mb-2 flex items-center justify-center gap-1">
          <span
            className={cn('inline-block h-1.5 w-1.5 rounded-full', signalStatus === 'ws' ? 'bg-green-500' : signalStatus === 'polling' ? 'bg-amber-500' : 'bg-gray-400')}
          />
          <span className="text-gray-400">
            signal: {signalStatus === 'ws' ? 'ws ok' : signalStatus === 'polling' ? 'polling' : 'connecting'}
          </span>
        </div>

        {needsUnlock && (
          // Silent audio previously showed only a small gray "Tap to
          // enable ringtone" line easy to miss on a glanced-at phone --
          // this is the case where the overlay is the ONLY signal the
          // member has that a call exists at all, so it has to be
          // unmissable: full-width, bright, animated.
          <div
            className="w-full animate-pulse rounded-xl border-2 border-amber-400 bg-amber-400/20 px-3 py-2.5 text-center space-y-2"
            role="alert"
          >
            <div className="text-sm font-bold text-amber-700 dark:text-amber-300">
              🔇 Sound is blocked — tap below to hear the ringtone
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="w-full bg-amber-500 text-black hover:bg-amber-400 font-bold"
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

        <div className="flex gap-6 mt-2" style={{ zIndex: 10001, position: 'relative' }}>
          {isIncoming ? (
            <>
              <Button
                size="lg"
                variant="destructive"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  e.preventDefault();
                  console.log('📞 [OVERLAY] Decline clicked');
                  handleDecline(); 
                }}
                aria-label="Decline"
                className="h-16 w-16 rounded-full shadow-lg"
                style={{ 
                  zIndex: 10002,
                  position: 'relative',
                  pointerEvents: 'auto',
                  cursor: 'pointer'
                }}
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
              <Button
                size="lg"
                variant="default"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  e.preventDefault();
                  console.log('📞 [OVERLAY] Answer clicked');
                  handleAnswer(); 
                }}
                aria-label="Answer"
                className="h-16 w-16 rounded-full shadow-lg bg-green-600 hover:bg-green-700 text-white"
                style={{ 
                  zIndex: 10002,
                  position: 'relative',
                  pointerEvents: 'auto',
                  cursor: 'pointer'
                }}
              >
                <Phone className="h-6 w-6" />
              </Button>
            </>
          ) : (
            <Button
              size="lg"
              variant="destructive"
              onClick={(e) => { 
                e.stopPropagation(); 
                e.preventDefault();
                console.log('📞 [OVERLAY] Cancel outgoing call clicked');
                handleCancel();
              }}
              aria-label="Cancel Call"
              className="h-16 w-16 rounded-full shadow-lg"
              style={{ 
                zIndex: 10002,
                position: 'relative',
                pointerEvents: 'auto',
                cursor: 'pointer'
              }}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
