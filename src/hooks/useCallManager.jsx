import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { stopAllRingtones } from '@/lib/ringtone';
import { CALL_CONSTANTS, isCallStale, isDuplicateCall } from './callUtils';
import { CallManagerContext } from '@/contexts/CallManagerContext';

const useCallManagerInternal = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // ============================================
  // ALL HOOKS AT TOP LEVEL - UNCONDITIONAL
  // ============================================
  
  // State hooks
  const [currentCall, setCurrentCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [outgoingCall, setOutgoingCall] = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  const [callQueue, setCallQueue] = useState([]);
  
  // Refs
  const channelRef = useRef(null);
  const endedByLocalRef = useRef(new Set());
  const currentCallRef = useRef(currentCall);
  const incomingCallRef = useRef(incomingCall);
  const outgoingCallRef = useRef(outgoingCall);
  const lastIncomingRef = useRef({ id: null, ts: 0 });
  
  // Flags for conditional logic AFTER all hooks
  const hasUser = !!user;
  const userId = user?.id || null;
  
  // ============================================
  // CALLBACKS - ALL UNCONDITIONAL
  // ============================================
  
  // Refs for stable callback references (avoid circular deps)
  const declineCallRef = useRef(null);
  const endCallRef = useRef(null);

  // Handle incoming call
  const handleIncomingCall = useCallback(async (callData) => {
    if (!hasUser) {
      console.warn('📞 [CALL] No user, ignoring incoming call');
      return;
    }
    
    console.log('📞 [CALL] Processing incoming call:', callData);
    
    // CRITICAL FIX: Ignore "ringing" calls that are already answered
    if (callData.status === 'ringing' && currentCall && currentCall.id === callData.id) {
      const isAccepted = currentCall.status === 'accepted' || currentCall.status === 'active';
      if (isAccepted) {
        console.log('📞 [CALL] 🚫 Ignoring "ringing" status for already-accepted call:', callData.id);
        return;
      }
    }
    
    // Check if this is a self-call (calling your own device)
    const isSelfCall = callData.caller_id === userId;
    
    // CRITICAL FIX: Only reject if call is actually active (not ended)
    const hasActiveCall = currentCall && currentCall.status !== 'ended';
    if (hasActiveCall && !isSelfCall && currentCall.id !== callData.id) {
      console.log('📞 [CALL] Busy, declining incoming call');
      declineCallRef.current?.(callData.id, 'busy');
      return;
    }
    
    // CRITICAL FIX: Clear stale state if present
    if (currentCall && currentCall.status === 'ended') {
      console.log('📞 [CALL] Clearing stale ended call state');
      setCurrentCall(null);
    }

    // Fetch caller's name if not provided
    let callerName = callData.caller_name;
    if (!callerName && callData.caller_id) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, first_name')
          .eq('user_id', callData.caller_id)
          .single();
        
        callerName = profile?.display_name || profile?.first_name || 'Unknown';
      } catch (error) {
        console.warn('📞 [CALL] Failed to fetch caller name:', error);
        callerName = 'Unknown';
      }
    }

    const incomingCallData = {
      ...callData,
      caller_name: callerName,
      isIncoming: true,
      timestamp: Date.now()
    };

    console.log('📞 [CALL] Setting incomingCall state:', incomingCallData);
    setIncomingCall(incomingCallData);
    console.log('📞 [CALL] setIncomingCall called, state should update now');

    // Show notification
    toast({
      title: "Incoming Call",
      description: `${callerName} is calling you`,
    });

    // Auto-decline after 30 seconds
    setTimeout(() => {
      setIncomingCall(current => {
        if (current && current.id === callData.id) {
          console.log('📞 [CALL] Auto-declining timed out call');
          declineCallRef.current?.(callData.id, 'timeout');
          return null;
        }
        return current;
      });
    }, CALL_CONSTANTS.RING_TIMEOUT);
  }, [hasUser, userId, currentCall, toast]);

  // Handle call answered
  const handleCallAnswered = useCallback((callData) => {
    if (!hasUser) {
      console.warn('📞 [CALL] No user, ignoring call answered event');
      return;
    }
    
    console.log('📞 [CALL] Call was answered, updating caller state:', callData);
    console.log('📞 [CALL] Previous outgoingCall:', outgoingCall?.id);
    
    setOutgoingCall(null);
    setCurrentCall({
      ...callData,
      status: 'accepted',
      startTime: Date.now(),
      // CRITICAL: caller must remain isIncoming=false to create the SDP offer
      isIncoming: false
    });
    
    console.log('📞 [CALL] State updated, currentCall should now be set');
    
    try {
      stopAllRingtones?.();
    } catch (error) {
      console.error('📞 [CALL] Error stopping ringtones:', error);
    }
    
    toast({
      title: "Call Connected",
      description: "Call has been answered",
    });
  }, [hasUser, outgoingCall, toast]);

  // Handle call declined
  const handleCallDeclined = useCallback((callData) => {
    if (!hasUser) {
      console.warn('📞 [CALL] No user, ignoring call declined event');
      return;
    }
    
    console.log('📞 [CALL] Call was declined:', callData);
    
    setOutgoingCall(null);
    setIncomingCall(null);
    
    toast({
      title: "Call Declined",
      description: callData.reason === 'busy' ? 'User is busy' : 'Call was declined',
      variant: "destructive",
    });
  }, [hasUser, toast]);

  // Handle call ended
  const handleCallEnded = useCallback((callData) => {
    if (!hasUser) {
      console.warn('📞 [CALL] No user, ignoring call ended event');
      return;
    }
    
    console.log('📞 [CALL] Call ended:', callData);
    
    // CRITICAL FIX: Stop ringtone FIRST
    try {
      stopAllRingtones?.();
    } catch (error) {
      console.error('📞 [CALL] Error stopping ringtones:', error);
    }

    // Clear local end flag if present
    try {
      if (callData?.id) {
        endedByLocalRef.current.delete(callData.id);
      }
    } catch (error) {
      console.error('📞 [CALL] Error clearing end flag:', error);
    }
    
    // CRITICAL FIX: Clear ALL call state immediately (don't wait for matching)
    const wasActiveCall = currentCall || outgoingCall || incomingCall;
    
    // Add to call history before clearing
    if (currentCall) {
      const duration = Math.floor((Date.now() - (currentCall.startTime || Date.now())) / 1000);
      const historyEntry = {
        id: currentCall.id,
        type: currentCall.type || 'audio',
        duration,
        timestamp: Date.now(),
        caller_name: currentCall.caller_name,
        caller_id: currentCall.caller_id,
        receiver_id: currentCall.receiver_id,
        status: 'completed'
      };
      
      setCallHistory(prev => [historyEntry, ...prev.slice(0, CALL_CONSTANTS.HISTORY_LIMIT - 1)]);
    }
    
    // CRITICAL FIX: Always clear all state, regardless of callId match
    setCurrentCall(null);
    setOutgoingCall(null);
    setIncomingCall(null);
    
    if (wasActiveCall) {
      toast({
        title: "Call Ended",
        description: "The call has been ended",
      });
    }
  }, [hasUser, currentCall, toast]);

  // Handle call status updates
  const handleCallStatusUpdate = useCallback((statusUpdate) => {
    if (!hasUser) {
      console.warn('📞 [CALL] No user, ignoring status update');
      return;
    }
    
    console.log('📞 [CALL] Status update:', statusUpdate);

    // Safety: if any party reports 'accepted', force-stop any ringtones
    if (statusUpdate?.status === 'accepted') {
      try {
        stopAllRingtones?.();
      } catch (error) {
        console.error('📞 [CALL] Error stopping ringtones on status update:', error);
      }
    }
    
    if (currentCall && currentCall.id === statusUpdate.call_id) {
      setCurrentCall(prev => ({
        ...prev,
        ...statusUpdate
      }));
    }
  }, [hasUser, currentCall]);

  // Set up call signaling channel
  const setupCallChannel = useCallback(() => {
    if (!hasUser || !userId) {
      console.log('📞 [CALL] No user, skipping channel setup');
      return null;
    }

    console.log('📞 [CALL] Setting up call management channel');
    
    const channel = supabase
      .channel(`${CALL_CONSTANTS.CHANNEL_PREFIX}${userId}`, {
        config: {
          broadcast: { self: false, ack: true }
        }
      })
      .on('broadcast', { event: 'incoming_call' }, (payload) => {
        console.log('📞 [CALL] 🔔 BROADCAST RECEIVED:', { payload, userId, event: 'incoming_call' });
        const call = payload.payload || {};
        console.log('📞 [CALL] Parsed call data:', call);
        if (!call?.id) {
          console.warn('📞 [CALL] ❌ Invalid incoming call payload - missing id');
          return;
        }
        console.log('📞 [CALL] Checking receiver_id:', { call_receiver_id: call.receiver_id, userId, match: call.receiver_id === userId });
        if (call.receiver_id && call.receiver_id !== userId) {
          console.log('📞 [CALL] ⚠️ Call not for this user', { call_receiver_id: call.receiver_id, userId });
          return;
        }
        
        // CRITICAL FIX: Ignore "ringing" broadcasts for calls that are already answered
        const existingCall = currentCall;
        if (existingCall && existingCall.id === call.id) {
          const isAccepted = existingCall.status === 'accepted' || existingCall.status === 'active';
          const isRinging = call.status === 'ringing';
          if (isAccepted && isRinging) {
            console.log('📞 [CALL] 🚫 Ignoring stale "ringing" broadcast for already-accepted call:', call.id);
            return;
          }
        }
        
        const now = Date.now();
        const ts = typeof call.timestamp === 'number' ? call.timestamp : now;
        
        if (isDuplicateCall(call.id, lastIncomingRef.current.id, lastIncomingRef.current.ts)) {
          console.log('⏱️ [CALL] Ignoring duplicate incoming_call', call.id);
          return;
        }
        
        if (isCallStale(ts)) {
          console.log('🗑️ [CALL] Ignoring stale incoming_call', { id: call.id, ageMs: now - ts });
          return;
        }
        
        lastIncomingRef.current = { id: call.id, ts: now };
        console.log('📞 [CALL] ✅ Processing incoming_call, calling handleIncomingCall NOW:', call);
        handleIncomingCall(call);
      })
      .on('broadcast', { event: 'call_answered' }, (payload) => {
        console.log('📞 [CALL] Call answered:', payload.payload);
        handleCallAnswered(payload.payload);
      })
      .on('broadcast', { event: 'call_declined' }, (payload) => {
        console.log('📞 [CALL] Call declined:', payload.payload);
        handleCallDeclined(payload.payload);
      })
      .on('broadcast', { event: 'call_ended' }, (payload) => {
        console.log('📞 [CALL] Call ended:', payload.payload);
        handleCallEnded(payload.payload);
      })
      .on('broadcast', { event: 'call_status' }, (payload) => {
        console.log('📞 [CALL] Call status update:', payload.payload);
        handleCallStatusUpdate(payload.payload);
      })
      // DB realtime fallback: ring events for receiver
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_sessions', filter: `receiver_id=eq.${userId}` }, (payload) => {
        console.log('📞 [CALL][DB] INSERT event received:', { payload, userId });
        try {
          const row = payload.new;
          const now = Date.now();
          const ts = row?.created_at ? new Date(row.created_at).getTime() : now;
          console.log('📞 [CALL][DB] Processing INSERT:', { row, userId, status: row?.status });
          if (!row?.id) {
            console.warn('📞 [CALL][DB] Invalid INSERT payload - missing id');
            return;
          }
          if (isCallStale(ts)) {
            console.log('🗑️ [CALL][DB] Ignoring stale INSERT for incoming call', { id: row.id, ageMs: now - ts });
            return;
          }
          if (row?.status === 'ringing') {
            // CRITICAL FIX: Ignore "ringing" DB inserts for calls that are already answered
            if (currentCall && currentCall.id === row.id) {
              const isAccepted = currentCall.status === 'accepted' || currentCall.status === 'active';
              if (isAccepted) {
                console.log('📞 [CALL][DB] 🚫 Ignoring "ringing" INSERT for already-accepted call:', row.id);
                return;
              }
            }
            
            if (isDuplicateCall(row.id, lastIncomingRef.current.id, lastIncomingRef.current.ts)) {
              console.log('⏱️ [CALL][DB] Ignoring duplicate incoming INSERT', row.id);
              return;
            }
            lastIncomingRef.current = { id: row.id, ts: now };
            console.log('📞 [CALL][DB] Calling handleIncomingCall from DB INSERT');
            handleIncomingCall({
              id: row.id,
              caller_id: row.caller_id,
              receiver_id: row.receiver_id,
              type: row.call_type || 'audio',
              status: row.status,
              isIncoming: true,
            });
          } else {
            console.log('📞 [CALL][DB] INSERT status is not "ringing":', row.status);
          }
        } catch (e) {
          console.error('⚠️ [CALL][DB] Fallback incoming handler error', e);
        }
      })
      // DB realtime fallback: acceptance for caller
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'call_sessions', filter: `caller_id=eq.${userId}` }, (payload) => {
        try {
          const row = payload.new;
          console.log('🛟 [CALL][DB] Caller saw DB update:', { id: row.id, status: row.status, accepted_at: row.accepted_at });

          if (row?.status === 'accepted') {
            console.log('🛟 [CALL][DB] Fallback accepted update, triggering handleCallAnswered');
            handleCallAnswered({
              id: row.id,
              caller_id: row.caller_id,
              receiver_id: row.receiver_id,
              type: row.call_type || 'audio',
              status: 'accepted',
              isIncoming: false,
              startTime: Date.now(),
            });
            return;
          }

          if (row?.status === 'ended') {
            const now = Date.now();
            const acceptedAtMs = row?.accepted_at ? new Date(row.accepted_at).getTime() : 0;
            const ageSinceAccept = acceptedAtMs ? (now - acceptedAtMs) : Infinity;

            // Guard: ignore premature 'ended' updates unless we initiated them locally
            if (!endedByLocalRef.current.has(row.id) && ageSinceAccept < CALL_CONSTANTS.PREMATURE_END_GRACE) {
              console.warn('⏳ [CALL][DB] Ignoring premature ended within grace window', { id: row.id, ageSinceAccept });
              return;
            }

            handleCallEnded({ id: row.id, reason: 'ended' });
            return;
          }

          if (row?.status === 'declined') {
            handleCallDeclined({ id: row.id, reason: 'declined' });
            return;
          }
        } catch (e) {
          console.warn('⚠️ [CALL][DB] Fallback update handler error', e);
        }
      })
      .subscribe((status) => {
        console.log('📞 [CALL] 🔌 Channel subscription status:', status, 'userId:', userId);
        if (status === 'SUBSCRIBED') {
          console.log('📞 [CALL] ✅ Successfully subscribed to call channel for user:', userId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('📞 [CALL] ❌ Channel subscription error for user:', userId);
        }
      });

    channelRef.current = channel;
    return channel;
  }, [hasUser, userId, handleIncomingCall, handleCallAnswered, handleCallDeclined, handleCallEnded, handleCallStatusUpdate]);

  // Decline incoming call
  const declineCall = useCallback(async (callId, reason = 'declined') => {
    if (!hasUser) {
      console.warn('📞 [CALL] No user, cannot decline call');
      return;
    }
    
    if (!incomingCall || incomingCall.id !== callId) {
      console.log('📞 [CALL] No matching incoming call to decline');
      return;
    }

    try {
      console.log('📞 [CALL] Declining call:', callId, reason);
      
      // Update call record
      const { error: updateError } = await supabase
        .from('call_sessions')
        .update({ 
          status: 'declined',
          ended_at: new Date().toISOString()
        })
        .eq('id', callId);

      if (updateError) {
        console.error('❌ [CALL] Failed to update call record:', updateError);
      }

      setIncomingCall(null);
      try {
        stopAllRingtones?.();
      } catch (error) {
        console.error('📞 [CALL] Error stopping ringtones:', error);
      }

      // Notify caller (ack + cleanup)
      const callerChannel = supabase.channel(`${CALL_CONSTANTS.CHANNEL_PREFIX}${incomingCall.caller_id}`, { 
        config: { broadcast: { self: false, ack: true }}
      });
      const result = await callerChannel.send({
        type: 'broadcast',
        event: 'call_declined',
        payload: { id: callId, reason }
      });
      console.log('📞 [CALL] Decline notify result:', result);
      supabase.removeChannel(callerChannel);

    } catch (error) {
      console.error('❌ [CALL] Failed to decline call:', error);
      toast({
        title: "Error",
        description: "Failed to decline call properly",
        variant: "destructive",
      });
    }
  }, [hasUser, incomingCall, toast]);
  
  // Update ref for use in other callbacks
  useEffect(() => {
    declineCallRef.current = declineCall;
  }, [declineCall]);

  // Start a new call
  const startCall = useCallback(async (receiverId, receiverName, type = 'audio', roomId = null) => {
    if (!hasUser || !userId) {
      toast({
        title: "Error",
        description: "You must be logged in to make calls",
        variant: "destructive",
      });
      return null;
    }

    // CRITICAL FIX: Check all call states, but also allow if calls are stale/ended
    const hasActiveCall = (currentCall && currentCall.status !== 'ended') || 
                          (outgoingCall && outgoingCall.status !== 'ended') ||
                          (incomingCall && incomingCall.status !== 'ended');
    
    if (hasActiveCall) {
      console.log('📞 [CALL] Already in a call:', { 
        currentCall: currentCall?.id, 
        outgoingCall: outgoingCall?.id,
        incomingCall: incomingCall?.id 
      });
      toast({
        title: "Error", 
        description: "You are already in a call",
        variant: "destructive",
      });
      return null;
    }
    
    // CRITICAL FIX: Clear any stale state before starting new call
    if (currentCall || outgoingCall || incomingCall) {
      console.log('📞 [CALL] Clearing stale call state before starting new call');
      setCurrentCall(null);
      setOutgoingCall(null);
      setIncomingCall(null);
    }

    try {
      console.log('📞 [CALL] Starting call to:', receiverId, type);
      
      // Create call record in database
      const { data: callRecord, error: callError } = await supabase
        .from('call_sessions')
        .insert({
          caller_id: userId,
          receiver_id: receiverId,
          call_type: type,
          status: 'ringing'
        })
        .select()
        .single();

      if (callError) {
        console.error('❌ [CALL] Failed to create call record:', callError);
        throw callError;
      }

      const callData = {
        id: callRecord.id,
        caller_id: userId,
        caller_name: user.display_name || user.email,
        receiver_id: receiverId,
        receiver_name: receiverName,
        type: type,
        room_id: roomId,
        status: 'ringing',
        isIncoming: false,
        timestamp: Date.now()
      };
      // CRITICAL FIX: Set outgoing call state BEFORE channel operations
      setOutgoingCall(callData);
      console.log('📞 [CALL] Outgoing call state set:', callData.id);

      // Send call signal to receiver with retries and ack
      // Allow self-broadcasts when calling yourself
      const isSelfCall = receiverId === userId;
      const receiverChannel = supabase.channel(`${CALL_CONSTANTS.CHANNEL_PREFIX}${receiverId}`, {
        config: { broadcast: { self: isSelfCall, ack: true } }
      });
      
      // CRITICAL FIX: Wait for subscription before sending
      await Promise.race([
        new Promise((resolve) => {
          receiverChannel.subscribe((status) => {
            console.log('📞 [CALL] Receiver channel status:', status);
            if (status === 'SUBSCRIBED') {
              console.log('📞 [CALL] ✅ Receiver channel subscribed');
              resolve(true);
            }
          });
        }),
        new Promise((resolve) => setTimeout(() => {
          console.log('📞 [CALL] ⚠️ Receiver channel subscription timeout');
          resolve(false);
        }, 3000))
      ]);

      const sendOnce = async (label = 'initial') => {
        const res = await receiverChannel.send({
          type: 'broadcast',
          event: 'incoming_call',
          payload: callData
        });
        console.log(`📞 [CALL] Incoming call (${label}) send result:`, res);
      };

      await sendOnce('initial');
      // Fire two quick retries to mitigate race conditions
      setTimeout(() => sendOnce('retry1'), 1500);
      setTimeout(() => {
        sendOnce('retry2').finally(() => {
          supabase.removeChannel(receiverChannel);
        });
      }, 4000);

      // Auto-cancel after timeout (but don't clear if call was answered)
      setTimeout(() => {
        setOutgoingCall(current => {
          if (current && current.id === callData.id && !currentCall) {
            console.log('📞 [CALL] Auto-canceling timed out outgoing call');
            endCallRef.current?.(callData.id, 'timeout');
            return null;
          }
          return current;
        });
      }, CALL_CONSTANTS.RING_TIMEOUT);

      toast({
        title: "Calling...",
        description: `Calling ${receiverName}`,
      });

      return callData;
      
    } catch (error) {
      console.error('❌ [CALL] Failed to start call:', error);
      toast({
        title: "Call Failed",
        description: "Failed to start the call. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }, [hasUser, userId, user, currentCall, outgoingCall, toast]);

  // Answer incoming call
  const answerCall = useCallback(async (callId) => {
    if (!hasUser || !userId) {
      console.warn('📞 [CALL] No user, cannot answer call');
      return;
    }
    
    if (!incomingCall || incomingCall.id !== callId) {
      console.log('📞 [CALL] No matching incoming call to answer');
      return;
    }

    // CRITICAL FIX: Stop ringtone IMMEDIATELY before any state changes
    try {
      stopAllRingtones?.();
    } catch (error) {
      console.error('📞 [CALL] Error stopping ringtones:', error);
    }

    // Prepare call data and optimistically switch UI into active call state immediately
    const callData = {
      ...incomingCall,
      status: 'accepted',
      startTime: Date.now(),
      // Keep isIncoming=true for the callee so WebRTC waits for the caller's offer
      isIncoming: true,
    };

    try {
      console.log('📞 [CALL] Answering call:', callId);
      console.log('📞 [CALL] Current user:', userId);

      // CRITICAL FIX: Clear incomingCall FIRST, then set currentCall
      // This ensures overlay disappears immediately and ringtone stops
      setIncomingCall(null);
      setCurrentCall(callData);

      // Fire-and-forget: update call record (RLS may block, that's OK)
      supabase
        .from('call_sessions')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', callId)
        .then(({ error }) => {
          if (error) console.warn('⚠️ [CALL] DB update failed (non-blocking):', error);
        })
        .catch((e) => console.warn('⚠️ [CALL] DB update threw (non-blocking):', e));

      // Notify caller that call was answered (tolerate realtime hiccups)
      const callerId = incomingCall.caller_id;
      const callerChannel = supabase.channel(`${CALL_CONSTANTS.CHANNEL_PREFIX}${callerId}`, {
        config: { broadcast: { self: false, ack: true } }
      });

      await Promise.race([
        new Promise((resolve) => callerChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') resolve(true);
        })),
        new Promise((resolve) => setTimeout(resolve, 1500)) // don't block UI
      ]);

      const sendAck = await callerChannel.send({
        type: 'broadcast',
        event: 'call_answered',
        payload: callData
      });
      console.log('📞 [CALL] Answer notification sent to caller, ack:', sendAck, 'callData:', callData);
      if (sendAck !== 'ok') {
        console.warn('⚠️ [CALL] Caller notification not acknowledged:', sendAck);
      }
      supabase.removeChannel(callerChannel);

      // Also broadcast a status update for redundancy
      if (channelRef.current) {
        try {
          channelRef.current.send({
            type: 'broadcast',
            event: 'call_status',
            payload: { call_id: callId, status: 'accepted' }
          });
        } catch (error) {
          console.error('📞 [CALL] Error sending status update:', error);
        }
      }

      toast({
        title: 'Call Connected',
        description: 'Call has been connected successfully',
      });
      
      // Return success
      return true;

    } catch (error) {
      console.error('❌ [CALL] Failed to answer call:', error);
      // Do NOT tear down optimistic state; allow WebRTC layer to proceed
      toast({
        title: 'Continuing…',
        description: 'Answered locally. If audio doesn\'t connect, please retry.',
      });
      return false;
    }
  }, [hasUser, userId, incomingCall, toast]);

  // End current call
  const endCall = useCallback(async (callId, reason = 'ended') => {
    if (!hasUser || !userId) {
      console.warn('📞 [CALL] No user, cannot end call');
      return;
    }
    
    const call = currentCall || outgoingCall || incomingCall;
    if (!call || call.id !== callId) {
      console.log('📞 [CALL] No matching call to end, clearing all state anyway');
      // CRITICAL FIX: Clear all state even if call doesn't match (stuck state cleanup)
      setCurrentCall(null);
      setOutgoingCall(null);
      setIncomingCall(null);
      try {
        stopAllRingtones?.();
      } catch (error) {
        console.error('📞 [CALL] Error stopping ringtones:', error);
      }
      return;
    }

    try {
      console.log('📞 [CALL] Ending call:', callId, reason);
      
      // CRITICAL FIX: Stop ringtone FIRST
      try {
        stopAllRingtones?.();
      } catch (error) {
        console.error('📞 [CALL] Error stopping ringtones:', error);
      }
      
      // CRITICAL FIX: Clear state IMMEDIATELY (optimistic update)
      setCurrentCall(null);
      setOutgoingCall(null);
      setIncomingCall(null);
      
      const duration = currentCall ? Math.floor((Date.now() - (currentCall.startTime || Date.now())) / 1000) : 0;

      // Mark as locally ended to ignore premature DB echoes
      try {
        endedByLocalRef.current.add(callId);
      } catch (error) {
        console.error('📞 [CALL] Error marking call as locally ended:', error);
      }
      
      // Update call record (fire and forget - don't block UI)
      supabase
        .from('call_sessions')
        .update({ 
          status: reason,
          ended_at: new Date().toISOString()
        })
        .eq('id', callId)
        .then(({ error }) => {
          if (error) {
            console.error('❌ [CALL] Failed to update call record:', error);
          }
        })
        .catch((error) => {
          console.error('❌ [CALL] Error updating call record:', error);
        });

      // Notify other party (fire and forget - don't block UI)
      const otherId = call.caller_id === userId ? call.receiver_id : call.caller_id;
      if (otherId && otherId !== userId) {
        const otherChannel = supabase.channel(`${CALL_CONSTANTS.CHANNEL_PREFIX}${otherId}`, { 
          config: { broadcast: { self: false, ack: true }}
        });
        otherChannel.send({
          type: 'broadcast',
          event: 'call_ended',
          payload: { id: callId, reason, duration }
        })
        .then((notifyRes) => {
          console.log('📞 [CALL] End notify result:', notifyRes);
        })
        .catch((error) => {
          console.error('❌ [CALL] Error notifying other party:', error);
        })
        .finally(() => {
          supabase.removeChannel(otherChannel);
        });
      }

      // Add to history if it was a completed call
      if (currentCall && duration > 0) {
        const historyEntry = {
          id: callId,
          type: call.type || 'audio',
          duration,
          timestamp: Date.now(),
          caller_name: call.caller_name,
          caller_id: call.caller_id,
          receiver_id: call.receiver_id,
          receiver_name: call.receiver_name,
          status: 'completed'
        };
        
        setCallHistory(prev => [historyEntry, ...prev.slice(0, CALL_CONSTANTS.HISTORY_LIMIT - 1)]);
      }

    } catch (error) {
      console.error('❌ [CALL] Failed to end call:', error);
      toast({
        title: "Error",
        description: "Failed to end call properly",
        variant: "destructive",
      });
    }
  }, [hasUser, userId, currentCall, outgoingCall, toast]);
  
  // Update ref for use in other callbacks
  useEffect(() => {
    endCallRef.current = endCall;
  }, [endCall]);

  // Load call history
  const loadCallHistory = useCallback(async () => {
    if (!hasUser || !userId) {
      console.log('📞 [CALL] No user, skipping call history load');
      return;
    }

    try {
      const { data: history, error } = await supabase
        .from('call_sessions')
        .select('*')
        .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(CALL_CONSTANTS.HISTORY_LIMIT);

      if (error) {
        console.error('❌ [CALL] Failed to load call history:', error);
        return;
      }

      const formattedHistory = history?.map(call => {
        const accepted = call.accepted_at ? new Date(call.accepted_at).getTime() : null;
        const ended = call.ended_at ? new Date(call.ended_at).getTime() : null;
        const duration = accepted && ended ? Math.max(0, Math.floor((ended - accepted) / 1000)) : 0;

        return ({
          id: call.id,
          type: call.call_type,
          duration,
          timestamp: new Date(call.created_at).getTime(),
          caller_name: call.caller_id === userId ? 'You' : 'Unknown', // Would need to join with profiles
          caller_id: call.caller_id,
          receiver_id: call.receiver_id,
          status: call.status
        });
      }) || [];

      setCallHistory(formattedHistory);
      
    } catch (error) {
      console.error('❌ [CALL] Error loading call history:', error);
    }
  }, [hasUser, userId]);

  // ============================================
  // EFFECTS - ALL UNCONDITIONAL
  // ============================================

  // Sync refs with state for realtime handlers
  useEffect(() => {
    currentCallRef.current = currentCall;
  }, [currentCall]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
    console.log('📞 [CALL] incomingCall state changed:', incomingCall ? { id: incomingCall.id, caller_name: incomingCall.caller_name } : null);
  }, [incomingCall]);

  useEffect(() => {
    outgoingCallRef.current = outgoingCall;
  }, [outgoingCall]);

  // Initialize call manager
  useEffect(() => {
    if (!hasUser || !userId) {
      console.log('📞 [CALL] Waiting for user before initializing');
      return;
    }
    
    setupCallChannel();
    loadCallHistory();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      // CRITICAL FIX: Clean up any stale state on unmount
      setCurrentCall(null);
      setOutgoingCall(null);
      setIncomingCall(null);
      try {
        stopAllRingtones?.();
      } catch (error) {
        console.error('📞 [CALL] Error stopping ringtones on unmount:', error);
      }
    };
  }, [hasUser, userId, setupCallChannel, loadCallHistory]);
  
  // CRITICAL FIX: Safety cleanup - clear stale ended calls periodically
  useEffect(() => {
    if (!hasUser || !userId) return;
    
    const cleanupInterval = setInterval(() => {
      // Clear any calls that are marked as ended
      setCurrentCall(prev => {
        if (prev && prev.status === 'ended') {
          console.log('📞 [CALL] Cleaning up stale ended currentCall');
          return null;
        }
        return prev;
      });
      setOutgoingCall(prev => {
        if (prev && prev.status === 'ended') {
          console.log('📞 [CALL] Cleaning up stale ended outgoingCall');
          return null;
        }
        return prev;
      });
      setIncomingCall(prev => {
        if (prev && prev.status === 'ended') {
          console.log('📞 [CALL] Cleaning up stale ended incomingCall');
          return null;
        }
        return prev;
      });
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(cleanupInterval);
  }, [hasUser, userId]);

  // Resilience: Poll as a last resort if realtime fails to deliver incoming_call
  useEffect(() => {
    if (!hasUser || !userId || incomingCall || currentCall || outgoingCall) {
      return;
    }

    const poll = setInterval(async () => {
      try {
        const sinceIso = new Date(Date.now() - CALL_CONSTANTS.RING_TIMEOUT).toISOString();
        const { data, error } = await supabase
          .from('call_sessions')
          .select('id, caller_id, receiver_id, call_type, status, created_at')
          .eq('receiver_id', userId)
          .eq('status', 'ringing')
          .gt('created_at', sinceIso)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.warn('⚠️ [CALL][POLL] Poll query error:', error);
          return;
        }

        if (data && data.length > 0) {
          console.log('📞 [CALL][POLL] Found ringing call:', data[0], 'current incomingCall:', incomingCallRef.current?.id);
          if (!incomingCallRef.current || incomingCallRef.current.id !== data[0].id) {
            console.log('📞 [CALL][POLL] Triggering handleIncomingCall from poll');
            handleIncomingCall({
              id: data[0].id,
              caller_id: data[0].caller_id,
              receiver_id: data[0].receiver_id,
              type: data[0].call_type || 'audio',
              status: data[0].status,
              isIncoming: true,
            });
          }
        }
      } catch (e) {
        console.warn('⚠️ [CALL][POLL] Poll error', e);
      }
    }, 1000); // Poll every 1 second instead of 2.5

    return () => clearInterval(poll);
  }, [hasUser, userId, incomingCall, currentCall, outgoingCall, handleIncomingCall]);

  // ============================================
  // RETURN - Conditional on hasUser for stubs
  // ============================================
  
  // Return stubs if no user yet (auth still loading)
  if (!hasUser) {
    return {
      currentCall: null,
      incomingCall: null,
      outgoingCall: null,
      callHistory: [],
      callQueue: [],
      startCall: () => Promise.resolve(null),
      answerCall: () => Promise.resolve(),
      declineCall: () => Promise.resolve(),
      endCall: () => Promise.resolve(),
      loadCallHistory: () => Promise.resolve()
    };
  }

  return {
    // Call states
    currentCall,
    incomingCall,
    outgoingCall,
    callHistory,
    callQueue,
    
    // Call actions
    startCall,
    answerCall,
    declineCall,
    endCall,
    
    // Utility
    loadCallHistory
  };
};

export const useCallManager = () => {
  const ctx = useContext(CallManagerContext);
  const fallback = useCallManagerInternal();
  return ctx || fallback;
};
