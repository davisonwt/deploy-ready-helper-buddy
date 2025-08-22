import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSimpleWebRTC = (callSession, user) => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState('new');
  
  const localAudioRef = useRef();
  const remoteAudioRef = useRef();
  const peerConnectionRef = useRef();
  const localStreamRef = useRef();
  const channelRef = useRef();

  const rtcConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };

  const sendMessage = (message) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'webrtc',
        payload: { ...message, from: user.id, callId: callSession.id }
      });
    }
  };

  const init = async () => {
    try {
      // Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      
      // Create peer connection
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;
      
      // Add local audio
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      
      // Handle remote audio
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteAudioRef.current && remoteStream) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.volume = 1;
          remoteAudioRef.current.muted = false;
          remoteAudioRef.current.play();
        }
      };
      
      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendMessage({ type: 'ice', candidate: event.candidate });
        }
      };
      
      // Connection state
      pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState);
      };
      
      // Set up signaling
      channelRef.current = supabase
        .channel(`call_${callSession.id}`)
        .on('broadcast', { event: 'webrtc' }, async ({ payload }) => {
          if (payload.from === user.id) return;
          
          try {
            if (payload.type === 'offer') {
              await pc.setRemoteDescription(payload.offer);
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              sendMessage({ type: 'answer', answer });
            } else if (payload.type === 'answer') {
              await pc.setRemoteDescription(payload.answer);
            } else if (payload.type === 'ice') {
              await pc.addIceCandidate(payload.candidate);
            }
          } catch (error) {
            console.error('Signaling error:', error);
          }
        })
        .subscribe();
      
      // Start call if outgoing
      if (!callSession.isIncoming) {
        setTimeout(async () => {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendMessage({ type: 'offer', offer });
        }, 1000);
      }
      
    } catch (error) {
      console.error('WebRTC init error:', error);
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsAudioEnabled(track.enabled);
      }
    }
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
  };

  useEffect(() => {
    if (callSession && user) {
      init();
    }
    return cleanup;
  }, [callSession?.id, user?.id]);

  return {
    localAudioRef,
    remoteAudioRef,
    isAudioEnabled,
    connectionState,
    toggleAudio,
    cleanup
  };
};