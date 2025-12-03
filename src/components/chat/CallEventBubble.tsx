/**
 * CallEventBubble - Displays call events in the chat timeline
 * Shows call type, duration, status (missed/answered/outgoing)
 */
import { motion } from 'framer-motion';
import { Phone, Video, PhoneMissed, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export type CallEventType = 'outgoing_voice' | 'outgoing_video' | 'incoming_voice' | 'incoming_video';
export type CallStatus = 'answered' | 'missed' | 'declined' | 'no_answer';

interface CallEventBubbleProps {
  eventType: CallEventType;
  status: CallStatus;
  duration?: number; // in seconds
  timestamp: Date;
  participantCount?: number;
  isOwn: boolean;
  onClick?: () => void;
  className?: string;
}

export const CallEventBubble: React.FC<CallEventBubbleProps> = ({
  eventType,
  status,
  duration,
  timestamp,
  participantCount = 2,
  isOwn,
  onClick,
  className,
}) => {
  const isVideo = eventType.includes('video');
  const isOutgoing = eventType.includes('outgoing');
  const isMissed = status === 'missed' || status === 'no_answer';
  const wasAnswered = status === 'answered';

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    return `0:${secs.toString().padStart(2, '0')}`;
  };

  // Get icon based on call type and status
  const getIcon = () => {
    if (isMissed) {
      return <PhoneMissed className="h-4 w-4" />;
    }
    if (isOutgoing) {
      return isVideo ? <Video className="h-4 w-4" /> : <PhoneOutgoing className="h-4 w-4" />;
    }
    return isVideo ? <Video className="h-4 w-4" /> : <PhoneIncoming className="h-4 w-4" />;
  };

  // Get status text
  const getStatusText = () => {
    if (isMissed) {
      return isOutgoing ? 'No answer' : 'Missed';
    }
    if (status === 'declined') {
      return 'Declined';
    }
    if (wasAnswered && duration) {
      return formatDuration(duration);
    }
    return 'Call ended';
  };

  // Get call type text
  const getCallTypeText = () => {
    const direction = isOutgoing ? 'Outgoing' : 'Incoming';
    const type = isVideo ? 'video' : 'voice';
    return `${direction} ${type} call`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex",
        isOwn ? "justify-end" : "justify-start",
        className
      )}
    >
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-2xl max-w-[280px] cursor-pointer transition-colors",
          isOwn
            ? "bg-primary/10 border border-primary/20 hover:bg-primary/15"
            : "bg-muted hover:bg-muted/80",
          isMissed && "border-red-500/30 bg-red-500/5"
        )}
      >
        {/* Call Icon */}
        <div
          className={cn(
            "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
            isMissed ? "bg-red-500/20 text-red-500" :
            wasAnswered ? "bg-green-500/20 text-green-500" :
            "bg-muted-foreground/20 text-muted-foreground"
          )}
        >
          {getIcon()}
        </div>

        {/* Call Info */}
        <div className="flex flex-col min-w-0">
          <span className={cn(
            "text-sm font-medium",
            isMissed && "text-red-500"
          )}>
            {getCallTypeText()}
          </span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn(isMissed && "text-red-500/80")}>
              {getStatusText()}
            </span>
            {participantCount > 2 && wasAnswered && (
              <span>· {participantCount} participants</span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground mt-1">
            {formatDistanceToNow(timestamp, { addSuffix: true })}
          </span>
        </div>

        {/* Tap to call indicator */}
        {wasAnswered && onClick && (
          <div className="ml-auto">
            {isVideo ? (
              <Video className="h-5 w-5 text-primary" />
            ) : (
              <Phone className="h-5 w-5 text-primary" />
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

/**
 * Helper to create a call event message object
 */
export const createCallEventMessage = (
  callId: string,
  callType: 'audio' | 'video',
  isOutgoing: boolean,
  status: CallStatus,
  duration?: number,
  participantCount?: number
) => ({
  id: `call_event_${callId}`,
  message_type: 'call_event',
  content: JSON.stringify({
    call_id: callId,
    event_type: `${isOutgoing ? 'outgoing' : 'incoming'}_${callType === 'video' ? 'video' : 'voice'}`,
    status,
    duration,
    participant_count: participantCount,
  }),
  created_at: new Date().toISOString(),
});
