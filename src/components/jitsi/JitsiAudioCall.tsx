import { useRef } from 'react';
import ResilientJitsiMeeting from '@/components/jitsi/ResilientJitsiMeeting';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useJitsiCall } from '@/hooks/useJitsiCall';
import CallControlBar from '@/components/jitsi/CallControlBar';

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
  myDisplayName?: string;
  onEndCall: () => void;
}

export default function JitsiAudioCall({
  callSession,
  currentUserId,
  callerInfo,
  myDisplayName,
  onEndCall,
}: JitsiAudioCallProps) {
  const ownName = myDisplayName || 'User';
  const jitsiApiRef = useRef<any>(null);

  const {
    roomName,
    onApiReady: hookOnApiReady,
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
    displayName: ownName,
    callType: 'audio',
    onCallEnd: onEndCall,
  });

  const handleApiReady = (api: any) => {
    jitsiApiRef.current = api;
    hookOnApiReady(api);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#1a1a2e' }}>
      {/* Top bar with caller info */}
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
      </div>

      {/* Jitsi takes full remaining space */}
      <div className="flex-1 min-h-0 relative">
        <ResilientJitsiMeeting
          roomName={roomName}
          displayName={ownName}
          startWithVideoMuted={true}
          startWithAudioMuted={false}
          onApiReady={handleApiReady}
        />

        {/* Custom control bar with invite */}
        <CallControlBar
          jitsiApi={jitsiApiRef.current}
          roomName={roomName}
          isAudioMuted={isAudioMuted}
          isVideoMuted={isVideoMuted}
          participantCount={participantCount}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onHangUp={hangUp}
          showVideoToggle={true}
        />
      </div>
    </div>
  );
}
