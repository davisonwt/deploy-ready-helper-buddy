import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Play, 
  Pause,
  Volume2,
  VolumeX,
  Users,
  MessageCircle,
  Send,
  Heart,
  Gift,
  Settings,
  Fullscreen,
  Minimize,
  Quality,
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useLiveStreaming } from '@/hooks/useLiveStreaming';
import { useToast } from '@/hooks/use-toast';

export const LiveStreamViewer = ({ 
  streamId,
  onStreamEnded,
  enableChat = true,
  className = "" 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState('auto');
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [connecting, setConnecting] = useState(false);

  const videoRef = useRef(null);
  const chatEndRef = useRef(null);
  const { toast } = useToast();

  const {
    isInitialized,
    isViewing,
    viewerCount,
    streamQuality,
    connectionState,
    error,
    streamMetadata,
    joinStream,
    leaveStream,
    changeQuality,
    setRemoteVideoRef
  } = useLiveStreaming();

  // Set video ref when component mounts
  useEffect(() => {
    if (videoRef.current) {
      setRemoteVideoRef(videoRef.current);
    }
  }, [setRemoteVideoRef]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Join stream on mount
  useEffect(() => {
    if (streamId && !isViewing) {
      handleJoinStream();
    }

    return () => {
      if (isViewing) {
        handleLeaveStream();
      }
    };
  }, [streamId]);

  // Handle stream connection
  const handleJoinStream = async () => {
    setConnecting(true);

    try {
      await joinStream(streamId, {
        preferredQuality: selectedQuality,
        enableChat
      });

      setIsPlaying(true);
      
      toast({
        title: "Connected to stream",
        description: "Enjoying the live stream!",
      });

    } catch (error) {
      toast({
        title: "Failed to join stream",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setConnecting(false);
    }
  };

  // Leave stream
  const handleLeaveStream = () => {
    leaveStream();
    setIsPlaying(false);
    onStreamEnded?.();
  };

  // Toggle play/pause
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Toggle mute
  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Toggle fullscreen
  const handleFullscreen = () => {
    if (!isFullscreen) {
      if (videoRef.current?.requestFullscreen) {
        videoRef.current.requestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Handle quality change
  const handleQualityChange = async (quality) => {
    try {
      await changeQuality(quality);
      setSelectedQuality(quality);
      
      toast({
        title: "Quality changed",
        description: `Stream quality: ${quality}`,
        duration: 2000
      });
    } catch (error) {
      toast({
        title: "Failed to change quality",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Send chat message
  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;

    const newMessage = {
      id: Date.now(),
      user: 'You',
      message: chatMessage,
      timestamp: new Date(),
      type: 'message'
    };

    setMessages(prev => [...prev, newMessage]);
    setChatMessage('');

    // Here you would also send to the real chat service
    toast({
      title: "Message sent",
      duration: 1000
    });
  };

  // Send reaction
  const handleReaction = (type) => {
    const reaction = {
      id: Date.now(),
      user: 'You',
      type: 'reaction',
      reaction: type,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, reaction]);
    
    toast({
      title: `${type} sent!`,
      duration: 1000
    });
  };

  const qualityOptions = [
    { value: 'auto', label: 'Auto' },
    { value: 'low', label: '360p' },
    { value: 'medium', label: '720p' },
    { value: 'high', label: '1080p' }
  ];

  if (connecting) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto" />
            <p>Connecting to live stream...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span>LIVE</span>
            </div>
            {streamMetadata && (
              <span className="text-lg">{streamMetadata.title}</span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{viewerCount}</span>
            </div>
            <div className="flex items-center gap-1">
              {connectionState === 'connected' ? (
                <Wifi className="w-4 h-4 text-green-600" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-600" />
              )}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Video Player */}
          <div className="lg:col-span-3">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-64 lg:h-96 object-cover"
                autoPlay
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
              
              {/* Video Controls Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handlePlayPause}
                      className="text-white hover:bg-white/20"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleMute}
                      className="text-white hover:bg-white/20"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select value={selectedQuality} onValueChange={handleQualityChange}>
                      <SelectTrigger className="w-20 h-8 bg-black/50 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {qualityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleFullscreen}
                      className="text-white hover:bg-white/20"
                    >
                      {isFullscreen ? <Minimize className="w-4 h-4" /> : <Fullscreen className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stream Info */}
            {streamMetadata && (
              <div className="mt-4 space-y-2">
                <h3 className="text-lg font-semibold">{streamMetadata.title}</h3>
                <p className="text-gray-600">{streamMetadata.description}</p>
                <div className="flex gap-1">
                  {streamMetadata.tags?.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chat Panel */}
          {enableChat && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Live Chat
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Messages */}
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {messages.map((msg) => (
                        <div key={msg.id} className="text-sm">
                          {msg.type === 'message' ? (
                            <div>
                              <span className="font-medium text-blue-600">{msg.user}: </span>
                              <span>{msg.message}</span>
                            </div>
                          ) : (
                            <div className="text-center text-gray-500">
                              {msg.user} sent {msg.reaction}
                            </div>
                          )}
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>

                  {/* Chat Input */}
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      <Input
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        placeholder="Type a message..."
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={handleSendMessage}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Reactions */}
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReaction('❤️')}
                        className="text-red-500"
                      >
                        <Heart className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReaction('🎁')}
                        className="text-purple-500"
                      >
                        <Gift className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReaction('👏')}
                      >
                        👏
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReaction('🔥')}
                      >
                        🔥
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Quality: {streamQuality || selectedQuality}
            </div>
            <div className="text-sm text-gray-600">
              {viewerCount} viewers
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReaction('❤️')}
            >
              <Heart className="w-4 h-4 mr-1" />
              Like
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLeaveStream}
            >
              Leave Stream
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};