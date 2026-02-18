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

  // Called when JitsiMeeting's onApiReady fires
  const onApiReady = useCallback((externalApi: any) => {
    console.log('📞 [JITSI] API ready');
    apiRef.current = externalApi;

    // Clear any loading timeout since API is ready
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }

    // Set a fallback: if conference doesn't join in 10s after API ready, force connected
    loadingTimeoutRef.current = window.setTimeout(() => {
      console.log('📞 [JITSI] Forcing connected state after timeout');
      setIsLoading(false);
      setConnectionState('connected');
      durationIntervalRef.current = window.setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
      updateCallStatus('accepted');
    }, 10000);

    externalApi.addListener('videoConferenceJoined', () => {
      console.log('📞 [JITSI] Conference joined');
      // Clear the fallback timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      setIsLoading(false);
      setConnectionState('connected');
      
      durationIntervalRef.current = window.setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      updateCallStatus('accepted');

      toast({
        title: 'Connected',
        description: 'Call connected successfully',
      });
    });

    externalApi.addListener('videoConferenceLeft', () => {
      console.log('📞 [JITSI] Conference left');
      handleCallEnd();
    });

    externalApi.addListener('participantJoined', () => {
      const count = externalApi.getNumberOfParticipants();
      setParticipantCount(count + 1);
    });

    externalApi.addListener('participantLeft', () => {
      const count = externalApi.getNumberOfParticipants();
      setParticipantCount(count + 1);
    });

    externalApi.addListener('audioMuteStatusChanged', ({ muted }: { muted: boolean }) => {
      setIsAudioMuted(muted);
    });

    externalApi.addListener('videoMuteStatusChanged', ({ muted }: { muted: boolean }) => {
      setIsVideoMuted(muted);
    });

    externalApi.addListener('readyToClose', () => {
      console.log('📞 [JITSI] Ready to close');
      handleCallEnd();
    });
  }, [handleCallEnd, updateCallStatus, toast]);

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
