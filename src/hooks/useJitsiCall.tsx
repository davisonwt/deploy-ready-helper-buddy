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

  const durationIntervalRef = useRef<number | null>(null);
  const apiRef = useRef<any>(null);

  // Use existing room_id if provided (e.g., when joining an invite), otherwise generate one
  const roomName = callSession.room_id || JITSI_CONFIG.getRoomName(`call_${callSession.id.replace(/-/g, '')}`);

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

  // Called when Jitsi API is ready (External API instance or null for iframe fallback)
  const onApiReady = useCallback((externalApi: any) => {
    console.log('📞 [JITSI] onApiReady called, hasApi:', !!externalApi);
    
    setIsLoading(false);
    setConnectionState('connected');
    
    // Start duration timer
    if (!durationIntervalRef.current) {
      durationIntervalRef.current = window.setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    if (externalApi) {
      // We have the External API - store it for control
      apiRef.current = externalApi;
      
      // Listen for events
      externalApi.addListener('videoConferenceJoined', () => {
        console.log('📞 [JITSI] ✅ Conference joined - audio should be active');
        updateCallStatus('accepted');
        toast({
          title: 'Connected',
          description: 'You are now in the call.',
        });
      });

      externalApi.addListener('audioMuteStatusChanged', (data: any) => {
        setIsAudioMuted(data.muted);
      });

      externalApi.addListener('videoMuteStatusChanged', (data: any) => {
        setIsVideoMuted(data.muted);
      });

      externalApi.addListener('participantJoined', () => {
        setParticipantCount(prev => prev + 1);
      });

      externalApi.addListener('participantLeft', () => {
        setParticipantCount(prev => Math.max(1, prev - 1));
      });

      externalApi.addListener('readyToClose', () => {
        handleCallEnd();
      });
    } else {
      // Iframe fallback - no API control, mark as connected after delay
      toast({
        title: 'Connected',
        description: 'Call started. Use Jitsi controls in the window.',
      });
    }
  }, [handleCallEnd, updateCallStatus, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
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
