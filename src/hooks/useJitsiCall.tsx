import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { JITSI_CONFIG } from '@/lib/jitsi-config';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

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
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(callType === 'audio');
  const [participantCount, setParticipantCount] = useState(1);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  const durationIntervalRef = useRef<number | null>(null);

  // Generate unique room name for this call using JaaS format
  const roomName = JITSI_CONFIG.getRoomName(`call_${callSession.id.replace(/-/g, '')}`);

  // Load JaaS script and initialize
  useEffect(() => {
    const loadJitsiScript = () => {
      if (window.JitsiMeetExternalAPI) {
        initializeJitsi();
        return;
      }

      const script = document.createElement('script');
      script.src = JITSI_CONFIG.getScriptUrl();
      script.async = true;
      script.onload = initializeJitsi;
      script.onerror = () => {
        toast({
          title: 'Connection Error',
          description: 'Failed to load video call. Please check your connection.',
          variant: 'destructive',
        });
        setIsLoading(false);
      };
      document.body.appendChild(script);
    };

    const initializeJitsi = () => {
      if (!jitsiContainerRef.current) return;

      try {
        const configOverwrite = callType === 'audio' 
          ? { startWithVideoMuted: true, startWithAudioMuted: false }
          : { startWithVideoMuted: false, startWithAudioMuted: false };

        const options: any = {
          roomName,
          parentNode: jitsiContainerRef.current,
          width: '100%',
          height: '100%',
          userInfo: { displayName },
          configOverwrite: {
            ...configOverwrite,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            enableClosePage: false,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup', 'settings', 'desktop', 'fullscreen'],
            MOBILE_APP_PROMO: false,
          },
        };

        jitsiApiRef.current = new window.JitsiMeetExternalAPI(JITSI_CONFIG.domain, options);

        // Event listeners
        jitsiApiRef.current.addListener('videoConferenceJoined', () => {
          console.log('📞 [JITSI] Conference joined');
          setIsLoading(false);
          setConnectionState('connected');
          
          // Start call duration timer
          durationIntervalRef.current = window.setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);

          // Update call status in database
          updateCallStatus('accepted');

          toast({
            title: 'Connected',
            description: 'Call connected successfully',
          });
        });

        jitsiApiRef.current.addListener('videoConferenceLeft', () => {
          console.log('📞 [JITSI] Conference left');
          handleCallEnd();
        });

        jitsiApiRef.current.addListener('participantJoined', (participant: any) => {
          console.log('📞 [JITSI] Participant joined:', participant);
          updateParticipantCount();
        });

        jitsiApiRef.current.addListener('participantLeft', (participant: any) => {
          console.log('📞 [JITSI] Participant left:', participant);
          updateParticipantCount();
        });

        jitsiApiRef.current.addListener('audioMuteStatusChanged', ({ muted }: { muted: boolean }) => {
          setIsAudioMuted(muted);
        });

        jitsiApiRef.current.addListener('videoMuteStatusChanged', ({ muted }: { muted: boolean }) => {
          setIsVideoMuted(muted);
        });

        jitsiApiRef.current.addListener('readyToClose', () => {
          console.log('📞 [JITSI] Ready to close');
          handleCallEnd();
        });

      } catch (error) {
        console.error('❌ [JITSI] Initialization error:', error);
        toast({
          title: 'Call Failed',
          description: 'Failed to initialize call',
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    };

    const updateParticipantCount = () => {
      if (jitsiApiRef.current) {
        const participants = jitsiApiRef.current.getNumberOfParticipants();
        setParticipantCount(participants + 1); // +1 for local participant
      }
    };

    loadJitsiScript();

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (jitsiApiRef.current) {
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [callSession.id, displayName, roomName, callType, toast]);

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

    if (jitsiApiRef.current) {
      jitsiApiRef.current.dispose();
      jitsiApiRef.current = null;
    }

    onCallEnd();
  }, [onCallEnd, updateCallStatus]);

  const toggleAudio = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleAudio');
    }
  }, []);

  const toggleVideo = useCallback(() => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleVideo');
    }
  }, []);

  const hangUp = useCallback(() => {
    handleCallEnd();
  }, [handleCallEnd]);

  return {
    jitsiContainerRef,
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
