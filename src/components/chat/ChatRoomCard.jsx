import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MessageSquare, 
  Users, 
  Megaphone, 
  BookOpen, 
  Mic, 
  GraduationCap,
  Video 
} from 'lucide-react';

const getRoomIcon = (roomType) => {
  const icons = {
    direct: MessageSquare,
    group: Users,
    live_marketing: Megaphone,
    live_study: BookOpen,
    live_podcast: Mic,
    live_training: GraduationCap,
    live_conference: Video,
  };
  return icons[roomType] || MessageSquare;
};

const getRoomTypeLabel = (roomType) => {
  const labels = {
    direct: 'Direct Message',
    group: 'Group Chat',
    live_marketing: 'Live Marketing',
    live_study: 'Live Study',
    live_podcast: 'Live Podcast',
    live_training: 'Live Training',
    live_conference: 'Live Conference',
  };
  return labels[roomType] || 'Chat';
};

const ChatRoomCard = ({ room, isActive, onClick, participantCount = 0 }) => {
  const Icon = getRoomIcon(room.room_type);
  
  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        isActive ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-accent/50'
      }`}
      onClick={() => onClick(room)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm truncate">
                {room.name || getRoomTypeLabel(room.room_type)}
              </h3>
              <Badge variant="secondary" className="text-xs">
                {getRoomTypeLabel(room.room_type)}
              </Badge>
            </div>
            
            {room.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                {room.description}
              </p>
            )}
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {participantCount} participants
              </span>
              {room.category && (
                <Badge variant="outline" className="text-xs">
                  {room.category}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChatRoomCard;