import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/* ----------  ZERO-GUESS INSTRUMENTATION ---------- */
const LOG = (...args) => console.log('[WEBRTC]', ...args);
const WARN = (...args) => console.warn('[WEBRTC]', ...args);

export const useSimpleWebRTC = (callSession, user) => {
  LOG('Hook entry', { callSession, user });

  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState('new');
  const [iceConnectionState, setIceConnectionState] = useState('new');
  const [signalingState, setSignalingState] = useState('stable');
  const [hasRemoteTrack, setHasRemoteTrack] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  const localAudioRef = useRef();
  const remoteAudioRef = useRef();
  const peerConnectionRef = useRef();
  const localStreamRef = useRef();
  const channelRef = useRef();
  const iceQueueRef = useRef([]);
  const subscribedRef = useRef(false);
  const receivedOfferRef = useRef(false);
  const makingOfferRef = useRef(false);
  const initStartedRef = useRef(false);
  const initBeganRef = useRef(false);
  const clientIdRef = useRef(typeof self !== 'undefined' && self.crypto && self.crypto.randomUUID ? self.crypto.randomUUID() : Math.random().toString(36).slice(2));
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const maxReconnectAttempts = 5;
  const isCaller = user?.id === callSession?.caller_id;
  
  LOG('Refs created', { isCaller });

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
    if (!channelRef.current) { 
      LOG('sendMessage: no channel'); 
      return; 
    }
    LOG('sendMessage', message.type);
    const res = await channelRef.current.send({
      type: 'broadcast',
      event: 'webrtc',
      payload: { ...message, fromClient: clientIdRef.current, userId: user.id, callId: callSession.id }
    });
    LOG('sendMessage result', res);
    if (res !== 'ok') {
      WARN('send ack not ok:', res);
    }
  };

  const init = async () => {
    try {
      LOG('init() entry', { callId: callSession?.id, isCaller });
      initBeganRef.current = true;
      
      // 1) Get microphone
      LOG('Getting user media');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 48000,
        }
      });
      LOG('gotUserMedia', stream.getAudioTracks().map(t => ({ id: t.id, kind: t.kind, enabled: t.enabled, muted: t.muted })));
      localStreamRef.current = stream;

      // 2) Peer connection
      LOG('Creating peer connection');
      const pc = new RTCPeerConnection(rtcConfig);
      peerConnectionRef.current = pc;
      LOG('RTCPeerConnection created');

      // 3) Use implicit transceiver via addTrack only (avoid duplicate m-lines)
      LOG('Using addTrack without explicit transceiver');

      // 4) Add local tracks
      stream.getTracks().forEach(track => {
        LOG('Adding local track', track.kind, track.id);
        pc.addTrack(track, stream);
      });
      LOG('Local tracks added');
      
      // 5) Attach local stream (muted)
      if (localAudioRef.current) {
        try {
          localAudioRef.current.srcObject = stream;
          localAudioRef.current.muted = true;
          localAudioRef.current.volume = 0;
          await localAudioRef.current.play().catch(() => {});
          LOG('Local audio element attached');
        } catch (e) {
          WARN('Failed to attach local audio element', e);
        }
      }

      // 5b) Also attach to global hidden audio element if present
      try {
        const globalLocal = typeof document !== 'undefined' ? document.getElementById('global-local-audio') : null;
        if (globalLocal) {
          globalLocal.srcObject = stream;
          globalLocal.muted = true;
          // @ts-ignore
          globalLocal.volume = 0;
          // @ts-ignore
          globalLocal.play?.().catch(() => {});
          LOG('Local stream attached to global-local-audio');
        }
      } catch (e) {
        WARN('Failed attaching local to global audio', e);
      }

      // 6) ontrack handler
      pc.ontrack = (event) => {
        LOG('ontrack fired', { 
          kind: event.track.kind, 
          trackId: event.track.id, 
          muted: event.track.muted, 
          enabled: event.track.enabled,
          streams: event.streams?.length 
        });
        setHasRemoteTrack(true);
        
        const remoteStream = event.streams?.[0] || new MediaStream([event.track]);
        LOG('Remote stream created', { streamId: remoteStream.id, trackCount: remoteStream.getTracks().length });

        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.muted = false;
          remoteAudioRef.current.volume = 1.0;
          LOG('Remote audio element configured');

          remoteAudioRef.current.play()
            .then(() => LOG('✅ Remote audio playing'))
            .catch(e => {
              WARN('Autoplay blocked, awaiting user gesture:', e.message);
              const once = () => {
                LOG('User gesture detected, playing audio');
                remoteAudioRef.current?.play()
                  .then(() => LOG('✅ Audio playing after gesture'))
                  .catch(err => WARN('Still failed after gesture:', err));
                document.removeEventListener('click', once);
                document.removeEventListener('touchstart', once);
              };
              document.addEventListener('click', once, { once: true });
              document.addEventListener('touchstart', once, { once: true });
            });
        } else {
          WARN('ontrack fired but remoteAudioRef not available');
        }

        // 6b) Also mirror to global hidden remote audio element if present
        try {
          const globalRemote = typeof document !== 'undefined' ? document.getElementById('global-remote-audio') : null;
          if (globalRemote) {
            globalRemote.srcObject = remoteStream;
            // @ts-ignore
            globalRemote.muted = false;
            // @ts-ignore
            globalRemote.volume = 1.0;
            // @ts-ignore
            globalRemote.play?.().catch((e) => WARN('Global remote play blocked:', e?.message || e));
            LOG('Remote stream attached to global-remote-audio');
          }
        } catch (e) {
          WARN('Failed attaching remote to global audio', e);
        }
      };

      // 7) ICE candidate handler
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          LOG('ICE candidate', event.candidate.type);
          sendMessage({ type: 'ice', candidate: event.candidate });
        } else {
          LOG('ICE gathering complete');
        }
      };

      // 8) Connection state handler
      pc.onconnectionstatechange = () => {
        setConnectionState(pc.connectionState);
        LOG('Connection state:', pc.connectionState);
        
        if (pc.connectionState === 'connected') {
          LOG('✅ CONNECTED');
          reconnectAttemptsRef.current = 0;
          setIsReconnecting(false);
          
          if (remoteAudioRef.current?.srcObject) {
            remoteAudioRef.current.play()
              .then(() => LOG('Audio playing on connected'))
              .catch(e => LOG('Play blocked on connected, awaiting gesture'));
          }
        } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
          WARN(`Connection ${pc.connectionState}, attempting reconnection`);
          attemptReconnect();
        }
      };

      // 9) ICE connection state handler
      pc.oniceconnectionstatechange = () => {
        setIceConnectionState(pc.iceConnectionState);
        LOG('ICE connection state:', pc.iceConnectionState);
        
        if (pc.iceConnectionState === 'failed') {
          WARN('ICE failed, attempting reconnection');
          attemptReconnect();
        }
      };

      // 10) Signaling state handler
      pc.onsignalingstatechange = () => {
        setSignalingState(pc.signalingState);
        LOG('Signaling state:', pc.signalingState);
      };

      // 11) Setup signaling channel
      LOG('Setting up signaling channel', callSession.id);
      channelRef.current = supabase
        .channel(`call_${callSession.id}`, { config: { broadcast: { self: true, ack: true } } })
        .on('broadcast', { event: 'webrtc' }, async ({ payload }) => {
          LOG('Received signal', payload.type, 'from', payload.userId);
          if (payload.fromClient === clientIdRef.current) {
            LOG('Ignoring own message');
            return;
          }
          try {
            if (payload.type === 'offer') {
              LOG('Processing offer', { signalingState: pc.signalingState });
              receivedOfferRef.current = true;

              await pc.setRemoteDescription(payload.offer);
              LOG('✅ Remote description set (offer)');
              LOG('Flushing', iceQueueRef.current.length, 'queued ICE candidates');
              for (const c of iceQueueRef.current) {
                try { 
                  await pc.addIceCandidate(c); 
                  LOG('Added queued ICE candidate');
                } catch (e) { 
                  WARN('Failed to add queued ICE', e); 
                }
              }
              iceQueueRef.current = [];

              LOG('Creating answer');
              const answer = await pc.createAnswer();
              LOG('Answer created');
              await pc.setLocalDescription(answer);
              LOG('✅ Local description set (answer)');
              await sendMessage({ type: 'answer', answer });
              LOG('Answer sent');
            } else if (payload.type === 'answer') {
              LOG('Processing answer', { signalingState: pc.signalingState });
              if (pc.signalingState !== 'have-local-offer') {
                WARN('Ignoring unexpected answer in state', pc.signalingState);
                return;
              }
              await pc.setRemoteDescription(payload.answer);
              LOG('✅ Remote description set (answer)');
              makingOfferRef.current = false;
              
              LOG('Flushing', iceQueueRef.current.length, 'queued ICE candidates');
              for (const c of iceQueueRef.current) {
                try { 
                  await pc.addIceCandidate(c); 
                  LOG('Added queued ICE candidate');
                } catch (e) { 
                  WARN('Failed to add queued ICE', e); 
                }
              }
              iceQueueRef.current = [];
            } else if (payload.type === 'ice') {
              if (pc.remoteDescription) {
                await pc.addIceCandidate(payload.candidate);
                LOG('Added ICE candidate');
              } else {
                iceQueueRef.current.push(payload.candidate);
                LOG('Queued ICE candidate (no remote desc yet)');
              }
            }
          } catch (error) {
            WARN('Signaling error:', error);
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
    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      try { peerConnectionRef.current.close(); } catch {}
      peerConnectionRef.current = null;
    }
    if (channelRef.current) {
      try { supabase.removeChannel(channelRef.current); } catch {}
      channelRef.current = null;
    }
    iceQueueRef.current = [];
    subscribedRef.current = false;
    reconnectAttemptsRef.current = 0;
    setHasRemoteTrack(false);
    setIsReconnecting(false);
  };

  const attemptReconnect = async () => {
    if (isReconnecting) {
      console.log('⏳ [WEBRTC] Already reconnecting, skipping');
      return;
    }
    
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('❌ [WEBRTC] Max reconnection attempts reached');
      setIsReconnecting(false);
      return;
    }

    reconnectAttemptsRef.current += 1;
    setIsReconnecting(true);

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 16000);
    console.log(`🔄 [WEBRTC] Reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms`);

    reconnectTimeoutRef.current = setTimeout(async () => {
      const pc = peerConnectionRef.current;
      if (!pc || pc.connectionState === 'closed') {
        console.warn('⚠️ [WEBRTC] Connection closed, cannot reconnect');
        setIsReconnecting(false);
        return;
      }

      try {
        console.log('♻️ [WEBRTC] Attempting ICE restart...');
        await restartICE();
      } catch (error) {
        console.error('❌ [WEBRTC] Reconnection failed:', error);
        // Try again
        attemptReconnect();
      }
    }, delay);
  };

  const restartICE = async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !subscribedRef.current) {
      console.warn('⚠️ [WEBRTC] Cannot restart ICE: no active connection');
      return;
    }

    try {
      console.log('♻️ [WEBRTC] Restarting ICE...');
      pc.restartIce();
      
      // Create new offer with iceRestart
      makingOfferRef.current = true;
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      await sendMessage({ type: 'offer', offer });
      console.log('✅ [WEBRTC] ICE restart offer sent');
    } catch (error) {
      console.error('❌ [WEBRTC] ICE restart failed:', error);
      throw error;
    } finally {
      makingOfferRef.current = false;
    }
  };

  // Explicit starter to avoid missed effects on some routes
  const start = () => {
    const pc = peerConnectionRef.current;
    console.log('🟢 [WEBRTC] start() called', { initStarted: initStartedRef.current, hasCallSession: !!callSession, hasUser: !!user, pcState: pc?.connectionState });
    if (!callSession || !user) return;

    // If we have a lingering, idle PC with no descriptions, force a clean restart
    if (pc && pc.connectionState !== 'closed') {
      const hasNoSDP = !pc.localDescription && !pc.remoteDescription;
      const idleState = pc.connectionState === 'new' || pc.connectionState === 'connecting';
      if (hasNoSDP && idleState) {
        console.warn('♻️ [WEBRTC] Forcing restart: idle PC without SDP');
        cleanup();
      }
    }

    if (initStartedRef.current && peerConnectionRef.current && peerConnectionRef.current.connectionState !== 'closed') {
      console.log('⚠️ [WEBRTC] Init already started with active PC, skipping start()');
      return;
    }

    initStartedRef.current = false; // reset guard if previous PC was closed or missing
    initBeganRef.current = false;
    initStartedRef.current = true;
    init();

    // Watchdog: if init() didn't even log, retry once
    setTimeout(() => {
      if (!initBeganRef.current) {
        console.warn('⏱️ [WEBRTC] init() did not begin, retrying once');
        initStartedRef.current = true;
        init();
      }
    }, 400);
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

    console.log('🟢 [WEBRTC] Conditions met, calling start()');
    start();

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
    iceConnectionState,
    signalingState,
    hasLocalDescription: !!peerConnectionRef.current?.localDescription,
    hasRemoteDescription: !!peerConnectionRef.current?.remoteDescription,
    hasRemoteTrack,
    isReconnecting,
    reconnectAttempts: reconnectAttemptsRef.current,
    toggleAudio,
    cleanup,
    start,
    restartICE
  };
};