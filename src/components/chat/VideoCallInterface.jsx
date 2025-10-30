import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAdvancedWebRTC } from '@/hooks/useAdvancedWebRTC';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Settings,
  Minimize2,
  Users,
  Monitor,
  MonitorOff,
  Maximize2,
  Volume2,
  VolumeX
} from 'lucide-react';

const VideoCallInterface = ({ 
  callSession,
  user,
  callType, 
  isIncoming = false, 
  callerInfo, 
  onAccept, 
  onDecline, 
  onEnd,
  isHost = false,
  isModerator = false
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [remoteVolume, setRemoteVolume] = useState(1);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const intervalRef = useRef(null);

  // Use advanced WebRTC hook
  const {
    localVideoRef,
    remoteVideoRef,
    localAudioRef,
    remoteAudioRef,
    isAudioEnabled,
    isVideoEnabled,
    isScreenSharing,
    connectionState,
    callStatus,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    cleanup
  } = useAdvancedWebRTC(callSession, user, callType);

  // Call timer
  useEffect(() => {
    if (!isIncoming && callStatus === 'connected') {
      intervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isIncoming, callStatus]);

  // Prompt for user gesture to unlock audio if autoplay is blocked
  useEffect(() => {
    if (connectionState === 'connected') {
      const t = setTimeout(() => setNeedsAudioUnlock(true), 1500);
      return () => clearTimeout(t);
    } else {
      setNeedsAudioUnlock(false);
    }
  }, [connectionState]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle remote audio volume
  useEffect(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.volume = remoteVolume;
    }
  }, [remoteVolume]);

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Minimized view
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-80 shadow-xl border-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={callerInfo?.avatar_url} />
                    <AvatarFallback>
                      {callerInfo?.display_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${
                    callStatus === 'connected' ? 'bg-green-500' : 
                    callStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                </div>
                <div>
                  <p className="font-medium text-sm">{callerInfo?.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {callStatus === 'connected' ? formatDuration(callDuration) : callStatus}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsMinimized(false)}
                  className="h-8 w-8 p-0"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={onEnd}
                  className="h-8 w-8 p-0"
                >
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Mini video preview for video calls */}
            {callType === 'video' && (
              <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden">
                <video
                  ref={remoteVideoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                />
                <div className="absolute bottom-2 right-2 w-16 h-12 bg-muted-foreground/20 rounded overflow-hidden">
                  <video
                    ref={localVideoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                    muted
                  />
                </div>
              </div>
            )}
            
            {/* Mini controls */}
            <div className="flex justify-center gap-2 mt-2">
              <Button
                size="sm"
                variant={isAudioEnabled ? "outline" : "destructive"}
                onClick={toggleAudio}
                className="h-8 w-8 p-0"
              >
                {isAudioEnabled ? <Mic className="h-3 w-3" /> : <MicOff className="h-3 w-3" />}
              </Button>
              {callType === 'video' && (
                <Button
                  size="sm"
                  variant={isVideoEnabled ? "outline" : "secondary"}
                  onClick={toggleVideo}
                  className="h-8 w-8 p-0"
                >
                  {isVideoEnabled ? <Video className="h-3 w-3" /> : <VideoOff className="h-3 w-3" />}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 bg-background z-50 flex flex-col ${isFullscreen ? 'bg-black' : ''}`}>
      {/* Header */}
      {!isFullscreen && (
        <div className="p-4 border-b flex items-center justify-between bg-background/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={callerInfo?.avatar_url} />
                <AvatarFallback>
                  {callerInfo?.display_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background ${
                callStatus === 'connected' ? 'bg-green-500' : 
                callStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
            </div>
            <div>
              <h2 className="font-semibold">{callerInfo?.display_name || 'Unknown User'}</h2>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {callType === 'video' ? 'Video Call' : 'Voice Call'}
                  {isScreenSharing && ' • Screen Share'}
                </Badge>
                {callStatus === 'connected' && (
                  <span className="text-sm text-muted-foreground">
                    {formatDuration(callDuration)}
                  </span>
                )}
                <span className="text-xs text-muted-foreground capitalize">
                  {connectionState}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Video/Audio Area */}
      <div className="flex-1 relative bg-black">
        {callType === 'video' ? (
          <>
            {/* Remote video (main) */}
            <video
              ref={remoteVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100%25' height='100%25' fill='%23000'/%3E%3C/svg%3E"
            />
            
            {/* Local video (picture-in-picture) */}
            <div className={`absolute ${isFullscreen ? 'top-4 right-4' : 'top-6 right-6'} ${
              isFullscreen ? 'w-48 h-36' : 'w-64 h-48'
            } bg-muted-foreground/20 rounded-lg overflow-hidden shadow-xl border-2 border-white/20`}>
              <video
                ref={localVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              {!isVideoEnabled && (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={user?.avatar_url} />
                    <AvatarFallback>
                      {user?.display_name?.charAt(0) || 'Y'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
            
            {/* Overlay for no remote video */}
            <div className="absolute inset-0 bg-muted flex items-center justify-center" 
                 style={{ display: remoteVideoRef.current?.srcObject ? 'none' : 'flex' }}>
              <div className="text-center">
                <Avatar className="h-32 w-32 mx-auto mb-4">
                  <AvatarImage src={callerInfo?.avatar_url} />
                  <AvatarFallback className="text-4xl">
                    {callerInfo?.display_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-semibold mb-2 text-white">
                  {callerInfo?.display_name || 'Unknown User'}
                </h3>
                <p className="text-muted-foreground">Camera is off</p>
              </div>
            </div>
          </>
        ) : (
          /* Audio-only interface */
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Avatar className="h-32 w-32 mx-auto mb-4">
                <AvatarImage src={callerInfo?.avatar_url} />
                <AvatarFallback className="text-4xl">
                  {callerInfo?.display_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-semibold mb-2">
                {callerInfo?.display_name || 'Unknown User'}
              </h3>
              {isIncoming ? (
                <p className="text-muted-foreground">Incoming call...</p>
              ) : (
                <>
                  <p className="text-muted-foreground">
                    {callStatus === 'connected' ? `Call duration: ${formatDuration(callDuration)}` : `Status: ${callStatus}`}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 capitalize">
                    Connection: {connectionState}
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Hidden audio elements */}
        <audio 
          ref={localAudioRef} 
          muted 
          autoPlay 
          playsInline
          style={{ display: 'none' }}
          onLoadedMetadata={() => console.log('📺 [AUDIO] Remote audio loaded')}
          onCanPlay={() => console.log('📺 [AUDIO] Remote audio can play')}
          onPlay={() => { console.log('📺 [AUDIO] Remote audio started'); setNeedsAudioUnlock(false); }}
          onError={(e) => console.error('📺 [AUDIO] Remote audio error:', e)}
        />
        <audio 
          ref={remoteAudioRef} 
          autoPlay 
          playsInline
          style={{ display: 'none' }}
        />
      </div>

      {/* Controls */}
      {!isFullscreen && (
        <div className="p-6 border-t bg-background/95 backdrop-blur">
          <div className="flex items-center justify-center gap-4">
            {isIncoming ? (
              <>
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={onDecline}
                  className="rounded-full h-16 w-16 shadow-lg"
                >
                  <PhoneOff className="h-7 w-7" />
                </Button>
                <Button
                  size="lg"
                  onClick={() => { onAccept(); setTimeout(() => remoteAudioRef.current?.play().catch(() => {}), 200); }}
                  className="rounded-full h-16 w-16 bg-green-600 hover:bg-green-700 shadow-lg"
                >
                  <Phone className="h-7 w-7" />
                </Button>
              </>
            ) : (
              <>
                {/* Audio controls */}
                <Button
                  variant={isAudioEnabled ? "outline" : "destructive"}
                  size="lg"
                  onClick={toggleAudio}
                  className="rounded-full h-14 w-14 shadow-md"
                >
                  {isAudioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
                </Button>
                
                {/* Video controls */}
                {callType === 'video' && (
                  <Button
                    variant={isVideoEnabled ? "outline" : "secondary"}
                    size="lg"
                    onClick={toggleVideo}
                    className="rounded-full h-14 w-14 shadow-md"
                  >
                    {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
                  </Button>
                )}
                
                {/* Screen share controls */}
                {callType === 'video' && (
                  <Button
                    variant={isScreenSharing ? "default" : "outline"}
                    size="lg"
                    onClick={toggleScreenShare}
                    className="rounded-full h-14 w-14 shadow-md"
                  >
                    {isScreenSharing ? <MonitorOff className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
                  </Button>
                )}
                
                {/* Settings */}
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setShowSettings(!showSettings)}
                  className="rounded-full h-14 w-14 shadow-md"
                >
                  <Settings className="h-6 w-6" />
                </Button>
                
                {/* End call */}
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={onEnd}
                  className="rounded-full h-16 w-16 shadow-lg hover:scale-105 transition-transform"
                >
                  <PhoneOff className="h-7 w-7" />
                </Button>
              </>
            )}
          </div>
          
          {/* Settings panel */}
          {showSettings && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  <span className="text-sm">Remote Volume:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={remoteVolume}
                    onChange={(e) => setRemoteVolume(parseFloat(e.target.value))}
                    className="w-20"
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Connection: {connectionState} | Status: {callStatus}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Fullscreen controls overlay */}
      {isFullscreen && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4 bg-black/50 rounded-full p-4 backdrop-blur">
          <Button
            variant={isAudioEnabled ? "outline" : "destructive"}
            size="lg"
            onClick={toggleAudio}
            className="rounded-full h-14 w-14 bg-black/20 border-white/20"
          >
            {isAudioEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>
          
          {callType === 'video' && (
            <Button
              variant={isVideoEnabled ? "outline" : "secondary"}
              size="lg"
              onClick={toggleVideo}
              className="rounded-full h-14 w-14 bg-black/20 border-white/20"
            >
              {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </Button>
          )}
          
          {callType === 'video' && (
            <Button
              variant={isScreenSharing ? "default" : "outline"}
              size="lg"
              onClick={toggleScreenShare}
              className="rounded-full h-14 w-14 bg-black/20 border-white/20"
            >
              {isScreenSharing ? <MonitorOff className="h-6 w-6" /> : <Monitor className="h-6 w-6" />}
            </Button>
          )}
          
          <Button
            variant="destructive"
            size="lg"
            onClick={onEnd}
            className="rounded-full h-16 w-16 hover:scale-105 transition-transform"
          >
            <PhoneOff className="h-7 w-7" />
          </Button>
          
          <Button
            variant="outline"
            size="lg"
            onClick={toggleFullscreen}
            className="rounded-full h-14 w-14 bg-black/20 border-white/20"
          >
            <Minimize2 className="h-6 w-6" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default VideoCallInterface;