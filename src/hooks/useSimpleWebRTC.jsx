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
  const iceQueueRef = useRef([]); // Queue ICE candidates until remoteDescription is set
  const subscribedRef = useRef(false);

  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.stunprotocol.org:3478' }
    ],
    iceCandidatePoolSize: 10,
  };

  const sendMessage = async (message) => {
    if (!channelRef.current) return;
    const res = await channelRef.current.send({
      type: 'broadcast',
      event: 'webrtc',
      payload: { ...message, from: user.id, callId: callSession.id }
    });
    if (res !== 'ok') {
      console.warn('⚠️ [WEBRTC] send ack not ok:', res);
    }
  };

  const init = async () => {
    try {
      // 1) Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
        }
      });
      localStreamRef.current = stream;

      // 2) Peer connection
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;

      // Add local audio
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Robust remote audio handling
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (remoteAudioRef.current && remoteStream) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.muted = false;
          remoteAudioRef.current.volume = 1.0;
          const tryPlay = async () => {
            try { await remoteAudioRef.current.play(); }
            catch (err) {
              console.warn('⚠️ [WEBRTC] Autoplay blocked, waiting for user gesture');
              const once = () => {
                remoteAudioRef.current?.play().catch(() => {});
                document.removeEventListener('click', once);
                document.removeEventListener('touchstart', once);
              };
              document.addEventListener('click', once, { once: true });
              document.addEventListener('touchstart', once, { once: true });
            }
          };
          tryPlay();
        }
      };

      // ICE handling
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendMessage({ type: 'ice', candidate: event.candidate });
        }
      };

      pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState);
        console.log('📡 [WEBRTC] Connection state:', pc.connectionState);
      };

      // 3) Signaling channel
      channelRef.current = supabase
        .channel(`call_${callSession.id}`, { config: { broadcast: { self: true, ack: true } } })
        .on('broadcast', { event: 'webrtc' }, async ({ payload }) => {
          if (payload.from === user.id) return;
          try {
            if (payload.type === 'offer') {
              await pc.setRemoteDescription(payload.offer);
              // Flush queued ICE candidates
              for (const c of iceQueueRef.current) {
                try { await pc.addIceCandidate(c); } catch (e) { console.warn('ICE add (queued) failed', e); }
              }
              iceQueueRef.current = [];

              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await sendMessage({ type: 'answer', answer });
            } else if (payload.type === 'answer') {
              await pc.setRemoteDescription(payload.answer);
              for (const c of iceQueueRef.current) {
                try { await pc.addIceCandidate(c); } catch (e) { console.warn('ICE add (queued) failed', e); }
              }
              iceQueueRef.current = [];
            } else if (payload.type === 'ice') {
              if (pc.remoteDescription) {
                await pc.addIceCandidate(payload.candidate);
              } else {
                iceQueueRef.current.push(payload.candidate);
              }
            }
          } catch (error) {
            console.error('Signaling error:', error);
          }
        });

      await new Promise((resolve) => {
        channelRef.current.subscribe((status) => {
          if (status === 'SUBSCRIBED') { subscribedRef.current = true; resolve(true); }
        });
      });

      // 4) If we are the caller, create and send an offer after ensuring subscription
      if (!callSession.isIncoming) {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
        await pc.setLocalDescription(offer);
        await sendMessage({ type: 'offer', offer });
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
    iceQueueRef.current = [];
    subscribedRef.current = false;
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