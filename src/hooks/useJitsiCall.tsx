import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { JITSI_CONFIG } from '@/lib/jitsi-config';

interface JitsiCallOptions {
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

export function useJitsiCall({
  callSession,
  currentUserId,
  displayName,
  callType,
  onCallEnd,
}: JitsiCallOptions) {
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(callType === 'audio');
  const [participantCount, setParticipantCount] = useState(1);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const loadingTimeoutRef = useRef<number | null>(null);

  const durationIntervalRef = useRef<number | null>(null);
  const apiRef = useRef<any>(null);

  // Generate unique room name for this call
  const roomName = JITSI_CONFIG.getRoomName(`call_${callSession.id.replace(/-/g, '')}`);

  // Update call status in database
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

  const handleCallEnd = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    
    setConnectionState('disconnected');
    updateCallStatus('ended');

    if (apiRef.current) {
      try { apiRef.current.dispose(); } catch {}
      apiRef.current = null;
    }

    onCallEnd();
  }, [onCallEnd, updateCallStatus]);

  // Called when Jitsi iframe loads
  const onApiReady = useCallback((_api: any) => {
    console.log('📞 [JITSI] ✅ Jitsi iframe loaded - marking call as connected');
    
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    setIsLoading(false);
    setConnectionState('connected');
    
    if (!durationIntervalRef.current) {
      durationIntervalRef.current = window.setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    toast({
      title: 'Connected',
      description: 'You are now in the call. Speak into your microphone.',
    });
  }, [toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (apiRef.current) {
        try { apiRef.current.dispose(); } catch {}
        apiRef.current = null;
      }
    };
  }, []);

  const toggleAudio = useCallback(() => {
    apiRef.current?.executeCommand('toggleAudio');
  }, []);

  const toggleVideo = useCallback(() => {
    apiRef.current?.executeCommand('toggleVideo');
  }, []);

  const hangUp = useCallback(() => {
    handleCallEnd();
  }, [handleCallEnd]);

  return {
    roomName,
    onApiReady,
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
