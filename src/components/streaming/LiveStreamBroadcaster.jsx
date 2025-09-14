import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Users, 
  Settings, 
  Play, 
  Square, 
  Radio,
  Eye,
  Clock,
  Wifi,
  WifiOff,
  Quality,
  Loader2,
  AlertCircle,
  CheckCircle,
  Camera,
  Monitor
} from 'lucide-react';
import { useLiveStreaming } from '@/hooks/useLiveStreaming';
import { useToast } from '@/hooks/use-toast';

export const LiveStreamBroadcaster = ({ 
  onStreamStarted, 
  onStreamEnded,
  className = "" 
}) => {
  const [streamTitle, setStreamTitle] = useState('');
  const [streamDescription, setStreamDescription] = useState('');
  const [streamTags, setStreamTags] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('medium');
  const [recordStream, setRecordStream] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [preparingStream, setPreparingStream] = useState(false);
  const [streamSetup, setStreamSetup] = useState('ready'); // ready, testing, streaming

  const localVideoRef = useRef(null);
  const { toast } = useToast();

  const {
    isInitialized,
    isStreaming,
    viewerCount,
    streamQuality,
    connectionState,
    error,
    streamMetadata,
    startStream,
    endStream,
    changeQuality,
    toggleVideo,
    toggleAudio,
    testConnection,
    setLocalVideoRef
  } = useLiveStreaming();

  // Set video ref when component mounts
  useEffect(() => {
    if (localVideoRef.current) {
      setLocalVideoRef(localVideoRef.current);
    }
  }, [setLocalVideoRef]);

  // Test stream setup
  const handleTestStream = async () => {
    setPreparingStream(true);
    setStreamSetup('testing');

    try {
      const isSupported = await testConnection();
      if (isSupported) {
        // Preview local stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoEnabled,
          audio: audioEnabled
        });
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        toast({
          title: "Stream test successful",
          description: "Ready to go live!",
        });
        setStreamSetup('ready');
      } else {
        throw new Error('Browser compatibility issues detected');
      }
    } catch (error) {
      toast({
        title: "Stream test failed",
        description: error.message,
        variant: "destructive"
      });
      setStreamSetup('ready');
    } finally {
      setPreparingStream(false);
    }
  };

  // Start live streaming
  const handleStartStream = async () => {
    if (!streamTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a stream title",
        variant: "destructive"
      });
      return;
    }

    setPreparingStream(true);

    try {
      const result = await startStream({
        title: streamTitle,
        description: streamDescription,
        tags: streamTags.split(',').map(tag => tag.trim()).filter(Boolean),
        quality: selectedQuality,
        video: videoEnabled,
        audio: audioEnabled,
        recordStream
      });

      setStreamSetup('streaming');
      onStreamStarted?.(result);

      toast({
        title: "🔴 Live streaming started!",
        description: `Broadcasting "${streamTitle}"`,
      });

    } catch (error) {
      toast({
        title: "Failed to start stream",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setPreparingStream(false);
    }
  };

  // End streaming
  const handleEndStream = async () => {
    try {
      await endStream();
      setStreamSetup('ready');
      
      // Stop local preview
      if (localVideoRef.current?.srcObject) {
        const stream = localVideoRef.current.srcObject;
        stream.getTracks().forEach(track => track.stop());
        localVideoRef.current.srcObject = null;
      }

      onStreamEnded?.();

      toast({
        title: "Stream ended",
        description: "Your live stream has been ended",
      });

    } catch (error) {
      toast({
        title: "Error ending stream",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Toggle video with UI update
  const handleToggleVideo = () => {
    const enabled = toggleVideo();
    setVideoEnabled(enabled);
  };

  // Toggle audio with UI update
  const handleToggleAudio = () => {
    const enabled = toggleAudio();
    setAudioEnabled(enabled);
  };

  // Handle quality change
  const handleQualityChange = async (quality) => {
    if (isStreaming) {
      try {
        await changeQuality(quality);
      } catch (error) {
        toast({
          title: "Failed to change quality",
          description: error.message,
          variant: "destructive"
        });
      }
    } else {
      setSelectedQuality(quality);
    }
  };

  const qualityOptions = [
    { value: 'low', label: '360p (Low)', description: 'Good for slow connections' },
    { value: 'medium', label: '720p (Medium)', description: 'Balanced quality and performance' },
    { value: 'high', label: '1080p (High)', description: 'Best quality, requires good connection' }
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="w-5 h-5" />
          Live Stream Broadcaster
          {isStreaming && (
            <Badge variant="destructive" className="ml-auto">
              🔴 LIVE
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
          {connectionState === 'connected' ? (
            <>
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">Connected to streaming service</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700">Connecting to streaming service...</span>
            </>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        <Tabs defaultValue="setup" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="live" disabled={!isStreaming}>Live</TabsTrigger>
          </TabsList>

          {/* Setup Tab */}
          <TabsContent value="setup" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Stream Title *</Label>
                <Input
                  id="title"
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                  placeholder="Enter your stream title"
                  disabled={isStreaming}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={streamDescription}
                  onChange={(e) => setStreamDescription(e.target.value)}
                  placeholder="Describe what your stream is about"
                  rows={3}
                  disabled={isStreaming}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={streamTags}
                  onChange={(e) => setStreamTags(e.target.value)}
                  placeholder="e.g., gaming, tutorial, music"
                  disabled={isStreaming}
                />
              </div>

              <div className="space-y-2">
                <Label>Stream Quality</Label>
                <Select 
                  value={selectedQuality} 
                  onValueChange={handleQualityChange}
                  disabled={preparingStream}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {qualityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-gray-500">{option.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="record"
                  checked={recordStream}
                  onChange={(e) => setRecordStream(e.target.checked)}
                  disabled={isStreaming}
                  className="rounded"
                />
                <Label htmlFor="record">Record stream for later viewing</Label>
              </div>
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-4">
            <div className="space-y-4">
              {/* Video Preview */}
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover"
                />
                {!videoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <VideoOff className="w-12 h-12 text-gray-400" />
                  </div>
                )}
                <div className="absolute bottom-2 left-2 right-2 flex justify-between">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={videoEnabled ? "default" : "secondary"}
                      onClick={handleToggleVideo}
                      disabled={preparingStream}
                    >
                      {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant={audioEnabled ? "default" : "secondary"}
                      onClick={handleToggleAudio}
                      disabled={preparingStream}
                    >
                      {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    </Button>
                  </div>
                  <Badge variant="secondary">
                    {selectedQuality} quality
                  </Badge>
                </div>
              </div>

              {/* Test Connection */}
              <Button
                onClick={handleTestStream}
                disabled={preparingStream || isStreaming}
                className="w-full"
              >
                {preparingStream ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing connection...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Test Stream Setup
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* Live Tab */}
          <TabsContent value="live" className="space-y-4">
            <div className="space-y-4">
              {/* Stream Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <div className="text-2xl font-bold">{viewerCount}</div>
                    <div className="text-sm text-gray-600">Viewers</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <Clock className="w-6 h-6 mx-auto mb-2 text-green-600" />
                    <div className="text-2xl font-bold">
                      {streamMetadata ? 
                        Math.floor((Date.now() - new Date(streamMetadata.startTime)) / 60000) : 0}m
                    </div>
                    <div className="text-sm text-gray-600">Duration</div>
                  </CardContent>
                </Card>
              </div>

              {/* Stream Info */}
              {streamMetadata && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-2">{streamMetadata.title}</h4>
                  <p className="text-sm text-gray-600 mb-2">{streamMetadata.description}</p>
                  <div className="flex gap-1">
                    {streamMetadata.tags?.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Controls */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={videoEnabled ? "default" : "secondary"}
                  onClick={handleToggleVideo}
                >
                  {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </Button>
                <Button
                  size="sm"
                  variant={audioEnabled ? "default" : "secondary"}
                  onClick={handleToggleAudio}
                >
                  {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </Button>
                <Button size="sm" variant="outline">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isStreaming ? (
            <Button
              onClick={handleStartStream}
              disabled={!streamTitle.trim() || preparingStream || !isInitialized}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {preparingStream ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Go Live
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleEndStream}
              variant="destructive"
              className="flex-1"
            >
              <Square className="w-4 h-4 mr-2" />
              End Stream
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};