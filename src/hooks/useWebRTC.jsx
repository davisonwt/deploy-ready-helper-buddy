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
  
  const { toast } = useToast();

  // WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Initialize WebRTC connection
  const initializeWebRTC = async () => {
    try {
      console.log('🚀 Initializing WebRTC for call session:', callSession.id);
      
      // Create peer connection
      peerConnectionRef.current = new RTCPeerConnection(rtcConfig);
      
      // Set up connection state monitoring
      peerConnectionRef.current.onconnectionstatechange = () => {
        const state = peerConnectionRef.current.connectionState;
        console.log('📡 WebRTC connection state:', state);
        setConnectionState(state);
        
        if (state === 'connected') {
          toast({
            title: "Connected",
            description: "Audio call connected successfully!",
          });
        } else if (state === 'failed' || state === 'disconnected') {
          toast({
            title: "Connection Issue",
            description: "Call connection lost. Trying to reconnect...",
            variant: "destructive",
          });
        }
      };

      // Handle incoming remote stream
      peerConnectionRef.current.ontrack = (event) => {
        console.log('🎵 Received remote audio stream');
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('🧊 Sending ICE candidate');
          sendSignalingMessage({
            type: 'ice-candidate',
            candidate: event.candidate,
            callId: callSession.id
          });
        }
      };

      // Get user media (audio)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      localStreamRef.current = stream;
      
      // Add local audio track to peer connection
      stream.getTracks().forEach(track => {
        peerConnectionRef.current.addTrack(track, stream);
      });

      // Set up local audio reference (for muting)
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
        localAudioRef.current.muted = true; // Prevent feedback
      }

      console.log('✅ WebRTC initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize WebRTC:', error);
      toast({
        title: "Audio Error",
        description: "Failed to access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  // Set up signaling channel for WebRTC
  const setupSignalingChannel = () => {
    console.log('📡 Setting up signaling channel for call:', callSession.id);
    
    signalingChannelRef.current = supabase
      .channel(`webrtc_signaling:${callSession.id}`)
      .on('broadcast', { event: 'webrtc_signal' }, (payload) => {
        handleSignalingMessage(payload.payload);
      })
      .subscribe();
  };

  // Send signaling messages
  const sendSignalingMessage = (message) => {
    if (signalingChannelRef.current) {
      signalingChannelRef.current.send({
        type: 'broadcast',
        event: 'webrtc_signal',
        payload: message
      });
    }
  };

  // Handle incoming signaling messages
  const handleSignalingMessage = async (message) => {
    console.log('📨 Received signaling message:', message.type);
    
    if (!peerConnectionRef.current) return;

    try {
      switch (message.type) {
        case 'offer':
          console.log('📥 Handling offer');
          await peerConnectionRef.current.setRemoteDescription(message.offer);
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          sendSignalingMessage({
            type: 'answer',
            answer: answer,
            callId: callSession.id
          });
          break;

        case 'answer':
          console.log('📥 Handling answer');
          await peerConnectionRef.current.setRemoteDescription(message.answer);
          break;

        case 'ice-candidate':
          console.log('📥 Handling ICE candidate');
          await peerConnectionRef.current.addIceCandidate(message.candidate);
          break;
      }
    } catch (error) {
      console.error('❌ Error handling signaling message:', error);
    }
  };

  // Start call (caller)
  const startCall = async () => {
    if (!peerConnectionRef.current) return;
    
    try {
      console.log('📞 Creating offer');
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      
      sendSignalingMessage({
        type: 'offer',
        offer: offer,
        callId: callSession.id
      });
    } catch (error) {
      console.error('❌ Error creating offer:', error);
    }
  };

  // Toggle audio mute
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        console.log('🔊 Audio toggled:', audioTrack.enabled ? 'ON' : 'OFF');
      }
    }
  };

  // Clean up WebRTC connection
  const cleanup = () => {
    console.log('🧹 Cleaning up WebRTC connection');
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    
    if (signalingChannelRef.current) {
      supabase.removeChannel(signalingChannelRef.current);
    }
    
    setConnectionState('closed');
  };

  // Initialize when call session is available
  useEffect(() => {
    if (callSession && user) {
      initializeWebRTC();
      setupSignalingChannel();
      
      // If this is the caller, start the call
      if (!callSession.isIncoming) {
        setTimeout(() => startCall(), 1000); // Small delay to ensure setup
      }
    }

    return cleanup;
  }, [callSession?.id]);

  return {
    localAudioRef,
    remoteAudioRef,
    isAudioEnabled,
    isVideoEnabled,
    connectionState,
    toggleAudio,
    cleanup
  };
};