import { useEffect, useRef, useState, useCallback } from 'react';
import DailyIframe, { type DailyCall } from '@daily-co/daily-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { fetchDailyMeetingToken } from '@/lib/daily-config';

interface DailyCallOptions {
  callSession: {
    id: string;
    caller_id: string;
    receiver_id: string;
    call_type?: string;
    room_id?: string;
  };
  currentUserId: string;
  displayName: string;
  callType: 'audio' | 'video';
  onCallEnd: () => void;
}

/**
 * Replaces useJitsiCall (P1-6): same 1:1 call system (public.call_sessions),
 * same returned shape, now backed by Daily.co with a real per-user meeting
 * token minted server-side (create-daily-meeting-token), instead of a
 * public meet.jit.si room with no JWT at all.
 */
export function useDailyCall({
  callSession,
  currentUserId: _currentUserId,
  displayName,
  callType,
  onCallEnd,
}: DailyCallOptions) {
  const callContainerRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<DailyCall | null>(null);
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(callType === 'audio');
  const [participantCount, setParticipantCount] = useState(1);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const durationIntervalRef = useRef<number | null>(null);

  const updateCallStatus = useCallback(async (status: string) => {
    try {
      await supabase
        .from('call_sessions')
        .update({
          status,
          ...(status === 'accepted' ? { accepted_at: new Date().toISOString() } : {}),
          ...(status === 'ended' ? { ended_at: new Date().toISOString() } : {}),
        })
        .eq('id', callSession.id);
    } catch (error) {
      console.error('Failed to update call status:', error);
    }
  }, [callSession.id]);

  const teardown = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (callRef.current) {
      const call = callRef.current;
      callRef.current = null;
      call.leave().catch(() => {});
      call.destroy().catch(() => {});
    }
  }, []);

  const handleCallEnd = useCallback(() => {
    setConnectionState('disconnected');
    updateCallStatus('ended');
    teardown();
    onCallEnd();
  }, [onCallEnd, updateCallStatus, teardown]);

  useEffect(() => {
    let cancelled = false;

    const updateParticipantCount = (call: DailyCall) => {
      setParticipantCount(Object.keys(call.participants()).length);
    };

    const start = async () => {
      if (!callContainerRef.current) return;
      try {
        const { room_url, token } = await fetchDailyMeetingToken({
          roomKind: 'call_session',
          roomId: callSession.id,
          displayName,
        });
        if (cancelled || !callContainerRef.current) return;

        const call = DailyIframe.createFrame(callContainerRef.current, {
          iframeStyle: { width: '100%', height: '100%', border: '0' },
          showLeaveButton: false,
          showFullscreenButton: false,
        });
        callRef.current = call;

        call.on('joined-meeting', () => {
          setIsLoading(false);
          setConnectionState('connected');
          durationIntervalRef.current = window.setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);
          updateCallStatus('accepted');
          toast({ title: 'Connected', description: 'Call connected successfully' });
        });
        call.on('left-meeting', () => {
          handleCallEnd();
        });
        call.on('participant-joined', () => updateParticipantCount(call));
        call.on('participant-left', () => updateParticipantCount(call));
        call.on('camera-error', () => {
          toast({ title: 'Camera/mic error', description: 'Could not access your camera or microphone.', variant: 'destructive' });
        });
        call.on('error', (e: any) => {
          console.error('❌ [DAILY] error:', e);
          toast({ title: 'Call Failed', description: 'Failed to initialize call', variant: 'destructive' });
          setIsLoading(false);
        });

        await call.join({
          url: room_url,
          token,
          userName: displayName,
          startVideoOff: callType === 'audio',
          startAudioOff: false,
        });
      } catch (error) {
        console.error('❌ [DAILY] Initialization error:', error);
        toast({
          title: 'Connection Error',
          description: 'Failed to load video call. Please check your connection.',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    };

    start();

    return () => {
      cancelled = true;
      teardown();
    };
  }, [callSession.id, displayName, callType, toast, updateCallStatus, teardown, handleCallEnd]);

  const toggleAudio = useCallback(() => {
    if (!callRef.current) return;
    setIsAudioMuted((muted) => {
      const next = !muted;
      callRef.current?.setLocalAudio(!next);
      return next;
    });
  }, []);

  const toggleVideo = useCallback(() => {
    if (!callRef.current) return;
    setIsVideoMuted((muted) => {
      const next = !muted;
      callRef.current?.setLocalVideo(!next);
      return next;
    });
  }, []);

  const hangUp = useCallback(() => {
    handleCallEnd();
  }, [handleCallEnd]);

  return {
    callContainerRef,
    isLoading,
    isAudioMuted,
    isVideoMuted,
    participantCount,
    callDuration,
    connectionState,
    toggleAudio,
    toggleVideo,
    hangUp,
  };
}
