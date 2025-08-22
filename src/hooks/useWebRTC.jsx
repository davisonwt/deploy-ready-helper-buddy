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
      console.log('🚀 Initializing WebRTC for call session:', callSession?.id);
      console.log('🚀 Call session details:', {
        id: callSession?.id,
        isIncoming: callSession?.isIncoming,
        status: callSession?.status,
        otherUserId: callSession?.otherUserId
      });
      
      // Create peer connection
      peerConnectionRef.current = new RTCPeerConnection(rtcConfig);
      console.log('📡 Peer connection created with config:', rtcConfig);
      
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
        console.log('🎵 Received remote audio stream:', event.streams[0]);
        const remoteStream = event.streams[0];
        
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.volume = 1.0;
          
          // Ensure audio plays
          remoteAudioRef.current.play().then(() => {
            console.log('✅ Remote audio playing');
          }).catch(error => {
            console.error('❌ Failed to play remote audio:', error);
          });
        }
        
        // Check if tracks are active
        remoteStream.getAudioTracks().forEach(track => {
          console.log('🔊 Remote audio track:', track.id, 'enabled:', track.enabled, 'ready:', track.readyState);
        });
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
          autoGainControl: true,
          sampleRate: 44100
        },
        video: false
      });

      console.log('🎤 Local stream created:', stream.id);
      localStreamRef.current = stream;
      
      // Check local audio tracks
      stream.getAudioTracks().forEach(track => {
        console.log('🎤 Local audio track:', track.id, 'enabled:', track.enabled, 'settings:', track.getSettings());
      });
      
      // Add local audio track to peer connection
      stream.getTracks().forEach(track => {
        console.log('➕ Adding track to peer connection:', track.kind);
        peerConnectionRef.current.addTrack(track, stream);
      });

      // Set up local audio reference (for muting)
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
        localAudioRef.current.muted = true; // Prevent feedback
        localAudioRef.current.volume = 0; // Ensure no feedback
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
    if (!callSession?.id) {
      console.error('❌ No call session ID for signaling channel');
      return;
    }
    
    console.log('📡 Setting up signaling channel for call:', callSession.id);
    
    signalingChannelRef.current = supabase
      .channel(`webrtc_signaling:${callSession.id}`)
      .on('broadcast', { event: 'webrtc_signal' }, (payload) => {
        console.log('📨 Received signaling message via Supabase:', payload);
        handleSignalingMessage(payload.payload);
      })
      .subscribe((status) => {
        console.log('📡 Signaling channel status:', status);
      });
  };

  // Send signaling messages
  const sendSignalingMessage = (message) => {
    console.log('📤 Sending signaling message:', message.type, message);
    if (signalingChannelRef.current) {
      const result = signalingChannelRef.current.send({
        type: 'broadcast',
        event: 'webrtc_signal',
        payload: message
      });
      console.log('📤 Send result:', result);
    } else {
      console.error('❌ No signaling channel available for sending:', message);
    }
  };

  // Handle incoming signaling messages
  const handleSignalingMessage = async (message) => {
    console.log('📨 Received signaling message:', message.type);
    
    if (!peerConnectionRef.current) {
      console.log('❌ No peer connection available');
      return;
    }

    try {
      switch (message.type) {
        case 'offer':
          console.log('📥 Handling offer');
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(message.offer));
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          sendSignalingMessage({
            type: 'answer',
            answer: answer,
            callId: callSession.id,
            fromUser: user.id
          });
          break;

        case 'answer':
          console.log('📥 Handling answer');
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(message.answer));
          break;

        case 'ice-candidate':
          console.log('📥 Handling ICE candidate');
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(message.candidate));
          break;
      }
    } catch (error) {
      console.error('❌ Error handling signaling message:', error);
    }
  };

  // Start call (caller)
  const startCall = async () => {
    if (!peerConnectionRef.current) {
      console.log('❌ No peer connection for starting call');
      return;
    }
    
    try {
      console.log('📞 Creating offer');
      const offer = await peerConnectionRef.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      await peerConnectionRef.current.setLocalDescription(offer);
      
      sendSignalingMessage({
        type: 'offer',
        offer: offer,
        callId: callSession.id,
        fromUser: user.id
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
        
        toast({
          title: audioTrack.enabled ? "Microphone On" : "Microphone Off",
          description: audioTrack.enabled ? "You can now be heard" : "You are muted",
        });
      }
    }
  };

  // Test audio functionality
  const testAudio = () => {
    console.log('🔊 Testing audio setup...');
    
    // Test local audio
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      console.log('🎤 Local audio tracks:', audioTracks.length);
      audioTracks.forEach((track, index) => {
        console.log(`🎤 Track ${index}:`, {
          id: track.id,
          enabled: track.enabled,
          readyState: track.readyState,
          settings: track.getSettings()
        });
      });
    }
    
    // Test remote audio
    if (remoteAudioRef.current) {
      console.log('🔊 Remote audio element:', {
        volume: remoteAudioRef.current.volume,
        muted: remoteAudioRef.current.muted,
        paused: remoteAudioRef.current.paused,
        srcObject: !!remoteAudioRef.current.srcObject,
        readyState: remoteAudioRef.current.readyState
      });
      
      if (remoteAudioRef.current.srcObject) {
        const remoteStream = remoteAudioRef.current.srcObject;
        const remoteTracks = remoteStream.getAudioTracks();
        console.log('🔊 Remote stream tracks:', remoteTracks.length);
        remoteTracks.forEach((track, index) => {
          console.log(`🔊 Remote track ${index}:`, {
            id: track.id,
            enabled: track.enabled,
            readyState: track.readyState
          });
        });
      }
      
      // Try to play
      remoteAudioRef.current.play().catch(e => console.log('Audio play error:', e));
    }
    
    // Test WebRTC connection
    if (peerConnectionRef.current) {
      console.log('📡 WebRTC Connection State:', peerConnectionRef.current.connectionState);
      console.log('📡 ICE Connection State:', peerConnectionRef.current.iceConnectionState);
      console.log('📡 Signaling State:', peerConnectionRef.current.signalingState);
      
      // Check senders (outgoing audio)
      const senders = peerConnectionRef.current.getSenders();
      console.log('📤 Audio senders:', senders.length);
      senders.forEach((sender, index) => {
        if (sender.track) {
          console.log(`📤 Sender ${index}:`, {
            kind: sender.track.kind,
            enabled: sender.track.enabled,
            readyState: sender.track.readyState
          });
        }
      });
      
      // Check receivers (incoming audio)
      const receivers = peerConnectionRef.current.getReceivers();
      console.log('📥 Audio receivers:', receivers.length);
      receivers.forEach((receiver, index) => {
        if (receiver.track) {
          console.log(`📥 Receiver ${index}:`, {
            kind: receiver.track.kind,
            enabled: receiver.track.enabled,
            readyState: receiver.track.readyState
          });
        }
      });
    }
    
    toast({
      title: "Audio Test",
      description: "Check console for detailed audio information",
    });
  };

  // Initialize when call session is available
  useEffect(() => {
    console.log('🎯 WebRTC Effect triggered:', {
      hasCallSession: !!callSession,
      callSessionId: callSession?.id,
      hasUser: !!user,
      userId: user?.id,
      callSessionObject: callSession
    });
    
    if (callSession && user) {
      console.log('🎯 Starting WebRTC initialization for call:', callSession.id);
      initializeWebRTC();
      setupSignalingChannel();
      
      // If this is the caller, start the call after a delay
      if (!callSession.isIncoming) {
        console.log('📞 This is an outgoing call, will create offer in 2 seconds');
        const timer = setTimeout(() => {
          console.log('📞 Starting call as caller');
          startCall();
        }, 2000);
        
        return () => {
          console.log('🧹 Clearing call start timer');
          clearTimeout(timer);
        };
      } else {
        console.log('📞 This is an incoming call, waiting for offer');
      }
    } else {
      console.log('❌ Missing requirements for WebRTC:', {
        hasCallSession: !!callSession,
        hasUser: !!user
      });
    }

    // Don't cleanup on every effect run, only when component unmounts
  }, [callSession?.id, user?.id]);

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

  
  // Cleanup effect - separate from initialization
  useEffect(() => {
    return () => {
      console.log('🧹 Component unmounting, cleaning up WebRTC');
      cleanup();
    };
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