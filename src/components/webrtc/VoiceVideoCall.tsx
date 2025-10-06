import { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { handleError } from '@/lib/errorHandler';

interface Props { 
  roomId: string; 
  userId: string; 
  isCaller: boolean;
  onCallEnd?: () => void;
}

const VoiceVideoCall = ({ roomId, userId, isCaller, onCallEnd }: Props) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [peer, setPeer] = useState<Peer.Instance | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'failed' | 'disconnected'>('connecting');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    let channel: any = null;

    const initializeCall = async () => {
      try {
        // Get media stream
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        if (!mounted) return;
        
        setStream(mediaStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
        }

        // Set up signaling channel
        channel = supabase.channel(`call-${roomId}`)
          .on('broadcast', { event: 'webrtc-offer' }, ({ payload }) => {
            console.log('Received offer:', payload);
            handleOffer(payload, mediaStream);
          })
          .on('broadcast', { event: 'webrtc-answer' }, ({ payload }) => {
            console.log('Received answer:', payload);
            handleAnswer(payload);
          })
          .on('broadcast', { event: 'webrtc-ice' }, ({ payload }) => {
            console.log('Received ICE candidate:', payload);
            handleICE(payload);
          })
          .subscribe();

        if (isCaller) {
          // Create peer as initiator
          const p = new Peer({ 
            initiator: true, 
            trickle: true,
            stream: mediaStream,
            config: {
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
              ]
            }
          });

          p.on('signal', (data) => {
            console.log('Sending signal:', data.type);
            channel.send({
              type: 'broadcast',
              event: data.type === 'offer' ? 'webrtc-offer' : 'webrtc-ice',
              payload: data,
            });
          });

          p.on('stream', (remoteStream) => {
            console.log('Received remote stream');
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
            }
            setConnectionState('connected');
          });

          p.on('connect', () => {
            console.log('Peer connected');
            setConnectionState('connected');
            toast({ title: 'Call Connected', description: 'You are now in a call' });
          });

          p.on('error', (err) => {
            console.error('Peer error:', err);
            handleError(err, { component: 'VoiceVideoCall' });
            setConnectionState('failed');
          });

          p.on('close', () => {
            console.log('Peer connection closed');
            setConnectionState('disconnected');
          });

          setPeer(p);
        }

      } catch (err: any) {
        console.error('Failed to initialize call:', err);
        handleError(err, { component: 'VoiceVideoCall', action: 'initializeCall' });
        if (err.name === 'NotAllowedError') {
          toast({
            variant: 'destructive',
            title: 'Media Access Denied',
            description: 'Please allow camera and microphone access to make calls.'
          });
        }
      }
    };

    const handleOffer = (offer: any, mediaStream: MediaStream) => {
      const p = new Peer({ 
        initiator: false, 
        trickle: true,
        stream: mediaStream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      p.on('signal', (data) => {
        console.log('Sending signal:', data.type);
        channel.send({
          type: 'broadcast',
          event: data.type === 'answer' ? 'webrtc-answer' : 'webrtc-ice',
          payload: data,
        });
      });

      p.on('stream', (remoteStream) => {
        console.log('Received remote stream');
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setConnectionState('connected');
      });

      p.on('connect', () => {
        console.log('Peer connected');
        setConnectionState('connected');
        toast({ title: 'Call Connected', description: 'You are now in a call' });
      });

      p.on('error', (err) => {
        console.error('Peer error:', err);
        handleError(err, { component: 'VoiceVideoCall' });
        setConnectionState('failed');
      });

      p.on('close', () => {
        console.log('Peer connection closed');
        setConnectionState('disconnected');
      });

      p.signal(offer);
      setPeer(p);
    };

    const handleAnswer = (answer: any) => {
      if (peer) {
        peer.signal(answer);
      }
    };

    const handleICE = (candidate: any) => {
      if (peer) {
        peer.signal(candidate);
      }
    };

    initializeCall();

    return () => {
      mounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
      if (peer) {
        peer.destroy();
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCaller, roomId]);

  const toggleMute = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleSpeaker = () => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !remoteVideoRef.current.muted;
      setIsSpeakerOff(!remoteVideoRef.current.muted);
    }
  };

  const endCall = () => {
    if (peer) peer.destroy();
    if (stream) stream.getTracks().forEach(track => track.stop());
    setPeer(null);
    setStream(null);
    onCallEnd?.();
    toast({ title: 'Call Ended' });
  };

  if (!stream) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Requesting camera and microphone access...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardContent className="p-0">
        <div className="relative">
          {/* Connection status */}
          <div className="absolute top-4 left-4 z-10">
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              connectionState === 'connected' ? 'bg-green-500 text-white' :
              connectionState === 'connecting' ? 'bg-yellow-500 text-white' :
              'bg-red-500 text-white'
            }`}>
              {connectionState === 'connected' ? '🟢 Connected' :
               connectionState === 'connecting' ? '🟡 Connecting...' :
               '🔴 Disconnected'}
            </div>
          </div>

          {/* Video feeds */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted">
            <div className="relative">
              <video 
                ref={localVideoRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full rounded-lg bg-black"
              />
              <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                You {isVideoOff && '(Video Off)'}
              </div>
            </div>
            <div className="relative">
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full rounded-lg bg-black"
              />
              <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
                Remote User
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="p-4 flex justify-center space-x-2 bg-background border-t">
            <Button 
              variant={isMuted ? 'destructive' : 'outline'} 
              size="icon"
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            
            <Button 
              variant={isVideoOff ? 'destructive' : 'outline'} 
              size="icon"
              onClick={toggleVideo}
              title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
            >
              {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
            </Button>

            <Button 
              variant={isSpeakerOff ? 'destructive' : 'outline'} 
              size="icon"
              onClick={toggleSpeaker}
              title={isSpeakerOff ? 'Unmute Speaker' : 'Mute Speaker'}
            >
              {isSpeakerOff ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>

            <Button 
              onClick={endCall} 
              variant="destructive"
              className="ml-4"
            >
              <PhoneOff className="h-4 w-4 mr-2" /> End Call
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceVideoCall;
