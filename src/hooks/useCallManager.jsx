import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';

export const useCallManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentCall, setCurrentCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [outgoingCall, setOutgoingCall] = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  const [callQueue, setCallQueue] = useState([]);
  const channelRef = useRef(null);

  // Set up call signaling channel
  const setupCallChannel = useCallback(() => {
    if (!user) return;

    console.log('📞 [CALL] Setting up call management channel');
    
    const channel = supabase
      .channel(`user_calls_${user.id}`, {
        config: {
          broadcast: { self: false, ack: true }
        }
      })
      .on('broadcast', { event: 'incoming_call' }, (payload) => {
        console.log('📞 [CALL] Incoming call:', payload.payload);
        handleIncomingCall(payload.payload);
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
      .subscribe((status) => {
        console.log('📞 [CALL] Channel subscription status:', status);
      });

    channelRef.current = channel;
    return channel;
  }, [user?.id]);

  // Handle incoming call
  const handleIncomingCall = useCallback((callData) => {
    console.log('📞 [CALL] Processing incoming call:', callData);
    
    // Don't accept call if already in a call
    if (currentCall) {
      console.log('📞 [CALL] Busy, declining incoming call');
      declineCall(callData.id, 'busy');
      return;
    }

    setIncomingCall({
      ...callData,
      isIncoming: true,
      timestamp: Date.now()
    });

    // Show notification
    toast({
      title: "Incoming Call",
      description: `${callData.caller_name || 'Unknown'} is calling you`,
    });

    // Auto-decline after 30 seconds
    setTimeout(() => {
      setIncomingCall(current => {
        if (current && current.id === callData.id) {
          console.log('📞 [CALL] Auto-declining timed out call');
          declineCall(callData.id, 'timeout');
          return null;
        }
        return current;
      });
    }, 30000);
  }, [currentCall, toast]);

  // Handle call answered
  const handleCallAnswered = useCallback((callData) => {
    console.log('📞 [CALL] Call was answered:', callData);
    
    setOutgoingCall(null);
    setCurrentCall({
      ...callData,
      status: 'accepted',
      startTime: Date.now()
    });
  }, []);

  // Handle call declined
  const handleCallDeclined = useCallback((callData) => {
    console.log('📞 [CALL] Call was declined:', callData);
    
    setOutgoingCall(null);
    setIncomingCall(null);
    
    toast({
      title: "Call Declined",
      description: callData.reason === 'busy' ? 'User is busy' : 'Call was declined',
      variant: "destructive",
    });
  }, [toast]);

  // Handle call ended
  const handleCallEnded = useCallback((callData) => {
    console.log('📞 [CALL] Call ended:', callData);
    
    // Add to call history
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
      
      setCallHistory(prev => [historyEntry, ...prev.slice(0, 49)]); // Keep last 50 calls
    }
    
    setCurrentCall(null);
    setOutgoingCall(null);
    setIncomingCall(null);
    
    toast({
      title: "Call Ended",
      description: "The call has been ended",
    });
  }, [currentCall, toast]);

  // Handle call status updates
  const handleCallStatusUpdate = useCallback((statusUpdate) => {
    console.log('📞 [CALL] Status update:', statusUpdate);
    
    if (currentCall && currentCall.id === statusUpdate.call_id) {
      setCurrentCall(prev => ({
        ...prev,
        ...statusUpdate
      }));
    }
  }, [currentCall]);

  // Start a new call
  const startCall = useCallback(async (receiverId, receiverName, type = 'audio', roomId = null) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to make calls",
        variant: "destructive",
      });
      return null;
    }

    if (currentCall || outgoingCall) {
      toast({
        title: "Error", 
        description: "You are already in a call",
        variant: "destructive",
      });
      return null;
    }

    try {
      console.log('📞 [CALL] Starting call to:', receiverId, type);
      
      // Create call record in database
      const { data: callRecord, error: callError } = await supabase
        .from('call_sessions')
        .insert({
          caller_id: user.id,
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
        caller_id: user.id,
        caller_name: user.display_name || user.email,
        receiver_id: receiverId,
        receiver_name: receiverName,
        type: type,
        room_id: roomId,
         status: 'ringing',
         isIncoming: false,
         timestamp: Date.now()
      };

      setOutgoingCall(callData);

      // Send call signal to receiver
      const receiverChannel = supabase.channel(`user_calls_${receiverId}`);
      await receiverChannel.send({
        type: 'broadcast',
        event: 'incoming_call',
        payload: callData
      });

      // Auto-cancel after 30 seconds
      setTimeout(() => {
        setOutgoingCall(current => {
          if (current && current.id === callData.id) {
            console.log('📞 [CALL] Auto-canceling timed out outgoing call');
            endCall(callData.id, 'timeout');
            return null;
          }
          return current;
        });
      }, 30000);

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
  }, [user, currentCall, outgoingCall, toast]);

  // Answer incoming call
  const answerCall = useCallback(async (callId) => {
    if (!incomingCall || incomingCall.id !== callId) {
      console.log('📞 [CALL] No matching incoming call to answer');
      return;
    }

    try {
      console.log('📞 [CALL] Answering call:', callId);
      console.log('📞 [CALL] Current user:', user?.id);
      console.log('📞 [CALL] Incoming call:', JSON.stringify(incomingCall));
      
      // Update call record
      const { error: updateError } = await supabase
        .from('call_sessions')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('id', callId);

      if (updateError) {
        console.error('❌ [CALL] Failed to update call record:', updateError);
        throw updateError;
      }

      console.log('✅ [CALL] Call record updated successfully');

      const callData = {
        ...incomingCall,
        status: 'accepted',
        startTime: Date.now()
      };

      setCurrentCall(callData);
      setIncomingCall(null);

      // Notify caller
      console.log('📞 [CALL] Notifying caller:', incomingCall.caller_id);
      const callerChannel = supabase.channel(`user_calls_${incomingCall.caller_id}`);
      await callerChannel.send({
        type: 'broadcast',
        event: 'call_answered',
        payload: callData
      });

      toast({
        title: "Call Connected",
        description: "Call has been connected successfully",
      });

    } catch (error) {
      console.error('❌ [CALL] Failed to answer call:', error);
      toast({
        title: "Answer Failed",
        description: error?.message || "Failed to answer the call. Please try again.",
        variant: "destructive",
      });
    }
  }, [incomingCall, toast, user?.id]);

  // Decline incoming call
  const declineCall = useCallback(async (callId, reason = 'declined') => {
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

      // Notify caller
      const callerChannel = supabase.channel(`user_calls_${incomingCall.caller_id}`);
      await callerChannel.send({
        type: 'broadcast',
        event: 'call_declined',
        payload: {
          id: callId,
          reason: reason
        }
      });

    } catch (error) {
      console.error('❌ [CALL] Failed to decline call:', error);
    }
  }, [incomingCall]);

  // End current call
  const endCall = useCallback(async (callId, reason = 'ended') => {
    const call = currentCall || outgoingCall;
    if (!call || call.id !== callId) {
      console.log('📞 [CALL] No matching call to end');
      return;
    }

    try {
      console.log('📞 [CALL] Ending call:', callId, reason);
      
      const duration = currentCall ? Math.floor((Date.now() - (currentCall.startTime || Date.now())) / 1000) : 0;
      
      // Update call record
      const { error: updateError } = await supabase
        .from('call_sessions')
        .update({ 
          status: reason,
          ended_at: new Date().toISOString()
        })
        .eq('id', callId);

      if (updateError) {
        console.error('❌ [CALL] Failed to update call record:', updateError);
      }

      // Notify other party
      const otherId = call.caller_id === user.id ? call.receiver_id : call.caller_id;
      const otherChannel = supabase.channel(`user_calls_${otherId}`);
      await otherChannel.send({
        type: 'broadcast',
        event: 'call_ended',
        payload: {
          id: callId,
          reason: reason,
          duration: duration
        }
      });

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
        
        setCallHistory(prev => [historyEntry, ...prev.slice(0, 49)]);
      }

      setCurrentCall(null);
      setOutgoingCall(null);
      setIncomingCall(null);

    } catch (error) {
      console.error('❌ [CALL] Failed to end call:', error);
      toast({
        title: "Error",
        description: "Failed to end call properly",
        variant: "destructive",
      });
    }
  }, [currentCall, outgoingCall, user?.id, toast]);

  // Load call history
  const loadCallHistory = useCallback(async () => {
    if (!user) return;

    try {
      const { data: history, error } = await supabase
        .from('call_sessions')
        .select('*')
        .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

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
          caller_name: call.caller_id === user.id ? 'You' : 'Unknown', // Would need to join with profiles
          caller_id: call.caller_id,
          receiver_id: call.receiver_id,
          status: call.status
        });
      }) || [];

      setCallHistory(formattedHistory);
      
    } catch (error) {
      console.error('❌ [CALL] Error loading call history:', error);
    }
  }, [user?.id]);

  // Initialize call manager
  useEffect(() => {
    if (user) {
      setupCallChannel();
      loadCallHistory();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, setupCallChannel, loadCallHistory]);

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