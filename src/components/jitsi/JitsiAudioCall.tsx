import ResilientJitsiMeeting from '@/components/jitsi/ResilientJitsiMeeting';
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
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Top bar with caller info and hang up */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/80 text-white z-10">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={callerInfo.avatar_url} />
            <AvatarFallback>{callerInfo.display_name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{callerInfo.display_name || 'Unknown User'}</p>
            <p className="text-xs text-gray-400">
              {isLoading ? 'Connecting...' : connectionState === 'connected' ? formatDuration(callDuration) : 'Joining...'}
            </p>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={hangUp} className="gap-2">
          <PhoneOff className="h-4 w-4" />
          End Call
        </Button>
      </div>

      {/* Jitsi takes full screen - user can interact with Jitsi's own Join button and controls */}
      <div className="flex-1">
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
