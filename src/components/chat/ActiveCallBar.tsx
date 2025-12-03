/**
 * ActiveCallBar - In-call bar that replaces/overlays the header during calls
 * Shows call timer, participant count, and controls
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  UserPlus,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface ActiveCallBarProps {
  callType: 'audio' | 'video';
  callStartTime: number;
  participantCount: number;
  participantName?: string;
  participantAvatar?: string;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isSpeakerOn?: boolean;
  isMinimized?: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleSpeaker?: () => void;
  onAddPeople: () => void;
  onEndCall: () => void;
  onToggleMinimize?: () => void;
  className?: string;
}

export const ActiveCallBar: React.FC<ActiveCallBarProps> = ({
  callType,
  callStartTime,
  participantCount,
  participantName,
  participantAvatar,
  isAudioMuted,
  isVideoMuted,
  isSpeakerOn = true,
  isMinimized = false,
  onToggleAudio,
  onToggleVideo,
  onToggleSpeaker,
  onAddPeople,
  onEndCall,
  onToggleMinimize,
  className,
}) => {
  const [duration, setDuration] = useState('00:00');

  // Format call duration
  const formatDuration = useCallback((ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Update duration every second
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - callStartTime;
      setDuration(formatDuration(elapsed));
    }, 1000);

    return () => clearInterval(interval);
  }, [callStartTime, formatDuration]);

  if (isMinimized) {
    return (
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-[100] bg-green-600 text-white py-2 px-4",
          "flex items-center justify-between shadow-lg",
          className
        )}
        onClick={onToggleMinimize}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
          </div>
          <span className="text-sm font-medium">
            {callType === 'video' ? '🎥' : '🔊'} {participantName || 'Call'} · {duration}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-white hover:bg-white/20"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      className={cn(
        "bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg mx-2 my-2 overflow-hidden shadow-lg",
        className
      )}
    >
      {/* Call Info Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10 border-2 border-white/30">
              <AvatarImage src={participantAvatar} />
              <AvatarFallback className="bg-white/20 text-white">
                {participantName?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>
            {/* Audio wave animation */}
            <div className="absolute -bottom-1 -right-1 flex items-end gap-0.5">
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-white rounded-full"
                  animate={{
                    height: [4, 12, 4],
                  }}
                  transition={{
                    duration: 0.5,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="font-semibold text-sm">{participantName || 'On Call'}</p>
            <p className="text-xs text-white/80 flex items-center gap-2">
              <span className="inline-flex items-center gap-1">
                {callType === 'video' ? <Video className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
                {duration}
              </span>
              {participantCount > 1 && (
                <span>· {participantCount} participants</span>
              )}
            </p>
          </div>
        </div>

        {/* Minimize button */}
        {onToggleMinimize && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMinimize}
            className="text-white hover:bg-white/20 h-8 w-8"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Call Controls */}
      <div className="flex items-center justify-center gap-3 px-4 pb-4">
        {/* Mute Audio */}
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleAudio}
            className={cn(
              "h-12 w-12 rounded-full transition-all",
              isAudioMuted 
                ? "bg-red-500 hover:bg-red-600 text-white" 
                : "bg-white/20 hover:bg-white/30 text-white"
            )}
          >
            {isAudioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
        </motion.div>

        {/* Mute Video (only for video calls) */}
        {callType === 'video' && (
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleVideo}
              className={cn(
                "h-12 w-12 rounded-full transition-all",
                isVideoMuted 
                  ? "bg-red-500 hover:bg-red-600 text-white" 
                  : "bg-white/20 hover:bg-white/30 text-white"
              )}
            >
              {isVideoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
          </motion.div>
        )}

        {/* Speaker Toggle */}
        {onToggleSpeaker && (
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSpeaker}
              className={cn(
                "h-12 w-12 rounded-full transition-all",
                !isSpeakerOn 
                  ? "bg-white/10 hover:bg-white/20 text-white/60" 
                  : "bg-white/20 hover:bg-white/30 text-white"
              )}
            >
              {isSpeakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
          </motion.div>
        )}

        {/* Add People */}
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onAddPeople}
            className="h-12 w-12 rounded-full bg-white/20 hover:bg-white/30 text-white"
          >
            <UserPlus className="h-5 w-5" />
          </Button>
        </motion.div>

        {/* End Call */}
        <motion.div whileTap={{ scale: 0.9 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={onEndCall}
            className="h-12 w-12 rounded-full bg-red-500 hover:bg-red-600 text-white"
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};
