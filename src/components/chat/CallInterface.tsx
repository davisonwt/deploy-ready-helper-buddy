/**
 * CallInterface - Unified Jitsi-powered call interface
 * Replaces old WebRTC implementation with Jitsi Meet
 */
import JitsiAudioCall from '@/components/jitsi/JitsiAudioCall';
import JitsiVideoCall from '@/components/jitsi/JitsiVideoCall';

interface CallInterfaceProps {
  callSession: {
    id: string;
    caller_id: string;
    receiver_id: string;
    room_id?: string;
    type?: string;
  };
  user: {
    id: string;
    display_name?: string;
    avatar_url?: string;
  };
  callType: 'audio' | 'video';
  isIncoming?: boolean;
  callerInfo: {
    display_name?: string;
    avatar_url?: string;
  };
  onAccept?: () => void;
  onDecline?: () => void;
  onEnd: () => void;
  isHost?: boolean;
  isModerator?: boolean;
}

const CallInterface = ({
  callSession,
  user,
  callType,
  callerInfo,
  onEnd,
}: CallInterfaceProps) => {
  const CallComponent = callType === 'video' ? JitsiVideoCall : JitsiAudioCall;

  return (
    <CallComponent
      callSession={callSession}
      currentUserId={user.id}
      callerInfo={callerInfo}
      onEndCall={onEnd}
    />
  );
};

export default CallInterface;
