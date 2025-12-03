import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, 
  Video, 
  Radio, 
  GraduationCap, 
  Plus, 
  X,
  Mic,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import JitsiRoom from '@/components/jitsi/JitsiRoom';

interface GroupChatRoomEnhancedProps {
  roomId: string;
  roomName: string;
  participants: Array<{
    id: string;
    name?: string;
    avatar_url?: string;
  }>;
  onBack: () => void;
}

export function GroupChatRoomEnhanced({
  roomId,
  roomName,
  participants,
  onBack,
}: GroupChatRoomEnhancedProps) {
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);
  const [activeCall, setActiveCall] = useState<'voice' | 'video' | 'radio' | 'study' | null>(null);
  const [showFileOverlay, setShowFileOverlay] = useState(false);

  const handleStartCall = (type: 'voice' | 'video' | 'radio' | 'study') => {
    setActiveCall(type);
    setShowFloatingMenu(false);
  };

  const handleEndCall = () => {
    setActiveCall(null);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Wave row - participant avatars */}
      <div className="flex items-center gap-2 p-3 border-b bg-muted/50">
        <div className="flex -space-x-2">
          {participants.slice(0, 5).map((participant) => (
            <motion.div
              key={participant.id}
              whileHover={{ scale: 1.1, zIndex: 10 }}
              className="cursor-pointer"
            >
              <Avatar className="h-8 w-8 border-2 border-background">
                <AvatarImage src={participant.avatar_url} />
                <AvatarFallback>
                  {(participant.name || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </motion.div>
          ))}
          {participants.length > 5 && (
            <Badge variant="secondary" className="h-8 px-2 flex items-center">
              +{participants.length - 5}
            </Badge>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline">{participants.length} members</Badge>
        </div>
      </div>

      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Messages will go here */}
        <div className="text-center text-muted-foreground py-8">
          <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Start chatting with {roomName}</p>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="absolute bottom-20 right-4 z-40">
        <AnimatePresence>
          {showFloatingMenu && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex flex-col gap-2 mb-2"
            >
              <Button
                onClick={() => handleStartCall('study')}
                className="rounded-full h-12 w-12 p-0 shadow-lg"
                variant="default"
              >
                <GraduationCap className="h-5 w-5" />
              </Button>
              <Button
                onClick={() => handleStartCall('radio')}
                className="rounded-full h-12 w-12 p-0 shadow-lg"
                variant="default"
              >
                <Radio className="h-5 w-5" />
              </Button>
              <Button
                onClick={() => handleStartCall('video')}
                className="rounded-full h-12 w-12 p-0 shadow-lg"
                variant="default"
              >
                <Video className="h-5 w-5" />
              </Button>
              <Button
                onClick={() => handleStartCall('voice')}
                className="rounded-full h-12 w-12 p-0 shadow-lg"
                variant="default"
              >
                <Phone className="h-5 w-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          onClick={() => setShowFloatingMenu(!showFloatingMenu)}
          className="rounded-full h-14 w-14 p-0 shadow-lg"
          variant={showFloatingMenu ? 'destructive' : 'default'}
        >
          {showFloatingMenu ? (
            <X className="h-6 w-6" />
          ) : (
            <Plus className="h-6 w-6" />
          )}
        </Button>
      </div>

      {/* File/Media Overlay */}
      <AnimatePresence>
        {showFileOverlay && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute inset-x-0 bottom-0 bg-background border-t p-4 h-64 z-50"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Files & Media</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFileOverlay(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* File browser will go here */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Call Overlay */}
      {activeCall && (
        <div className="absolute inset-0 bg-background z-50">
          <JitsiRoom
            roomName={`${roomId}-${activeCall}`}
            displayName={roomName}
            onLeave={handleEndCall}
          />
        </div>
      )}
    </div>
  );
}

