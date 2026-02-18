import ResilientJitsiMeeting from '@/components/jitsi/ResilientJitsiMeeting';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  PhoneOff, Mic, MicOff, Video, VideoOff,
  Minimize2, Maximize2, Users,
} from 'lucide-react';
import { useJitsiCall } from '@/hooks/useJitsiCall';
import { useState } from 'react';

interface JitsiVideoCallProps {
  callSession: {
    id: string;
    caller_id: string;
    receiver_id: string;
    room_id?: string;
  };
  currentUserId: string;
  callerInfo: {
    display_name?: string;
    avatar_url?: string;
  };
  onEndCall: () => void;
}

export default function JitsiVideoCall({
  callSession,
  currentUserId,
  callerInfo,
  onEndCall,
}: JitsiVideoCallProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  const {
    roomName,
    onApiReady,
    isLoading,
    isAudioMuted,
    isVideoMuted,
    participantCount,
    callDuration,
    connectionState,
    toggleAudio,
    toggleVideo,
    hangUp,
  } = useJitsiCall({
    callSession,
    currentUserId,
    displayName: callerInfo.display_name || 'User',
    callType: 'video',
    onCallEnd: onEndCall,
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const jitsiElement = (
    <ResilientJitsiMeeting
      roomName={roomName}
      displayName={callerInfo.display_name || 'User'}
      startWithVideoMuted={false}
      startWithAudioMuted={false}
      interfaceConfigOverwrite={{
        TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup', 'settings', 'desktop', 'fullscreen'],
      }}
      onApiReady={onApiReady}
    />
  );

  // Minimized view
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Card className="w-80 shadow-xl border-2">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={callerInfo.avatar_url} />
                  <AvatarFallback>{callerInfo.display_name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm">{callerInfo.display_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {connectionState === 'connected' ? formatDuration(callDuration) : connectionState}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setIsMinimized(false)} className="h-8 w-8 p-0">
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="destructive" onClick={hangUp} className="h-8 w-8 p-0">
                  <PhoneOff className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden">
              {jitsiElement}
            </div>

            {connectionState === 'connected' && (
              <div className="flex justify-center gap-2 mt-3">
                <Button size="sm" variant={isAudioMuted ? 'destructive' : 'outline'} onClick={toggleAudio} className="h-8 w-8 p-0">
                  {isAudioMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                </Button>
                <Button size="sm" variant={isVideoMuted ? 'secondary' : 'outline'} onClick={toggleVideo} className="h-8 w-8 p-0">
                  {isVideoMuted ? <VideoOff className="h-3 w-3" /> : <Video className="h-3 w-3" />}
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Full screen view
  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={callerInfo.avatar_url} />
            <AvatarFallback>{callerInfo.display_name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="font-semibold">{callerInfo.display_name || 'Unknown User'}</h2>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" />
                {participantCount}
              </Badge>
              {connectionState === 'connected' && (
                <span className="text-sm text-muted-foreground">{formatDuration(callDuration)}</span>
              )}
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsMinimized(true)}>
          <Minimize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative bg-black">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <Card className="p-6 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-lg">Connecting...</p>
            </Card>
          </div>
        )}
        {jitsiElement}
      </div>

      {/* Controls */}
      <div className="p-6 border-t bg-background/95 backdrop-blur">
        <div className="flex items-center justify-center gap-4">
          {connectionState === 'connected' && (
            <>
              <Button variant={isAudioMuted ? 'destructive' : 'outline'} size="lg" onClick={toggleAudio} className="rounded-full h-14 w-14">
                {isAudioMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>
              <Button variant={isVideoMuted ? 'secondary' : 'outline'} size="lg" onClick={toggleVideo} className="rounded-full h-14 w-14">
                {isVideoMuted ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
              </Button>
            </>
          )}
          <Button variant="destructive" size="lg" onClick={hangUp} className={`rounded-full shadow-lg ${connectionState === 'connected' ? 'h-16 w-16' : 'h-16 px-8'}`}>
            <PhoneOff className="h-7 w-7" />
            {connectionState !== 'connected' && <span className="ml-2 font-semibold">Cancel</span>}
          </Button>
        </div>
      </div>
    </div>
  );
}
