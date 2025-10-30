import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export const useAdvancedWebRTC = (callSession, user, callType = 'audio') => {
  // State management
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionState, setConnectionState] = useState('new');
  const [iceCandidatesQueue, setIceCandidatesQueue] = useState([]);
  const [callStatus, setCallStatus] = useState('connecting'); // connecting, connected, disconnected, failed
  const [participants, setParticipants] = useState(new Map());
  
  // Refs for DOM elements and WebRTC objects
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const localAudioRef = useRef();
  const remoteAudioRef = useRef();
  const peerConnectionRef = useRef();
  const localStreamRef = useRef();
  const screenStreamRef = useRef();
  const signalingChannelRef = useRef();
  const iceCandidatesRef = useRef([]);
  
  const { toast } = useToast();

  // Enhanced WebRTC configuration
  const rtcConfig = {
    iceServers: [
      { urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun4.l.google.com:19302',
        'stun:stun.stunprotocol.org:3478'
      ]},
      { urls: ['stun:openrelay.metered.ca:80'] },
      {
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:443?transport=tcp'
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  };

  // Get user media with constraints based on call type
  const getUserMedia = useCallback(async (video = false) => {
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1
      },
      video: video ? {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
        facingMode: 'user'
      } : false
    };

    try {
      console.log('🎥 [WEBRTC] Requesting user media with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('✅ [WEBRTC] Got user media stream:', stream.getTracks().map(t => `${t.kind}: ${t.label}`));
      return stream;
    } catch (error) {
      console.error('❌ [WEBRTC] Failed to get user media:', error);
      throw error;
    }
  }, []);

  // Get screen share stream
  const getScreenShare = useCallback(async () => {
    try {
      console.log('🖥️ [WEBRTC] Requesting screen share');
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        },
        audio: true
      });
      console.log('✅ [WEBRTC] Got screen share stream');
      return stream;
    } catch (error) {
      console.error('❌ [WEBRTC] Failed to get screen share:', error);
      throw error;
    }
  }, []);

  // Initialize WebRTC peer connection
  const initializePeerConnection = useCallback(() => {
    console.log('📡 [WEBRTC] Initializing peer connection');
    
    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;

    // Ensure bidirectional negotiation for audio (and video when applicable)
    try {
      pc.addTransceiver('audio', { direction: 'sendrecv' });
      if (callType === 'video') {
        pc.addTransceiver('video', { direction: 'sendrecv' });
      }
    } catch (e) {
      console.warn('ℹ️ [WEBRTC] addTransceiver not supported or failed', e);
    }

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('📡 [WEBRTC] Connection state changed:', state);
      setConnectionState(state);
      setCallStatus(state === 'connected' ? 'connected' : 
                   state === 'failed' || state === 'disconnected' ? 'disconnected' : 
                   'connecting');
      
      if (state === 'connected') {
        toast({
          title: "Connected",
          description: `${callType === 'video' ? 'Video' : 'Audio'} call connected!`,
        });
      } else if (state === 'failed' || state === 'disconnected') {
        toast({
          title: "Call Ended",
          description: "The call has been disconnected",
          variant: "destructive",
        });
      }
    };

    // ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log('🧊 [WEBRTC] ICE connection state:', pc.iceConnectionState);
    };

    // Handle remote streams
    pc.ontrack = (event) => {
      console.log('🎵 [WEBRTC] Received remote track:', event.track.kind, event.track.id);

      // Build a MediaStream if event.streams is empty (Safari/Firefox cases)
      let remoteStream = event.streams && event.streams[0] ? event.streams[0] : null;
      if (!remoteStream && event.track) {
        remoteStream = new MediaStream([event.track]);
      }

      if (event.track.kind === 'video') {
        if (remoteVideoRef.current && remoteStream) {
          console.log('📺 [WEBRTC] Setting remote video stream');
          remoteVideoRef.current.srcObject = remoteStream;
        }
      } else if (event.track.kind === 'audio') {
        if (remoteAudioRef.current && remoteStream) {
          console.log('🔊 [WEBRTC] Setting remote audio stream');
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.muted = false;
          remoteAudioRef.current.volume = 1.0;
          const tryPlay = async () => {
            try {
              await remoteAudioRef.current.play();
              console.log('🔈 [WEBRTC] Remote audio playing');
            } catch (error) {
              console.warn('⚠️ [WEBRTC] Autoplay blocked, waiting for user gesture', error);
              const once = () => {
                remoteAudioRef.current?.play().catch(() => {});
                document.removeEventListener('click', once);
                document.removeEventListener('touchstart', once);
                document.removeEventListener('keydown', once);
              };
              document.addEventListener('click', once, { once: true });
              document.addEventListener('touchstart', once, { once: true });
              document.addEventListener('keydown', once, { once: true });
            }
          };
          tryPlay();
        }
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('🧊 [WEBRTC] Sending ICE candidate');
        const init = typeof event.candidate.toJSON === 'function'
          ? event.candidate.toJSON()
          : {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              usernameFragment: event.candidate.usernameFragment
            };
        sendSignalingMessage({
          type: 'ice-candidate',
          candidate: init,
          callId: callSession.id,
          from: user.id
        });
      } else {
        console.log('🧊 [WEBRTC] ICE gathering completed');
      }
    };

    return pc;
  }, [callSession?.id, user?.id, callType, toast]);

  // Set up signaling channel
  const setupSignalingChannel = useCallback(() => {
    if (!callSession?.id) return;
    
    console.log('📡 [SIGNAL] Setting up signaling channel for call:', callSession.id);
    
    const channel = supabase
      .channel(`webrtc_call_${callSession.id}`, {
        config: {
          broadcast: { self: false, ack: true }
        }
      })
      .on('broadcast', { event: 'webrtc_signal' }, (payload) => {
        console.log('📨 [SIGNAL] Received signal:', payload.payload.type);
        handleSignalingMessage(payload.payload);
      })
      .on('broadcast', { event: 'call_status' }, (payload) => {
        console.log('📞 [SIGNAL] Call status update:', payload.payload);
        handleCallStatusUpdate(payload.payload);
      })
      .subscribe((status) => {
        console.log('📡 [SIGNAL] Channel subscription status:', status);
      });

    signalingChannelRef.current = channel;
    return channel;
  }, [callSession?.id]);

  // Send signaling messages
  const sendSignalingMessage = useCallback((message) => {
    console.log('📤 [SIGNAL] Sending message:', message.type);
    if (signalingChannelRef.current) {
      signalingChannelRef.current.send({
        type: 'broadcast',
        event: 'webrtc_signal',
        payload: message
      });
    }
  }, []);

  // Handle incoming signaling messages
  const handleSignalingMessage = useCallback(async (message) => {
    const pc = peerConnectionRef.current;
    if (!pc || message.from === user.id) return;

    try {
      switch (message.type) {
        case 'offer':
          console.log('📥 [SIGNAL] Processing offer');
          await pc.setRemoteDescription(new RTCSessionDescription(message.offer));
          
          // Process queued ICE candidates
          for (const candidate of iceCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          iceCandidatesRef.current = [];
          
          // Create and send answer
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          sendSignalingMessage({
            type: 'answer',
            answer: answer,
            callId: callSession.id,
            from: user.id
          });
          break;

        case 'answer':
          console.log('📥 [SIGNAL] Processing answer');
          await pc.setRemoteDescription(new RTCSessionDescription(message.answer));
          
          // Process queued ICE candidates
          for (const candidate of iceCandidatesRef.current) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
          iceCandidatesRef.current = [];
          break;

        case 'ice-candidate':
          console.log('📥 [SIGNAL] Processing ICE candidate');
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
          } else {
            // Queue candidate for later
            iceCandidatesRef.current.push(message.candidate);
          }
          break;

        case 'track-replaced':
          console.log('📥 [SIGNAL] Track replaced (screen share toggle)');
          // Handle track replacement for screen sharing
          break;
      }
    } catch (error) {
      console.error('❌ [SIGNAL] Error handling signaling message:', error);
      toast({
        title: "Connection Error",
        description: "Failed to process signaling message",
        variant: "destructive",
      });
    }
  }, [user?.id, callSession?.id, sendSignalingMessage, toast]);

  // Handle call status updates
  const handleCallStatusUpdate = useCallback((statusUpdate) => {
    console.log('📞 [STATUS] Call status update:', statusUpdate);
    // Handle participant joins/leaves, mute status, etc.
  }, []);

  // Start the call (create offer)
  const startCall = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    
    try {
      console.log('📞 [WEBRTC] Creating offer for', callType, 'call');
      
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video'
      });
      
      await pc.setLocalDescription(offer);
      
      sendSignalingMessage({
        type: 'offer',
        offer: offer,
        callId: callSession.id,
        from: user.id,
        callType: callType
      });
      
    } catch (error) {
      console.error('❌ [WEBRTC] Error creating offer:', error);
      toast({
        title: "Call Error",
        description: "Failed to start call",
        variant: "destructive",
      });
    }
  }, [callType, callSession?.id, user?.id, sendSignalingMessage, toast]);

  // Add local stream to peer connection
  const addLocalStream = useCallback(async (stream) => {
    const pc = peerConnectionRef.current;
    if (!pc || !stream) return;

    console.log('➕ [WEBRTC] Adding local stream tracks');
    
    // Remove existing tracks first
    pc.getSenders().forEach(sender => {
      if (sender.track) {
        pc.removeTrack(sender);
      }
    });

    // Add new tracks
    stream.getTracks().forEach(track => {
      console.log('➕ [WEBRTC] Adding track:', track.kind, track.label);
      pc.addTrack(track, stream);
    });

    localStreamRef.current = stream;

    // Set local video if available
    if (localVideoRef.current && stream.getVideoTracks().length > 0) {
      localVideoRef.current.srcObject = stream;
    }

    // Set local audio if available
    if (localAudioRef.current && stream.getAudioTracks().length > 0) {
      localAudioRef.current.srcObject = stream;
      localAudioRef.current.muted = true; // Prevent echo
      localAudioRef.current.volume = 0;
      try { await localAudioRef.current.play(); } catch (_) {}
    }
  }, []);

  // Initialize call
  const initializeCall = useCallback(async () => {
    try {
      console.log('🚀 [WEBRTC] Initializing call:', callType);
      
      // Initialize peer connection
      initializePeerConnection();
      
      // Set up signaling
      setupSignalingChannel();
      
      // Get user media
      const stream = await getUserMedia(callType === 'video');
      await addLocalStream(stream);
      
      // Start call if outgoing
      if (callSession && !callSession.isIncoming) {
        setTimeout(() => {
          console.log('📞 [WEBRTC] Starting as caller');
          startCall();
        }, 1000);
      }
      
    } catch (error) {
      console.error('❌ [WEBRTC] Failed to initialize call:', error);
      toast({
        title: "Call Error",
        description: "Failed to initialize call. Please check your camera/microphone permissions.",
        variant: "destructive",
      });
    }
  }, [callType, callSession, getUserMedia, addLocalStream, initializePeerConnection, setupSignalingChannel, startCall, toast]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
        
        // Broadcast status change
        sendSignalingMessage({
          type: 'track-status',
          trackType: 'audio',
          enabled: audioTrack.enabled,
          callId: callSession.id,
          from: user.id
        });
        
        toast({
          title: audioTrack.enabled ? "Microphone On" : "Microphone Off",
          description: audioTrack.enabled ? "You can now be heard" : "You are muted",
        });
      }
    }
  }, [callSession?.id, user?.id, sendSignalingMessage, toast]);

  // Toggle video
  const toggleVideo = useCallback(async () => {
    try {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      if (isVideoEnabled) {
        // Disable video
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = false;
          setIsVideoEnabled(false);
        }
      } else {
        // Enable video
        const stream = await getUserMedia(true);
        const videoTrack = stream.getVideoTracks()[0];
        
        if (videoTrack) {
          // Replace video track
          const sender = pc.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          
          if (sender) {
            await sender.replaceTrack(videoTrack);
          } else {
            pc.addTrack(videoTrack, stream);
          }
          
          // Update local video
          if (localVideoRef.current) {
            const newStream = new MediaStream();
            newStream.addTrack(videoTrack);
            if (localStreamRef.current) {
              localStreamRef.current.getAudioTracks().forEach(track => {
                newStream.addTrack(track);
              });
            }
            localVideoRef.current.srcObject = newStream;
            localStreamRef.current = newStream;
          }
          
          setIsVideoEnabled(true);
        }
      }
      
      // Broadcast status change
      sendSignalingMessage({
        type: 'track-status',
        trackType: 'video',
        enabled: isVideoEnabled,
        callId: callSession.id,
        from: user.id
      });
      
    } catch (error) {
      console.error('❌ [WEBRTC] Error toggling video:', error);
      toast({
        title: "Video Error",
        description: "Failed to toggle video",
        variant: "destructive",
      });
    }
  }, [isVideoEnabled, getUserMedia, callSession?.id, user?.id, sendSignalingMessage, toast]);

  // Toggle screen sharing
  const toggleScreenShare = useCallback(async () => {
    try {
      const pc = peerConnectionRef.current;
      if (!pc) return;

      if (isScreenSharing) {
        // Stop screen sharing, return to camera
        const stream = await getUserMedia(true);
        const videoTrack = stream.getVideoTracks()[0];
        
        const sender = pc.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }
        
        setIsScreenSharing(false);
        screenStreamRef.current?.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
        
      } else {
        // Start screen sharing
        const screenStream = await getScreenShare();
        const videoTrack = screenStream.getVideoTracks()[0];
        
        const sender = pc.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        
        if (sender && videoTrack) {
          await sender.replaceTrack(videoTrack);
        }
        
        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);
        
        // Handle screen share ending
        videoTrack.onended = () => {
          setIsScreenSharing(false);
          toggleScreenShare(); // Switch back to camera
        };
      }
      
      // Broadcast track replacement
      sendSignalingMessage({
        type: 'track-replaced',
        trackType: 'video',
        isScreenShare: !isScreenSharing,
        callId: callSession.id,
        from: user.id
      });
      
    } catch (error) {
      console.error('❌ [WEBRTC] Error toggling screen share:', error);
      toast({
        title: "Screen Share Error",
        description: "Failed to toggle screen sharing",
        variant: "destructive",
      });
    }
  }, [isScreenSharing, getUserMedia, getScreenShare, callSession?.id, user?.id, sendSignalingMessage, toast]);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('🧹 [WEBRTC] Cleaning up');
    
    // Stop all tracks
    localStreamRef.current?.getTracks().forEach(track => {
      track.stop();
      console.log('🛑 [WEBRTC] Stopped track:', track.kind);
    });
    
    screenStreamRef.current?.getTracks().forEach(track => {
      track.stop();
      console.log('🛑 [WEBRTC] Stopped screen share track:', track.kind);
    });
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Remove signaling channel
    if (signalingChannelRef.current) {
      supabase.removeChannel(signalingChannelRef.current);
      signalingChannelRef.current = null;
    }
    
    // Reset state
    setConnectionState('new');
    setCallStatus('disconnected');
    setIsAudioEnabled(true);
    setIsVideoEnabled(callType === 'video');
    setIsScreenSharing(false);
  }, [callType]);

  // Initialize when call session is ready
  useEffect(() => {
    if (callSession && user) {
      console.log('🎯 [WEBRTC] Initializing WebRTC for call:', callSession.id);
      initializeCall();
    }

    return cleanup;
  }, [callSession?.id, user?.id, initializeCall, cleanup]);

  return {
    // Refs for video/audio elements
    localVideoRef,
    remoteVideoRef,
    localAudioRef,
    remoteAudioRef,
    
    // State
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    connectionState,
    callStatus,
    participants,
    
    // Actions
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    cleanup,
    
    // Streams
    localStream: localStreamRef.current,
    screenStream: screenStreamRef.current
  };
};