import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useSimpleWebRTC = (callSession, user) => {
  console.log('🚀 [WEBRTC] Hook called', { 
    hasCallSession: !!callSession, 
    callId: callSession?.id,
    hasUser: !!user,
    userId: user?.id 
  });

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState('new');
  
  const localAudioRef = useRef();
  const remoteAudioRef = useRef();
  const peerConnectionRef = useRef();
  const localStreamRef = useRef();
  const channelRef = useRef();
  const iceQueueRef = useRef([]); // Queue ICE candidates until remoteDescription is set
  const subscribedRef = useRef(false);
  const receivedOfferRef = useRef(false);
  const makingOfferRef = useRef(false);
  const initStartedRef = useRef(false); // Prevent duplicate init
  const isCaller = user?.id === callSession?.caller_id;
  
  console.log('🚀 [WEBRTC] Role determined', { isCaller, userId: user?.id, callerId: callSession?.caller_id });

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

      // -------------------------------------------------
      // Callee MUST add recv-only audio transceiver
      // otherwise ontrack never fires → no remote audio
      // -------------------------------------------------
      if (!isCaller) {
        try {
          const hasAudioRecv = pc.getTransceivers().some(
            tr => tr.receiver && tr.receiver.track && tr.receiver.track.kind === 'audio'
          );
          if (!hasAudioRecv) {
            pc.addTransceiver('audio', { direction: 'recvonly' });
            console.log('🔁 [WEBRTC] Added recv-only audio transceiver (callee)');
          }
        } catch (e) {
          console.warn('⚠️ [WEBRTC] addTransceiver failed', e);
        }
      }

      console.log('🔗 [WEBRTC] RTCPeerConnection created', rtcConfig);

      // -------------------------------------------------
      // Callee MUST add recv-only audio transceiver
      // otherwise ontrack never fires → no remote audio
      // -------------------------------------------------
      console.log('🔧 [WEBRTC] Before transceiver setup', { 
        isCaller, 
        transceivers: pc.getTransceivers().length 
      });
      
      if (!isCaller) {
        try {
          const hasAudioRecv = pc.getTransceivers().some(
            tr => tr.receiver && tr.receiver.track && tr.receiver.track.kind === 'audio'
          );
          if (!hasAudioRecv) {
            const transceiver = pc.addTransceiver('audio', { direction: 'recvonly' });
            console.log('🔁 [WEBRTC] Added recv-only audio transceiver (callee)', {
              direction: transceiver.direction,
              mid: transceiver.mid
            });
          } else {
            console.log('⚠️ [WEBRTC] Audio recv transceiver already exists');
          }
        } catch (e) {
          console.warn('⚠️ [WEBRTC] addTransceiver failed', e);
        }
      }

      console.log('🔧 [WEBRTC] After recv-only, before addTrack', { 
        transceivers: pc.getTransceivers().map(t => ({ 
          direction: t.direction, 
          kind: t.receiver?.track?.kind || t.mid 
        }))
      });

      // Add local audio
      stream.getTracks().forEach(track => {
        const sender = pc.addTrack(track, stream);
        console.log('➕ [WEBRTC] addTrack', { 
          kind: track.kind, 
          id: track.id, 
          enabled: track.enabled,
          senderTrack: sender.track?.id
        });
      });

      console.log('🔧 [WEBRTC] After addTrack', { 
        transceivers: pc.getTransceivers().map(t => ({ 
          direction: t.direction, 
          kind: t.receiver?.track?.kind || 'pending',
          mid: t.mid
        }))
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
          console.log('🔊 [WEBRTC] Setting remote stream', { streamId: remoteStream.id, tracks: remoteStream.getTracks().length });
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.muted = false;
          remoteAudioRef.current.volume = 1.0;

          // iOS requires play() to be called AFTER srcObject is set AND needs user gesture
          const tryPlay = async () => {
            try {
              // Small delay for iOS to register srcObject
              await new Promise(resolve => setTimeout(resolve, 100));
              await remoteAudioRef.current.play();
              console.log('✅ [WEBRTC] Remote audio playing');
            } catch (err) {
              console.warn('⚠️ [WEBRTC] Autoplay blocked (likely iOS), need user gesture:', err.message);
              // Multiple event types for better iOS coverage
              const once = async () => {
                console.log('👆 [WEBRTC] User gesture detected, retrying play');
                try {
                  await remoteAudioRef.current?.play();
                  console.log('✅ [WEBRTC] Remote audio playing after gesture');
                } catch (e) {
                  console.error('❌ [WEBRTC] Still failed after gesture:', e);
                }
                document.removeEventListener('click', once);
                document.removeEventListener('touchstart', once);
                document.removeEventListener('touchend', once);
                document.removeEventListener('keydown', once);
              };
              document.addEventListener('click', once, { once: true });
              document.addEventListener('touchstart', once, { once: true });
              document.addEventListener('touchend', once, { once: true });
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
          console.log('🧊 [WEBRTC] ICE candidate', { type: event.candidate.type, protocol: event.candidate.protocol });
          sendMessage({ type: 'ice', candidate: event.candidate });
        } else {
          console.log('🧊 [WEBRTC] ICE gathering complete');
        }
      };

      pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState);
        console.log('📡 [WEBRTC] Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected' || pc.connectionState === 'completed') {
          console.log('✅ [WEBRTC] Connected! Ensuring audio plays...');
          const el = remoteAudioRef.current;
          if (el && el.srcObject) {
            // Try immediate play
            const tryPlay = async () => {
              try {
                await el.play();
                console.log('✅ [WEBRTC] Audio playing on connect');
              } catch (e) {
                console.warn('⚠️ [WEBRTC] Play blocked on connect, awaiting gesture');
              }
            };
            tryPlay();
            // Setup gesture listeners as backup
            const once = async () => {
              try {
                await el.play();
                console.log('✅ [WEBRTC] Audio playing after connect gesture');
              } catch (e) {}
              document.removeEventListener('touchstart', once);
              document.removeEventListener('touchend', once);
              document.removeEventListener('click', once);
              document.removeEventListener('keydown', once);
            };
            document.addEventListener('touchstart', once, { once: true });
            document.addEventListener('touchend', once, { once: true });
            document.addEventListener('click', once, { once: true });
            document.addEventListener('keydown', once, { once: true });
          } else {
            console.warn('⚠️ [WEBRTC] Connected but no audio element or stream');
          }
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('🧊 [WEBRTC] ICE connection state:', pc.iceConnectionState);
      };

      pc.onsignalingstatechange = () => {
        console.log('📶 [WEBRTC] Signaling state:', pc.signalingState);
      };

      // 3) Signaling channel
      channelRef.current = supabase
        .channel(`call_${callSession.id}`, { config: { broadcast: { self: true, ack: true } } })
        .on('broadcast', { event: 'webrtc' }, async ({ payload }) => {
          console.log('📨 [WEBRTC] Received signal', { type: payload.type, from: payload.from, isCaller });
          if (payload.from === user.id) return;
          try {
            if (payload.type === 'offer') {
              receivedOfferRef.current = true;
              console.log('📥 [WEBRTC] Processing offer', { currentSignalingState: pc.signalingState, makingOffer: makingOfferRef.current });

              // Perfect negotiation: handle offer collisions
              const polite = !isCaller; // Callee is polite
              const offerCollision = makingOfferRef.current || pc.signalingState !== 'stable';
              if (offerCollision) {
                if (!polite) {
                  console.log('🙈 [WEBRTC] Ignoring offer in collision (impolite peer)');
                  return;
                }
                try {
                  await Promise.all([
                    pc.setLocalDescription({ type: 'rollback' }),
                    pc.setRemoteDescription(payload.offer)
                  ]);
                } catch (e) {
                  console.warn('⚠️ [WEBRTC] Rollback/remote set failed during collision', e);
                  return;
                }
              } else {
              await pc.setRemoteDescription(payload.offer);
              }
              console.log('✅ [WEBRTC] Remote description set (offer)', {
                transceivers: pc.getTransceivers().map(t => ({
                  direction: t.direction,
                  kind: t.receiver?.track?.kind || 'pending',
                  mid: t.mid,
                  hasTrack: !!t.receiver?.track
                }))
              });
              // Flush queued ICE candidates
              for (const c of iceQueueRef.current) {
                try { await pc.addIceCandidate(c); } catch (e) { console.warn('ICE add (queued) failed', e); }
              }
              iceQueueRef.current = [];

              const answer = await pc.createAnswer();
              console.log('📤 [WEBRTC] Created answer', {
                hasAudio: answer.sdp.includes('m=audio'),
                transceivers: pc.getTransceivers().map(t => ({
                  direction: t.direction,
                  mid: t.mid
                }))
              });
              await pc.setLocalDescription(answer);
              console.log('✅ [WEBRTC] Local description set (answer)');
              await sendMessage({ type: 'answer', answer });
            } else if (payload.type === 'answer') {
              console.log('📥 [WEBRTC] Processing answer', { currentSignalingState: pc.signalingState });
              if (pc.signalingState !== 'have-local-offer') {
                console.warn('⚠️ [WEBRTC] Ignoring unexpected answer in state', pc.signalingState);
                return;
              }
              await pc.setRemoteDescription(payload.answer);
              makingOfferRef.current = false;
              console.log('✅ [WEBRTC] Remote description set (answer)', {
                transceivers: pc.getTransceivers().map(t => ({
                  direction: t.direction,
                  kind: t.receiver?.track?.kind || 'pending',
                  mid: t.mid,
                  hasTrack: !!t.receiver?.track
                }))
              });
              for (const c of iceQueueRef.current) {
                try { await pc.addIceCandidate(c); } catch (e) { console.warn('ICE add (queued) failed', e); }
              }
              iceQueueRef.current = [];
            } else if (payload.type === 'ice') {
              if (pc.remoteDescription) {
                await pc.addIceCandidate(payload.candidate);
                console.log('🧊 [WEBRTC] Added ICE candidate');
              } else {
                iceQueueRef.current.push(payload.candidate);
                console.log('🧊 [WEBRTC] Queued ICE candidate (no remote desc yet)');
              }
            }
          } catch (error) {
            console.error('❌ [WEBRTC] Signaling error:', error);
          }
        });

      await new Promise((resolve) => {
        channelRef.current.subscribe((status) => {
          console.log('🔌 [WEBRTC] Channel subscription status:', status);
          if (status === 'SUBSCRIBED') { subscribedRef.current = true; resolve(true); }
        });
      });

      // 4) If we are the caller, create and send an offer after ensuring subscription
      if (isCaller) {
        console.log('📤 [WEBRTC] I am the caller, creating offer...');
        try {
          makingOfferRef.current = true;
          const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
          await pc.setLocalDescription(offer);
          console.log('✅ [WEBRTC] Local description set (offer), sending...', {
            hasAudio: offer.sdp.includes('m=audio'),
            transceivers: pc.getTransceivers().map(t => ({
              direction: t.direction,
              mid: t.mid
            }))
          });
          await sendMessage({ type: 'offer', offer });
          console.log('📤 [WEBRTC] Offer sent');
        } finally {
          makingOfferRef.current = false;
        }
      } else {
        console.log('⏳ [WEBRTC] I am the receiver, waiting for offer...');
        // Fallback: if no offer arrives within 2s, proactively create one (perfect-negotiation-lite)
        setTimeout(async () => {
          if (!receivedOfferRef.current && pc.signalingState === 'stable') {
            try {
              console.log('⏰ [WEBRTC] No offer received, creating fallback offer as receiver');
              makingOfferRef.current = true;
              const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
              await pc.setLocalDescription(offer);
              await sendMessage({ type: 'offer', offer });
              console.log('📤 [WEBRTC] Fallback offer sent by receiver');
            } catch (e) {
              console.warn('⚠️ [WEBRTC] Fallback offer failed', e);
            } finally {
              makingOfferRef.current = false;
            }
          }
        }, 2000);
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

  // Explicit starter to avoid missed effects on some routes
  const start = () => {
    console.log('🟢 [WEBRTC] start() called', { initStarted: initStartedRef.current, hasCallSession: !!callSession, hasUser: !!user });
    if (!callSession || !user) return;
    if (initStartedRef.current) {
      console.log('⚠️ [WEBRTC] Init already started, skipping start()');
      return;
    }
    initStartedRef.current = true;
    init();
  };

  useEffect(() => {
    console.log('🔵 [WEBRTC] useEffect triggered', { 
      hasCallSession: !!callSession, 
      callSessionId: callSession?.id,
      hasUser: !!user, 
      userId: user?.id,
      isCaller,
      initStarted: initStartedRef.current
    });
    
    if (!callSession || !user) {
      console.log('🔴 [WEBRTC] Missing required data', {
        missingCallSession: !callSession,
        missingUser: !user
      });
      return;
    }

    // Prevent duplicate initialization
    if (initStartedRef.current) {
      console.log('⚠️ [WEBRTC] Init already started, skipping');
      return;
    }

    console.log('🟢 [WEBRTC] Conditions met, calling init()');
    initStartedRef.current = true;
    init();

    return () => {
      console.log('🧹 [WEBRTC] Cleanup on unmount');
      initStartedRef.current = false;
      cleanup();
    };
  }, [callSession?.id, user?.id]);

  return {
    localAudioRef,
    remoteAudioRef,
    isAudioEnabled,
    connectionState,
    toggleAudio,
    cleanup,
    start
  };
};