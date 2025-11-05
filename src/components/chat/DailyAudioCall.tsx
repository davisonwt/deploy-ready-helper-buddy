import React, { useEffect, useRef, useState } from 'react';
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
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callState, setCallState] = useState<string>('loading');
  const [duration, setDuration] = useState(0);
  const timerRef = useRef<number | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const signalingChannelRef = useRef<any>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidate[]>([]);

  useEffect(() => {
    let mounted = true;

    const initWebRTC = async () => {
      try {
        console.log('Initializing WebRTC call for session:', callSession.id);

        // Get user media
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          } 
        });
        localStreamRef.current = stream;
        console.log('Got local audio stream');

        // Create peer connection
        const config: RTCConfiguration = {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        };
        const pc = new RTCPeerConnection(config);
        peerConnectionRef.current = pc;

        // Add local audio track
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        // Handle remote audio
        pc.ontrack = (event) => {
          console.log('Received remote track');
          if (remoteAudioRef.current && event.streams[0]) {
            remoteAudioRef.current.srcObject = event.streams[0];
            remoteAudioRef.current.play().catch(e => {
              console.error('Error playing remote audio:', e);
            });
          }
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            console.log('Sending ICE candidate');
            sendSignalingMessage({
              type: 'ice-candidate',
              candidate: event.candidate,
              from: currentUserId,
              to: callSession.caller_id === currentUserId ? callSession.receiver_id : callSession.caller_id
            });
          }
        };

        // Handle connection state
        pc.onconnectionstatechange = () => {
          console.log('Connection state:', pc.connectionState);
          if (pc.connectionState === 'connected' && mounted) {
            setCallState('connected');
            timerRef.current = window.setInterval(() => {
              setDuration(d => d + 1);
            }, 1000);
          } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            if (mounted) {
              toast({ title: 'Call ended', description: 'Connection lost' });
              onEndCall();
            }
          }
        };

        // Set up signaling channel
        const channel = supabase.channel(`call-signal-${callSession.id}`);
        signalingChannelRef.current = channel;

        channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
          if (!mounted || payload.from === currentUserId) return;
          console.log('Received signal:', payload.type);

          try {
            if (payload.type === 'offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
              // Process queued ICE candidates
              while (iceCandidatesQueue.current.length > 0) {
                const candidate = iceCandidatesQueue.current.shift();
                if (candidate) await pc.addIceCandidate(candidate);
              }
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              sendSignalingMessage({
                type: 'answer',
                answer: pc.localDescription,
                from: currentUserId,
                to: payload.from
              });
            } else if (payload.type === 'answer') {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
              // Process queued ICE candidates
              while (iceCandidatesQueue.current.length > 0) {
                const candidate = iceCandidatesQueue.current.shift();
                if (candidate) await pc.addIceCandidate(candidate);
              }
            } else if (payload.type === 'ice-candidate') {
              const candidate = new RTCIceCandidate(payload.candidate);
              if (pc.remoteDescription) {
                await pc.addIceCandidate(candidate);
              } else {
                iceCandidatesQueue.current.push(candidate);
              }
            }
          } catch (error) {
            console.error('Error handling signal:', error);
          }
        });

        await channel.subscribe();

        // If caller, create and send offer
        if (callSession.caller_id === currentUserId) {
          console.log('Creating offer as caller');
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendSignalingMessage({
            type: 'offer',
            offer: pc.localDescription,
            from: currentUserId,
            to: callSession.receiver_id
          });
        }

      } catch (error) {
        console.error('Error initializing WebRTC:', error);
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

    const sendSignalingMessage = (message: any) => {
      if (signalingChannelRef.current) {
        signalingChannelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: message
        });
      }
    };

    initWebRTC();

    return () => {
      mounted = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (signalingChannelRef.current) {
        signalingChannelRef.current.unsubscribe();
      }
    };
  }, [callSession.id, currentUserId, toast, onEndCall, callSession.caller_id, callSession.receiver_id]);

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !isSpeakerOn;
      setIsSpeakerOn(!isSpeakerOn);
    }
  };

  const handleEndCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
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
      <audio ref={remoteAudioRef} autoPlay playsInline />
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
