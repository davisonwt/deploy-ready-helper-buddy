import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSimpleWebRTC } from '@/hooks/useSimpleWebRTC';
import LiveCallQueue from './LiveCallQueue';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Settings,
  Minimize2,
  Users
} from 'lucide-react';

const CallInterface = ({ 
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
  const [showQueue, setShowQueue] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const intervalRef = useRef(null);

  // Use simple WebRTC hook for audio communication
  const {
    localAudioRef,
    remoteAudioRef,
    isAudioEnabled,
    connectionState,
    toggleAudio,
    cleanup
  } = useSimpleWebRTC(callSession, user);

  useEffect(() => {
    if (!isIncoming) {
      // Start call timer
      intervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isIncoming]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-64 shadow-lg">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={callerInfo?.avatar_url} />
                  <AvatarFallback>
                    {callerInfo?.display_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{callerInfo?.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(callDuration)}
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
                  <Minimize2 className="h-4 w-4" />
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
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex">
      {/* Main Call Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={callerInfo?.avatar_url} />
              <AvatarFallback>
                {callerInfo?.display_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold">{callerInfo?.display_name || 'Unknown User'}</h2>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {callType === 'video' ? 'Video Call' : 'Voice Call'}
                </Badge>
                {!isIncoming && (
                  <span className="text-sm text-muted-foreground">
                    {formatDuration(callDuration)}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowQueue(!showQueue)}
            >
              <Users className="h-4 w-4" />
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

        {/* Video Area */}
        <div className="flex-1 bg-muted relative">
        {callType === 'video' && (
          <>
            {/* Remote video */}
            <video
              ref={remoteVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
            />
            
            {/* Local video - picture in picture */}
            <div className="absolute top-4 right-4 w-32 h-24 bg-muted-foreground/20 rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
            </div>
          </>
        )}
        
        {callType === 'audio' && (
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
                    Call duration: {formatDuration(callDuration)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Connection: {connectionState}
                  </p>
                  {/* Audio debug info */}
                  <div className="text-xs text-muted-foreground mt-2 space-y-1">
                    <div>🎤 Mic: {isAudioEnabled ? 'ON' : 'OFF'}</div>
                    <div>🔊 Audio elements: L:{!!localAudioRef?.current} R:{!!remoteAudioRef?.current}</div>
                  </div>
                </>
              )}
            </div>
            
            {/* Hidden audio elements for WebRTC */}
            <audio 
              ref={localAudioRef} 
              muted 
              autoPlay 
              playsInline
              style={{ display: 'none' }}
            />
            <audio 
              ref={remoteAudioRef} 
              autoPlay 
              playsInline
              controls={false}
              volume={1.0}
              muted={false}
              style={{ display: 'none' }}
              onLoadedMetadata={() => console.log('📺 [AUDIO] Remote audio loaded')}
              onCanPlay={() => console.log('📺 [AUDIO] Remote audio can play')}
              onPlay={() => console.log('📺 [AUDIO] Remote audio started')}
              onError={(e) => console.error('📺 [AUDIO] Remote audio error:', e)}
            />
          </div>
        )}
        </div>

        {/* Controls */}
        <div className="p-6 border-t">
          <div className="flex items-center justify-center gap-4">
            {isIncoming ? (
              <>
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={onDecline}
                  className="rounded-full h-14 w-14"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
                <Button
                  size="lg"
                  variant="default"
                  onClick={onAccept}
                  className="rounded-full h-14 w-14 bg-green-600 hover:bg-green-700"
                >
                  <Phone className="h-6 w-6" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant={isAudioEnabled ? "outline" : "destructive"}
                  size="lg"
                  onClick={toggleAudio}
                  className="rounded-full h-12 w-12"
                >
                  {isAudioEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>
                
                {callType === 'video' && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="rounded-full h-12 w-12"
                  >
                    <VideoOff className="h-5 w-5" />
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full h-12 w-12"
                  onClick={() => console.log('Connection:', connectionState)}
                >
                  <Settings className="h-5 w-5" />
                </Button>
                
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={onEnd}
                  className="rounded-full h-14 w-14"
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Queue Sidebar */}
      {showQueue && (
        <div className="w-80 border-l bg-background overflow-y-auto">
          <div className="p-4">
            <LiveCallQueue 
              callSession={callSession}
              isHost={isHost}
              isModerator={isModerator}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CallInterface;