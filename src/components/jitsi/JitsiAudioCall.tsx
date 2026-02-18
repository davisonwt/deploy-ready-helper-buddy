import { JitsiMeeting } from '@jitsi/react-sdk';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PhoneOff, Mic, MicOff } from 'lucide-react';
import { useJitsiCall } from '@/hooks/useJitsiCall';
import { JITSI_CONFIG } from '@/lib/jitsi-config';

interface JitsiAudioCallProps {
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

export default function JitsiAudioCall({
  callSession,
  currentUserId,
  callerInfo,
  onEndCall,
}: JitsiAudioCallProps) {
  const {
    roomName,
    onApiReady,
    isLoading,
    isAudioMuted,
    callDuration,
    connectionState,
    toggleAudio,
    hangUp,
  } = useJitsiCall({
    callSession,
    currentUserId,
    displayName: callerInfo.display_name || 'User',
    callType: 'audio',
    onCallEnd: onEndCall,
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
      {/* Jitsi iframe - hidden for audio calls but needs real dimensions */}
      <div 
        className="fixed bottom-0 right-0 overflow-hidden" 
        style={{ width: 300, height: 200, opacity: 0.01, pointerEvents: 'none', zIndex: -1 }} 
      >
        <JitsiMeeting
          domain={JITSI_CONFIG.domain}
          roomName={roomName}
          userInfo={{ displayName: callerInfo.display_name || 'User', email: '' }}
          configOverwrite={{
            startWithVideoMuted: true,
            startWithAudioMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            enableClosePage: false,
          }}
          interfaceConfigOverwrite={{
            SHOW_JITSI_WATERMARK: false,
            TOOLBAR_BUTTONS: ['microphone', 'hangup'],
            MOBILE_APP_PROMO: false,
          }}
          onApiReady={onApiReady}
          getIFrameRef={(iframeRef) => {
            iframeRef.style.width = '100%';
            iframeRef.style.height = '100%';
          }}
        />
      </div>

      <Card className="p-8 max-w-md w-full mx-4">
        <div className="text-center space-y-6">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={callerInfo.avatar_url} />
                <AvatarFallback className="text-2xl">
                  {callerInfo.display_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div
                className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-background ${
                  connectionState === 'connected'
                    ? 'bg-green-500'
                    : connectionState === 'connecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : 'bg-red-500'
                }`}
              />
            </div>
          </div>

          {/* Name and Status */}
          <div>
            <h2 className="text-2xl font-semibold mb-2">
              {callerInfo.display_name || 'Unknown User'}
            </h2>
            <p className="text-muted-foreground">
              {isLoading
                ? 'Connecting...'
                : connectionState === 'connected'
                ? formatDuration(callDuration)
                : connectionState === 'connecting'
                ? 'Calling...'
                : 'Disconnected'}
            </p>
          </div>

          {/* Controls */}
          <div className="flex justify-center gap-4 pt-4">
            {connectionState === 'connected' && (
              <Button
                variant={isAudioMuted ? 'destructive' : 'outline'}
                size="icon"
                className="h-14 w-14 rounded-full"
                onClick={toggleAudio}
                disabled={isLoading}
              >
                {isAudioMuted ? (
                  <MicOff className="h-6 w-6" />
                ) : (
                  <Mic className="h-6 w-6" />
                )}
              </Button>
            )}

            <Button
              variant="destructive"
              size="icon"
              className={`h-16 w-16 rounded-full ${connectionState !== 'connected' ? 'w-auto px-6' : ''}`}
              onClick={hangUp}
            >
              <PhoneOff className="h-7 w-7" />
              {connectionState !== 'connected' && (
                <span className="ml-2 font-semibold">Cancel</span>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
