import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export const useWebRTC = (callSession, user) => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [connectionState, setConnectionState] = useState('new');
  
  const localAudioRef = useRef();
  const remoteAudioRef = useRef();
  const peerConnectionRef = useRef();
  const localStreamRef = useRef();
  const signalingChannelRef = useRef();
  const iceCandidatesRef = useRef([]);
  
  const { toast } = useToast();

  // Improved WebRTC configuration with more STUN servers
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.stunprotocol.org:3478' }
    ],
    iceCandidatePoolSize: 10
  };

  // Initialize WebRTC connection with better error handling
  const initializeWebRTC = async () => {
    try {
      console.log('🚀 [WEBRTC] Initializing for call:', callSession?.id);
      
      // Get user media first
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        }
      });

      console.log('🎤 [WEBRTC] Got local media stream');
      localStreamRef.current = stream;
      
      // Create peer connection
      peerConnectionRef.current = new RTCPeerConnection(rtcConfig);
      console.log('📡 [WEBRTC] Created peer connection');
      
      // Add local stream tracks
      stream.getTracks().forEach(track => {
        console.log('➕ [WEBRTC] Adding local track:', track.kind);
        peerConnectionRef.current.addTrack(track, stream);
      });

      // Set up connection state monitoring
      peerConnectionRef.current.onconnectionstatechange = () => {
        const state = peerConnectionRef.current.connectionState;
        console.log('📡 [WEBRTC] Connection state:', state);
        setConnectionState(state);
        
        if (state === 'connected') {
          toast({
            title: "Connected",
            description: "Audio call connected!",
          });
        }
      };

      // Handle remote stream - CRITICAL FIX
      peerConnectionRef.current.ontrack = (event) => {
        console.log('🎵 [WEBRTC] Got remote track:', event.track.kind);
        const [remoteStream] = event.streams;
        
        if (remoteAudioRef.current && remoteStream) {
          console.log('🔊 [WEBRTC] Setting remote stream to audio element');
          remoteAudioRef.current.srcObject = remoteStream;
          
          // Force audio to play
          const playAudio = async () => {
            try {
              await remoteAudioRef.current.play();
              console.log('✅ [WEBRTC] Remote audio playing');
            } catch (error) {
              console.error('❌ [WEBRTC] Audio play failed:', error);
              // Try again after user interaction
              document.addEventListener('click', async () => {
                try {
                  await remoteAudioRef.current.play();
                  console.log('✅ [WEBRTC] Remote audio playing after click');
                } catch (e) {
                  console.error('❌ [WEBRTC] Audio still failed:', e);
                }
              }, { once: true });
            }
          };
          
          playAudio();
        }
      };

      // Handle ICE candidates with queuing
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 [WEBRTC] Sending ICE candidate');
          sendSignalingMessage({
            type: 'ice-candidate',
            candidate: event.candidate,
            callId: callSession.id,
            from: user.id
          });
        }
      };

      // ICE connection state changes
      peerConnectionRef.current.oniceconnectionstatechange = () => {
        console.log('🧊 [WEBRTC] ICE state:', peerConnectionRef.current.iceConnectionState);
      };

      console.log('✅ [WEBRTC] Initialization complete');
      
    } catch (error) {
      console.error('❌ [WEBRTC] Initialization failed:', error);
      toast({
        title: "Audio Error",
        description: "Failed to access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  // Improved signaling channel setup
  const setupSignalingChannel = () => {
    if (!callSession?.id) return;
    
    console.log('📡 [SIGNAL] Setting up channel for call:', callSession.id);
    
    signalingChannelRef.current = supabase
      .channel(`webrtc_${callSession.id}`, {
        config: {
          broadcast: { self: true }
        }
      })
      .on('broadcast', { event: 'webrtc_signal' }, (payload) => {
        console.log('📨 [SIGNAL] Received:', payload.payload.type);
        handleSignalingMessage(payload.payload);
      })
      .subscribe();
  };

  // Send signaling messages
  const sendSignalingMessage = (message) => {
    console.log('📤 [SIGNAL] Sending:', message.type);
    if (signalingChannelRef.current) {
      signalingChannelRef.current.send({
        type: 'broadcast',
        event: 'webrtc_signal',
        payload: message
      });
    }
  };

  // Handle signaling messages with proper error handling
  const handleSignalingMessage = async (message) => {
    if (!peerConnectionRef.current || message.from === user.id) return;

    try {
      switch (message.type) {
        case 'offer':
          console.log('📥 [SIGNAL] Processing offer');
          await peerConnectionRef.current.setRemoteDescription(message.offer);
          
          // Process queued ICE candidates
          for (const candidate of iceCandidatesRef.current) {
            await peerConnectionRef.current.addIceCandidate(candidate);
          }
          iceCandidatesRef.current = [];
          
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          
          sendSignalingMessage({
            type: 'answer',
            answer: answer,
            callId: callSession.id,
            from: user.id
          });
          break;

        case 'answer':
          console.log('📥 [SIGNAL] Processing answer');
          await peerConnectionRef.current.setRemoteDescription(message.answer);
          
          // Process queued ICE candidates
          for (const candidate of iceCandidatesRef.current) {
            await peerConnectionRef.current.addIceCandidate(candidate);
          }
          iceCandidatesRef.current = [];
          break;

        case 'ice-candidate':
          console.log('📥 [SIGNAL] Processing ICE candidate');
          if (peerConnectionRef.current.remoteDescription) {
            await peerConnectionRef.current.addIceCandidate(message.candidate);
          } else {
            // Queue the candidate
            iceCandidatesRef.current.push(message.candidate);
          }
          break;
      }
    } catch (error) {
      console.error('❌ [SIGNAL] Error processing message:', error);
    }
  };

  // Start call (caller creates offer)
  const startCall = async () => {
    if (!peerConnectionRef.current) return;
    
    try {
      console.log('📞 [WEBRTC] Creating offer');
      const offer = await peerConnectionRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      await peerConnectionRef.current.setLocalDescription(offer);
      
      sendSignalingMessage({
        type: 'offer',
        offer: offer,
        callId: callSession.id,
        from: user.id
      });
    } catch (error) {
      console.error('❌ [WEBRTC] Error creating offer:', error);
    }
  };

  // Toggle audio mute
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log('🔊 [WEBRTC] Audio toggled:', audioTrack.enabled);
        
        toast({
          title: audioTrack.enabled ? "Microphone On" : "Microphone Off",
          description: audioTrack.enabled ? "You can now be heard" : "You are muted",
        });
      }
    }
  };

  // Test audio - simplified for troubleshooting
  const testAudio = () => {
    console.log('🔊 [TEST] Audio test - Connection state:', connectionState);
    console.log('🔊 [TEST] Local stream active:', localStreamRef.current?.active);
    console.log('🔊 [TEST] Remote audio element:', !!remoteAudioRef.current);
    console.log('🔊 [TEST] Remote audio src:', !!remoteAudioRef.current?.srcObject);
    
    // Force remote audio to play
    if (remoteAudioRef.current?.srcObject) {
      remoteAudioRef.current.play().catch(console.error);
    }
  };

  // Initialize when call session is available
  useEffect(() => {
    if (callSession && user) {
      console.log('🎯 [WEBRTC] Starting initialization');
      initializeWebRTC();
      setupSignalingChannel();
      
      // Start call if outgoing
      if (!callSession.isIncoming) {
        setTimeout(() => {
          console.log('📞 [WEBRTC] Starting as caller');
          startCall();
        }, 1000);
      }
    }
  }, [callSession?.id, user?.id]);

  // Cleanup
  const cleanup = () => {
    console.log('🧹 [WEBRTC] Cleaning up');
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    if (signalingChannelRef.current) {
      supabase.removeChannel(signalingChannelRef.current);
    }
  };

  useEffect(() => {
    return cleanup;
  }, []);

  return {
    localAudioRef,
    remoteAudioRef,
    isAudioEnabled,
    isVideoEnabled,
    connectionState,
    toggleAudio,
    testAudio,
    cleanup
  };
};