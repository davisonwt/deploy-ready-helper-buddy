import ResilientJitsiMeeting from '@/components/jitsi/ResilientJitsiMeeting';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PhoneOff } from 'lucide-react';
import { useJitsiCall } from '@/hooks/useJitsiCall';

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
    callDuration,
    connectionState,
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
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#1a1a2e' }}>
      {/* Top bar with caller info and hang up */}
      <div className="flex items-center justify-between px-4 py-2 z-10" style={{ background: 'rgba(0,0,0,0.8)' }}>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={callerInfo.avatar_url} />
            <AvatarFallback>{callerInfo.display_name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm text-white">{callerInfo.display_name || 'Unknown User'}</p>
            <p className="text-xs" style={{ color: '#9ca3af' }}>
              {isLoading ? 'Loading...' : connectionState === 'connected' ? formatDuration(callDuration) : 'Connecting...'}
            </p>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={hangUp} className="gap-2">
          <PhoneOff className="h-4 w-4" />
          End Call
        </Button>
      </div>

      {/* Jitsi takes full remaining space */}
      <div className="flex-1 min-h-0">
        <ResilientJitsiMeeting
          roomName={roomName}
          displayName={callerInfo.display_name || 'User'}
          startWithVideoMuted={true}
          startWithAudioMuted={false}
          onApiReady={onApiReady}
        />
      </div>
    </div>
  );
}
