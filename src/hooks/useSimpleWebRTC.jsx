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
  const isCaller = user?.id === callSession?.caller_id;

  const rtcConfig = {
    iceServers: [
      { urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun.stunprotocol.org:3478'
      ]},
      // Public TURN (OpenRelay by metered.ca) for NAT traversal during testing
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
    iceTransportPolicy: 'all',
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
      console.log('🎧 [WEBRTC] init start', { callId: callSession?.id, isCaller });
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
      console.log('🎙️ [WEBRTC] gotUserMedia', { tracks: stream.getAudioTracks().map(t => ({ id: t.id, enabled: t.enabled, muted: t.muted })) });
      localStreamRef.current = stream;

      // 2) Peer connection
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;
      console.log('🔗 [WEBRTC] RTCPeerConnection created', rtcConfig);

      // Ensure bidirectional audio negotiation
      try {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
        console.log('🔁 [WEBRTC] addTransceiver(audio, sendrecv)');
      } catch (e) {
        console.warn('ℹ️ [WEBRTC] addTransceiver not supported or failed', e);
      }

      // Add local audio
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
        console.log('➕ [WEBRTC] addTrack', { kind: track.kind, id: track.id, enabled: track.enabled });
      });

      // Attach local stream to local audio element (muted) for debugging and to keep audio context warm
      if (localAudioRef.current) {
        try {
          localAudioRef.current.srcObject = stream;
          localAudioRef.current.muted = true;
          localAudioRef.current.volume = 0;
          await localAudioRef.current.play().catch(() => {});
        } catch (e) {
          console.warn('⚠️ [WEBRTC] Failed to attach/play local audio element', e);
        }
      }

      // Robust remote audio handling
      pc.ontrack = (event) => {
        console.log('📥 [WEBRTC] ontrack', { track: { kind: event.track.kind, id: event.track.id, muted: event.track.muted, enabled: event.track.enabled }, streams: event.streams?.length });
        // Some browsers may not include streams; build one from the track as a fallback
        let remoteStream = event.streams && event.streams[0] ? event.streams[0] : null;
        if (!remoteStream && event.track) {
          remoteStream = new MediaStream([event.track]);
        }

        // Track mute/unmute debug
        try {
          event.track.onmute = () => console.log('🔇 [WEBRTC] remote track muted');
          event.track.onunmute = () => console.log('🔊 [WEBRTC] remote track unmuted');
        } catch {}

        if (remoteAudioRef.current && remoteStream) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.muted = false;
          remoteAudioRef.current.volume = 1.0;

          const tryPlay = async () => {
            try {
              await remoteAudioRef.current.play();
              console.log('🔊 [WEBRTC] Remote audio playing');
            } catch (err) {
              console.warn('⚠️ [WEBRTC] Autoplay blocked, waiting for user gesture');
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
        } else {
          console.warn('⚠️ [WEBRTC] ontrack fired but no remote stream available');
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
      if (isCaller) {
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