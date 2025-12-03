/**
 * ConversationHeader - WhatsApp-style header with integrated call buttons
 * Always visible at the top of every conversation
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Phone, Video, MoreVertical, Users, Info } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OnlineIndicator } from './OnlineIndicator';
import { cn } from '@/lib/utils';

interface Participant {
  user_id: string;
  profiles?: {
    display_name?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  };
}

interface ConversationHeaderProps {
  roomName?: string;
  roomType?: 'direct' | 'group';
  participants: Participant[];
  currentUserId: string;
  isCallActive?: boolean;
  onBack: () => void;
  onVoiceCall: () => void;
  onVideoCall: () => void;
  onViewProfile?: () => void;
  onInvite?: () => void;
  onMute?: () => void;
  onDelete?: () => void;
  className?: string;
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  roomName,
  roomType = 'direct',
  participants,
  currentUserId,
  isCallActive = false,
  onBack,
  onVoiceCall,
  onVideoCall,
  onViewProfile,
  onInvite,
  onMute,
  onDelete,
  className,
}) => {
  const [callLoading, setCallLoading] = useState<'voice' | 'video' | null>(null);

  // Get the other participant for direct chats
  const otherParticipant = roomType === 'direct' 
    ? participants.find(p => p.user_id !== currentUserId)
    : null;

  // Display name logic
  const displayName = roomType === 'direct' && otherParticipant
    ? otherParticipant.profiles?.display_name || 
      `${otherParticipant.profiles?.first_name || ''} ${otherParticipant.profiles?.last_name || ''}`.trim() ||
      'User'
    : roomName || 'Group Chat';

  // Avatar logic
  const avatarUrl = otherParticipant?.profiles?.avatar_url;
  const avatarFallback = displayName.charAt(0).toUpperCase();

  const handleVoiceCall = async () => {
    if (isCallActive) return;
    setCallLoading('voice');
    try {
      await onVoiceCall();
    } finally {
      setCallLoading(null);
    }
  };

  const handleVideoCall = async () => {
    if (isCallActive) return;
    setCallLoading('video');
    try {
      await onVideoCall();
    } finally {
      setCallLoading(null);
    }
  };

  return (
    <motion.div
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        "flex items-center justify-between px-3 py-2 border-b bg-card/95 backdrop-blur-lg sticky top-0 z-50",
        "shadow-sm",
        className
      )}
    >
      {/* Left Section: Back + Avatar + Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-10 w-10 rounded-full hover:bg-muted shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div 
          className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 rounded-lg px-2 py-1 transition-colors min-w-0 flex-1"
          onClick={onViewProfile}
        >
          {/* Avatar with online indicator */}
          <div className="relative shrink-0">
            {roomType === 'direct' ? (
              <Avatar className="h-10 w-10 border-2 border-background">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold">
                  {avatarFallback}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="relative h-10 w-10">
                {/* Group avatar stack */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {participants.slice(0, 3).map((p, i) => (
                    <Avatar 
                      key={p.user_id} 
                      className={cn(
                        "h-6 w-6 border-2 border-background absolute",
                        i === 0 && "top-0 left-0",
                        i === 1 && "top-0 right-0",
                        i === 2 && "bottom-0 left-1/2 -translate-x-1/2"
                      )}
                    >
                      <AvatarImage src={p.profiles?.avatar_url} />
                      <AvatarFallback className="text-[10px] bg-muted">
                        {(p.profiles?.display_name || p.profiles?.first_name || 'U').charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              </div>
            )}
            
            {/* Online indicator for direct chats */}
            {roomType === 'direct' && otherParticipant && (
              <OnlineIndicator 
                userId={otherParticipant.user_id} 
                className="absolute -bottom-0.5 -right-0.5"
              />
            )}
          </div>

          {/* Name and status */}
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-sm truncate">{displayName}</span>
            <span className="text-xs text-muted-foreground truncate">
              {roomType === 'direct' ? (
                <OnlineIndicator userId={otherParticipant?.user_id || ''} showText />
              ) : (
                `${participants.length} participants`
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Right Section: Call Buttons + Menu */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Voice Call Button */}
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleVoiceCall}
            disabled={isCallActive || callLoading !== null}
            className={cn(
              "h-10 w-10 rounded-full transition-all",
              "hover:bg-primary/10 hover:text-primary",
              isCallActive && "opacity-50 cursor-not-allowed"
            )}
          >
            {callLoading === 'voice' ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Phone className="h-5 w-5" />
              </motion.div>
            ) : (
              <Phone className="h-5 w-5" />
            )}
          </Button>
        </motion.div>

        {/* Video Call Button */}
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleVideoCall}
            disabled={isCallActive || callLoading !== null}
            className={cn(
              "h-10 w-10 rounded-full transition-all",
              "hover:bg-primary/10 hover:text-primary",
              isCallActive && "opacity-50 cursor-not-allowed"
            )}
          >
            {callLoading === 'video' ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Video className="h-5 w-5" />
              </motion.div>
            ) : (
              <Video className="h-5 w-5" />
            )}
          </Button>
        </motion.div>

        {/* More Options Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full hover:bg-muted"
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-48 z-[9999] bg-popover border border-border shadow-lg"
          >
            <DropdownMenuItem onClick={onViewProfile}>
              <Info className="h-4 w-4 mr-2" />
              View {roomType === 'direct' ? 'Profile' : 'Group Info'}
            </DropdownMenuItem>
            {roomType === 'group' && (
              <DropdownMenuItem onClick={onInvite}>
                <Users className="h-4 w-4 mr-2" />
                Add Participants
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onMute}>
              Mute Notifications
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              Delete Chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
};
