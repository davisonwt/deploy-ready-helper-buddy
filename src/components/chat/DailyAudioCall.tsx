import React, { useEffect, useRef, useState } from 'react';
import DailyIframe, { DailyCall } from '@daily-co/daily-js';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DailyAudioCallProps {
  callSession: {
    id: string;
    caller_id: string;
    receiver_id: string;
    room_id: string;
    status: string;
  };
  currentUserId: string;
  callerName: string;
  onEndCall: () => void;
}

export const DailyAudioCall: React.FC<DailyAudioCallProps> = ({
  callSession,
  currentUserId,
  callerName,
  onEndCall,
}) => {
  const { toast } = useToast();
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callState, setCallState] = useState<string>('loading');
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    let daily: DailyCall | null = null;

    const initCall = async () => {
      try {
        console.log('Initializing Daily call for room:', callSession.room_id);

        // Get room URL and token from edge function
        const { data, error } = await supabase.functions.invoke('create-daily-room', {
          body: {
            roomName: `call-${callSession.id}`,
            userId: currentUserId,
          },
        });

        if (error) throw error;
        if (!data?.token || !data?.roomUrl) {
          throw new Error('No token or room URL received');
        }

        console.log('Daily room created:', data.roomUrl);

        // Create Daily call object
        daily = DailyIframe.createCallObject({
          audioSource: true,
          videoSource: false,
        });

        daily.on('joined-meeting', () => {
          console.log('Joined Daily meeting');
          if (mounted) {
            setCallState('connected');
            timerRef.current = window.setInterval(() => {
              setDuration(d => d + 1);
            }, 1000);
          }
        });

        daily.on('participant-joined', (event) => {
          console.log('Participant joined:', event.participant.user_name);
        });

        daily.on('participant-left', () => {
          console.log('Participant left');
          if (mounted) {
            toast({ title: 'Call ended', description: 'Other participant left' });
            onEndCall();
          }
        });

        daily.on('error', (error) => {
          console.error('Daily error:', error);
          if (mounted) {
            toast({
              title: 'Call error',
              description: error.errorMsg || 'Connection failed',
              variant: 'destructive',
            });
          }
        });

        // Join the call
        await daily.join({ url: data.roomUrl, token: data.token });
        
        if (mounted) {
          setCallObject(daily);
        }

      } catch (error) {
        console.error('Error initializing Daily call:', error);
        if (mounted) {
          toast({
            title: 'Failed to start call',
            description: error instanceof Error ? error.message : 'Unknown error',
            variant: 'destructive',
          });
          onEndCall();
        }
      }
    };

    initCall();

    return () => {
      mounted = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (daily) {
        daily.destroy();
      }
    };
  }, [callSession.id, currentUserId, toast, onEndCall]);

  const toggleMute = () => {
    if (callObject) {
      callObject.setLocalAudio(!isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleSpeaker = () => {
    if (callObject) {
      const participants = callObject.participants();
      Object.values(participants).forEach((participant) => {
        if (!participant.local) {
          callObject.updateParticipant(participant.session_id, {
            setAudio: !isSpeakerOn,
          });
        }
      });
      setIsSpeakerOn(!isSpeakerOn);
    }
  };

  const handleEndCall = () => {
    if (callObject) {
      callObject.leave();
    }
    onEndCall();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card border rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center space-y-6">
          {/* Status */}
          <div>
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Phone className="w-12 h-12 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold">{callerName}</h2>
            <p className="text-muted-foreground mt-2">
              {callState === 'loading' && 'Connecting...'}
              {callState === 'connected' && formatDuration(duration)}
            </p>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={toggleMute}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={toggleSpeaker}
            >
              {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>

            <Button
              variant="destructive"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={handleEndCall}
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
