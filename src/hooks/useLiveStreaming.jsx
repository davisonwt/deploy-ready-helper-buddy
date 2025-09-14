import { useState, useEffect, useRef, useCallback } from 'react';
import LiveStreamingService from '@/utils/liveStreamingService';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useLiveStreaming() {
  const [streamingService] = useState(() => new LiveStreamingService());
  const [isInitialized, setIsInitialized] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [streamQuality, setStreamQuality] = useState('medium');
  const [connectionState, setConnectionState] = useState('disconnected');
  const [error, setError] = useState(null);
  const [localVideoRef, setLocalVideoRef] = useState(null);
  const [remoteVideoRef, setRemoteVideoRef] = useState(null);
  const [streamMetadata, setStreamMetadata] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const { user } = useAuth();
  const { toast } = useToast();

  // Initialize streaming service
  const initialize = useCallback(async () => {
    if (isInitialized || !user) return;

    try {
      // Set up event handlers
      streamingService.onStreamStarted = (data) => {
        console.log('Stream started:', data);
        if (data.localStream && localVideoRef) {
          localVideoRef.srcObject = data.localStream;
        }
        if (data.remoteStream && remoteVideoRef) {
          remoteVideoRef.srcObject = data.remoteStream;
        }
        if (data.videoElement) {
          // For HLS streams, the service provides a video element
          setRemoteVideoRef(data.videoElement);
        }
        setIsStreaming(!!data.localStream);
        setIsViewing(!!data.remoteStream || !!data.videoElement);
      };

      streamingService.onStreamEnded = () => {
        console.log('Stream ended');
        setIsStreaming(false);
        setIsViewing(false);
        setStreamMetadata(null);
        if (localVideoRef) localVideoRef.srcObject = null;
        if (remoteVideoRef) remoteVideoRef.srcObject = null;
      };

      streamingService.onViewerJoined = (viewerId) => {
        console.log('Viewer joined:', viewerId);
        setViewerCount(prev => prev + 1);
        toast({
          title: "New viewer joined",
          description: `Viewer count: ${viewerCount + 1}`,
          duration: 2000
        });
      };

      streamingService.onViewerLeft = (viewerId) => {
        console.log('Viewer left:', viewerId);
        setViewerCount(prev => Math.max(0, prev - 1));
      };

      streamingService.onConnectionStateChange = (state) => {
        console.log('Connection state changed:', state);
        setConnectionState(state);
        
        if (state === 'connected') {
          setRetryCount(0);
          setError(null);
          toast({
            title: "Connected",
            description: "Connected to streaming service",
            duration: 2000
          });
        } else if (state === 'disconnected') {
          toast({
            title: "Connection lost",
            description: "Attempting to reconnect...",
            variant: "destructive",
            duration: 3000
          });
        }
      };

      streamingService.onQualityChange = (quality) => {
        console.log('Quality changed:', quality);
        setStreamQuality(quality);
        toast({
          title: "Quality changed",
          description: `Stream quality: ${quality}`,
          duration: 2000
        });
      };

      streamingService.onError = (errorMessage) => {
        console.error('Streaming error:', errorMessage);
        setError(errorMessage);
        toast({
          title: "Streaming error",
          description: errorMessage,
          variant: "destructive",
          duration: 5000
        });
      };

      await streamingService.initialize(user.id);
      setIsInitialized(true);

    } catch (error) {
      console.error('Failed to initialize streaming:', error);
      setError(error.message);
    }
  }, [user, localVideoRef, remoteVideoRef, viewerCount, toast]);

  // Start streaming
  const startStream = useCallback(async (options = {}) => {
    if (!isInitialized) {
      await initialize();
    }

    try {
      const result = await streamingService.startStreaming({
        video: true,
        audio: true,
        quality: streamQuality,
        recordStream: true,
        ...options
      });

      setStreamMetadata({
        streamId: result.streamId,
        title: options.title || 'Live Stream',
        description: options.description || '',
        tags: options.tags || [],
        startTime: new Date()
      });

      return result;
    } catch (error) {
      console.error('Failed to start stream:', error);
      throw error;
    }
  }, [isInitialized, initialize, streamQuality]);

  // Join stream as viewer
  const joinStream = useCallback(async (streamId, options = {}) => {
    if (!isInitialized) {
      await initialize();
    }

    try {
      await streamingService.joinStream(streamId, {
        preferredQuality: streamQuality,
        enableChat: true,
        ...options
      });

      // Fetch stream metadata
      const { data: streamData } = await supabase
        .from('live_streams')
        .select('*')
        .eq('id', streamId)
        .single();

      if (streamData) {
        setStreamMetadata(streamData);
      }

      return true;
    } catch (error) {
      console.error('Failed to join stream:', error);
      throw error;
    }
  }, [isInitialized, initialize, streamQuality]);

  // End streaming
  const endStream = useCallback(async () => {
    try {
      await streamingService.endStream();
      setViewerCount(0);
    } catch (error) {
      console.error('Failed to end stream:', error);
      throw error;
    }
  }, []);

  // Leave stream as viewer
  const leaveStream = useCallback(() => {
    streamingService.leaveStream();
    setIsViewing(false);
    setStreamMetadata(null);
    if (remoteVideoRef) remoteVideoRef.srcObject = null;
  }, [remoteVideoRef]);

  // Change stream quality
  const changeQuality = useCallback(async (quality) => {
    try {
      await streamingService.changeQuality(quality);
      setStreamQuality(quality);
    } catch (error) {
      console.error('Failed to change quality:', error);
      throw error;
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    const enabled = streamingService.toggleVideo();
    toast({
      title: enabled ? "Camera on" : "Camera off",
      duration: 2000
    });
    return enabled;
  }, [toast]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    const enabled = streamingService.toggleAudio();
    toast({
      title: enabled ? "Microphone on" : "Microphone off",
      duration: 2000
    });
    return enabled;
  }, [toast]);

  // Get available streams
  const getAvailableStreams = useCallback(async (filters = {}) => {
    try {
      let query = supabase
        .from('live_streams')
        .select('*')
        .eq('status', 'live')
        .order('started_at', { ascending: false });

      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Failed to fetch streams:', error);
      return [];
    }
  }, []);

  // Get stream analytics
  const getStreamAnalytics = useCallback(async (streamId) => {
    try {
      const { data, error } = await supabase
        .from('stream_analytics')
        .select('*')
        .eq('stream_id', streamId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      return [];
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (user && !isInitialized) {
      initialize();
    }

    return () => {
      if (streamingService) {
        streamingService.destroy();
      }
    };
  }, [user, isInitialized, initialize]);

  // Handle browser compatibility checks
  const checkBrowserSupport = useCallback(() => {
    const support = {
      webrtc: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      hls: !!(window.MediaSource || window.WebKitMediaSource),
      peerjs: typeof RTCPeerConnection !== 'undefined',
      socketio: typeof WebSocket !== 'undefined'
    };

    const unsupported = Object.entries(support)
      .filter(([key, supported]) => !supported)
      .map(([key]) => key);

    if (unsupported.length > 0) {
      setError(`Browser missing support for: ${unsupported.join(', ')}`);
      return false;
    }

    return true;
  }, []);

  // Test stream connection
  const testConnection = useCallback(async () => {
    try {
      if (!checkBrowserSupport()) return false;

      // Test getUserMedia access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      stream.getTracks().forEach(track => track.stop());

      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      setError('Camera/microphone access denied or unavailable');
      return false;
    }
  }, [checkBrowserSupport]);

  return {
    // State
    isInitialized,
    isStreaming,
    isViewing,
    viewerCount,
    streamQuality,
    connectionState,
    error,
    streamMetadata,
    retryCount,

    // Actions
    initialize,
    startStream,
    joinStream,
    endStream,
    leaveStream,
    changeQuality,
    toggleVideo,
    toggleAudio,
    
    // Data fetching
    getAvailableStreams,
    getStreamAnalytics,
    
    // Utilities
    checkBrowserSupport,
    testConnection,
    
    // Refs
    setLocalVideoRef,
    setRemoteVideoRef
  };
}