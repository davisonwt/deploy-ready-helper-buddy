// WebRTC Live Streaming Service with SFU support
import io from 'socket.io-client';
import Peer from 'peerjs';
import Hls from 'hls.js';

class LiveStreamingService {
  constructor() {
    this.localStream = null;
    this.peers = new Map();
    this.socket = null;
    this.peer = null;
    this.isStreaming = false;
    this.streamId = null;
    this.viewers = new Map();
    this.hlsInstance = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.retryAttempts = 0;
    this.maxRetries = 3;
    
    // Event callbacks
    this.onViewerJoined = null;
    this.onViewerLeft = null;
    this.onStreamStarted = null;
    this.onStreamEnded = null;
    this.onError = null;
    this.onConnectionStateChange = null;
    this.onQualityChange = null;
  }

  // Initialize the streaming service
  async initialize(userId, options = {}) {
    try {
      console.log('🚀 Initializing Live Streaming Service...');
      
      // Connect to Socket.IO server for signaling
      this.socket = io('/live-streaming', {
        auth: { userId },
        transports: ['websocket']
      });

      // Initialize PeerJS for WebRTC connections
      this.peer = new Peer(userId, {
        host: 'peerjs.lovable.app',
        port: 443,
        secure: true,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            {
              urls: 'turn:turnserver.lovable.app:3478',
              username: 'lovable',
              credential: 'streamkey'
            }
          ]
        }
      });

      this.setupSocketHandlers();
      this.setupPeerHandlers();

      await this.waitForConnection();
      
      console.log('✅ Live Streaming Service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize streaming service:', error);
      this.onError?.('Failed to initialize streaming service');
      throw error;
    }
  }

  setupSocketHandlers() {
    this.socket.on('connect', () => {
      console.log('📡 Connected to signaling server');
      this.onConnectionStateChange?.('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('📡 Disconnected from signaling server');
      this.onConnectionStateChange?.('disconnected');
      this.handleReconnection();
    });

    this.socket.on('viewer-joined', (viewerId) => {
      console.log('👁️ Viewer joined:', viewerId);
      this.handleViewerJoined(viewerId);
    });

    this.socket.on('viewer-left', (viewerId) => {
      console.log('👁️ Viewer left:', viewerId);
      this.handleViewerLeft(viewerId);
    });

    this.socket.on('stream-ended', () => {
      console.log('📹 Stream ended by broadcaster');
      this.handleStreamEnded();
    });

    this.socket.on('quality-change-request', (quality) => {
      console.log('🎚️ Quality change requested:', quality);
      this.handleQualityChange(quality);
    });

    this.socket.on('error', (error) => {
      console.error('🚨 Socket error:', error);
      this.onError?.(error.message);
    });
  }

  setupPeerHandlers() {
    this.peer.on('open', (id) => {
      console.log('🔗 PeerJS connection opened with ID:', id);
    });

    this.peer.on('connection', (conn) => {
      console.log('🤝 New peer connection:', conn.peer);
      this.handleIncomingConnection(conn);
    });

    this.peer.on('call', (call) => {
      console.log('📞 Incoming call from:', call.peer);
      this.handleIncomingCall(call);
    });

    this.peer.on('error', (error) => {
      console.error('🚨 PeerJS error:', error);
      this.handlePeerError(error);
    });
  }

  // Start broadcasting as a streamer
  async startStreaming(streamOptions = {}) {
    try {
      const {
        video = true,
        audio = true,
        quality = 'medium',
        title = 'Live Stream',
        description = '',
        tags = [],
        recordStream = false
      } = streamOptions;

      console.log('📹 Starting live stream...');

      // Get user media with specified constraints
      const constraints = this.getMediaConstraints(video, audio, quality);
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Create stream record in database
      this.streamId = await this.createStreamRecord({
        title,
        description,
        tags,
        quality
      });

      // Set up recording if requested
      if (recordStream) {
        this.setupRecording();
      }

      // Notify server about stream start
      this.socket.emit('start-stream', {
        streamId: this.streamId,
        streamOptions: {
          title,
          description,
          tags,
          quality,
          hasVideo: video,
          hasAudio: audio
        }
      });

      this.isStreaming = true;
      this.onStreamStarted?.({
        streamId: this.streamId,
        localStream: this.localStream
      });

      console.log('✅ Live stream started successfully');
      return {
        streamId: this.streamId,
        localStream: this.localStream
      };

    } catch (error) {
      console.error('❌ Failed to start streaming:', error);
      this.onError?.('Failed to start streaming: ' + error.message);
      throw error;
    }
  }

  // Join as a viewer
  async joinStream(streamId, viewerOptions = {}) {
    try {
      const { 
        preferredQuality = 'auto',
        enableChat = true 
      } = viewerOptions;

      console.log('👁️ Joining stream:', streamId);

      // Check if HLS is supported for adaptive streaming
      if (Hls.isSupported()) {
        await this.setupHlsPlayer(streamId, preferredQuality);
      } else {
        // Fallback to WebRTC for unsupported browsers
        await this.setupWebRtcViewer(streamId);
      }

      // Join the stream room
      this.socket.emit('join-stream', {
        streamId,
        viewerOptions: {
          preferredQuality,
          enableChat
        }
      });

      console.log('✅ Successfully joined stream');
      return true;

    } catch (error) {
      console.error('❌ Failed to join stream:', error);
      this.onError?.('Failed to join stream: ' + error.message);
      throw error;
    }
  }

  // Set up HLS player for adaptive streaming
  async setupHlsPlayer(streamId, quality) {
    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.muted = false;

    // HLS stream URL (would come from media server)
    const hlsUrl = `https://stream.lovable.app/live/${streamId}/playlist.m3u8`;

    if (Hls.isSupported()) {
      this.hlsInstance = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60
      });

      this.hlsInstance.loadSource(hlsUrl);
      this.hlsInstance.attachMedia(video);

      this.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('📺 HLS manifest loaded, starting playback');
        if (quality !== 'auto') {
          this.setHlsQuality(quality);
        }
      });

      this.hlsInstance.on(Hls.Events.ERROR, (event, data) => {
        console.error('📺 HLS error:', data);
        if (data.fatal) {
          this.handleHlsError(data);
        }
      });

      this.hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        console.log('📺 Quality switched to level:', data.level);
        this.onQualityChange?.(this.hlsInstance.levels[data.level]);
      });
    }

    return video;
  }

  // Set up WebRTC viewer connection
  async setupWebRtcViewer(streamId) {
    const conn = this.peer.connect(streamId);
    
    conn.on('open', () => {
      console.log('🔗 Connected to broadcaster');
      conn.send({ type: 'request-stream' });
    });

    conn.on('data', (data) => {
      if (data.type === 'stream-offer') {
        this.handleStreamOffer(conn, data);
      }
    });

    return conn;
  }

  // Handle incoming viewer connections
  handleViewerJoined(viewerId) {
    if (!this.localStream) return;

    try {
      // Call the viewer with our stream
      const call = this.peer.call(viewerId, this.localStream);
      
      call.on('stream', (remoteStream) => {
        console.log('📺 Viewer connected successfully:', viewerId);
      });

      call.on('close', () => {
        console.log('📺 Viewer disconnected:', viewerId);
        this.viewers.delete(viewerId);
      });

      call.on('error', (error) => {
        console.error('📺 Call error with viewer:', viewerId, error);
      });

      this.viewers.set(viewerId, call);
      this.onViewerJoined?.(viewerId);

    } catch (error) {
      console.error('❌ Failed to connect to viewer:', error);
    }
  }

  // Handle viewer leaving
  handleViewerLeft(viewerId) {
    const call = this.viewers.get(viewerId);
    if (call) {
      call.close();
      this.viewers.delete(viewerId);
    }
    this.onViewerLeft?.(viewerId);
  }

  // Handle incoming calls (for viewers)
  handleIncomingCall(call) {
    call.answer(); // Answer without sending a stream (viewer mode)
    
    call.on('stream', (remoteStream) => {
      console.log('📺 Received stream from broadcaster');
      this.displayRemoteStream(remoteStream);
    });

    call.on('close', () => {
      console.log('📺 Stream ended by broadcaster');
      this.handleStreamEnded();
    });
  }

  // Display remote stream for viewers
  displayRemoteStream(stream) {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true;
    video.controls = false;
    
    // Trigger callback to update UI
    this.onStreamStarted?.({
      remoteStream: stream,
      videoElement: video
    });
  }

  // Get media constraints based on quality settings
  getMediaConstraints(video, audio, quality) {
    const qualitySettings = {
      low: {
        video: { width: 640, height: 360, frameRate: 15 },
        audio: { sampleRate: 22050 }
      },
      medium: {
        video: { width: 1280, height: 720, frameRate: 25 },
        audio: { sampleRate: 44100 }
      },
      high: {
        video: { width: 1920, height: 1080, frameRate: 30 },
        audio: { sampleRate: 48000 }
      }
    };

    const settings = qualitySettings[quality] || qualitySettings.medium;

    return {
      video: video ? {
        width: settings.video.width,
        height: settings.video.height,
        frameRate: settings.video.frameRate,
        facingMode: 'user'
      } : false,
      audio: audio ? {
        sampleRate: settings.audio.sampleRate,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      } : false
    };
  }

  // Set up stream recording for VOD
  setupRecording() {
    if (!this.localStream) return;

    try {
      const options = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 128000
      };

      this.mediaRecorder = new MediaRecorder(this.localStream, options);
      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.processRecording();
      };

      this.mediaRecorder.start(1000); // Collect data every second
      console.log('📹 Recording started');

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
    }
  }

  // Process and save recorded stream
  async processRecording() {
    if (this.recordedChunks.length === 0) return;

    try {
      const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
      
      // Upload to Supabase storage
      const fileName = `stream-${this.streamId}-${Date.now()}.webm`;
      const { data, error } = await supabase.storage
        .from('stream-recordings')
        .upload(fileName, blob);

      if (error) throw error;

      // Update stream record with recording URL
      const { data: urlData } = supabase.storage
        .from('stream-recordings')
        .getPublicUrl(fileName);

      await supabase
        .from('live_streams')
        .update({ 
          recording_url: urlData.publicUrl,
          recorded_at: new Date().toISOString()
        })
        .eq('id', this.streamId);

      console.log('✅ Recording saved successfully');

    } catch (error) {
      console.error('❌ Failed to save recording:', error);
    }
  }

  // Change stream quality
  async changeQuality(newQuality) {
    if (!this.isStreaming || !this.localStream) return;

    try {
      console.log('🎚️ Changing stream quality to:', newQuality);

      // Stop current stream
      this.localStream.getTracks().forEach(track => track.stop());

      // Get new stream with updated constraints
      const constraints = this.getMediaConstraints(true, true, newQuality);
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Update all viewer connections
      for (const [viewerId, call] of this.viewers) {
        // Send updated stream to viewer
        const newCall = this.peer.call(viewerId, this.localStream);
        call.close();
        this.viewers.set(viewerId, newCall);
      }

      this.onQualityChange?.(newQuality);
      console.log('✅ Quality changed successfully');

    } catch (error) {
      console.error('❌ Failed to change quality:', error);
      this.onError?.('Failed to change stream quality');
    }
  }

  // Toggle video track
  toggleVideo() {
    if (!this.localStream) return false;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return videoTrack.enabled;
    }
    return false;
  }

  // Toggle audio track
  toggleAudio() {
    if (!this.localStream) return false;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return audioTrack.enabled;
    }
    return false;
  }

  // End streaming session
  async endStream() {
    try {
      console.log('🛑 Ending live stream...');

      // Stop recording if active
      if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop();
      }

      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
        this.localStream = null;
      }

      // Close all viewer connections
      for (const [viewerId, call] of this.viewers) {
        call.close();
      }
      this.viewers.clear();

      // Notify server
      if (this.streamId) {
        this.socket.emit('end-stream', { streamId: this.streamId });
        
        // Update stream record
        await supabase
          .from('live_streams')
          .update({ 
            ended_at: new Date().toISOString(),
            status: 'ended'
          })
          .eq('id', this.streamId);
      }

      this.isStreaming = false;
      this.streamId = null;
      this.onStreamEnded?.();

      console.log('✅ Stream ended successfully');

    } catch (error) {
      console.error('❌ Failed to end stream:', error);
      this.onError?.('Failed to end stream');
    }
  }

  // Leave stream as viewer
  leaveStream() {
    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
    }

    this.socket.emit('leave-stream');
    console.log('👋 Left stream');
  }

  // Handle reconnection with exponential backoff
  async handleReconnection() {
    if (this.retryAttempts >= this.maxRetries) {
      this.onError?.('Connection lost. Maximum retry attempts reached.');
      return;
    }

    const delay = Math.pow(2, this.retryAttempts) * 1000; // Exponential backoff
    this.retryAttempts++;

    console.log(`🔄 Attempting reconnection ${this.retryAttempts}/${this.maxRetries} in ${delay}ms...`);

    setTimeout(() => {
      if (!this.socket.connected) {
        this.socket.connect();
      }
    }, delay);
  }

  // Handle HLS errors with fallback
  handleHlsError(data) {
    console.error('📺 Fatal HLS error, attempting WebRTC fallback');
    
    if (this.hlsInstance) {
      this.hlsInstance.destroy();
      this.hlsInstance = null;
    }

    // Fallback to WebRTC
    this.setupWebRtcViewer(this.streamId);
  }

  // Create stream record in database
  async createStreamRecord(options) {
    try {
      const { data, error } = await supabase
        .from('live_streams')
        .insert({
          title: options.title,
          description: options.description,
          tags: options.tags,
          quality: options.quality,
          status: 'live',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;

    } catch (error) {
      console.error('❌ Failed to create stream record:', error);
      throw error;
    }
  }

  // Wait for initial connections
  async waitForConnection() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      const checkConnection = () => {
        if (this.socket.connected && this.peer.open) {
          clearTimeout(timeout);
          resolve();
        } else {
          setTimeout(checkConnection, 100);
        }
      };

      checkConnection();
    });
  }

  // Clean up resources
  destroy() {
    this.endStream();
    
    if (this.socket) {
      this.socket.disconnect();
    }
    
    if (this.peer) {
      this.peer.destroy();
    }
    
    if (this.hlsInstance) {
      this.hlsInstance.destroy();
    }
  }
}

export default LiveStreamingService;