import { useRef, useState } from 'react';
import ResilientJitsiMeeting from '@/components/jitsi/ResilientJitsiMeeting';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PhoneOff, Minimize2, Maximize2 } from 'lucide-react';
import { useJitsiCall } from '@/hooks/useJitsiCall';
import CallControlBar from '@/components/jitsi/CallControlBar';

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
  myDisplayName?: string;
  onEndCall: () => void;
}

export default function JitsiVideoCall({
  callSession,
  currentUserId,
  callerInfo,
  myDisplayName,
  onEndCall,
}: JitsiVideoCallProps) {
  const [isMinimized, setIsMinimized] = useState(false);
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
    callType: 'video',
    onCallEnd: onEndCall,
  });

  const handleApiReady = (api: any) => {
    jitsiApiRef.current = api;
    hookOnApiReady(api);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Minimized view
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50" style={{ width: 320, height: 240 }}>
        <div className="w-full h-full rounded-lg overflow-hidden shadow-xl border-2" style={{ background: '#1a1a2e' }}>
          <ResilientJitsiMeeting
            roomName={roomName}
            displayName={ownName}
            startWithVideoMuted={false}
            startWithAudioMuted={false}
            onApiReady={handleApiReady}
          />
          <div className="absolute top-2 right-2 flex gap-1">
            <Button size="sm" variant="outline" onClick={() => setIsMinimized(false)} className="h-7 w-7 p-0">
              <Maximize2 className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="destructive" onClick={hangUp} className="h-7 w-7 p-0">
              <PhoneOff className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Full screen view
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#1a1a2e' }}>
      {/* Minimal header */}
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
        <Button variant="outline" size="sm" onClick={() => setIsMinimized(true)}>
          <Minimize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Jitsi takes full remaining space */}
      <div className="flex-1 min-h-0 relative">
        <ResilientJitsiMeeting
          roomName={roomName}
          displayName={ownName}
          startWithVideoMuted={false}
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
        />
      </div>
    </div>
  );
}
