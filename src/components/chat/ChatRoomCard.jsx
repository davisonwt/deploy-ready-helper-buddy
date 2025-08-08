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
      className={`cursor-pointer transition-all duration-200 hover:shadow-md border ${
        isActive 
          ? 'ring-2 ring-primary bg-primary/5 border-primary/20' 
          : 'hover:bg-accent/50 hover:border-accent'
      }`}
      onClick={() => onClick(room)}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </AvatarFallback>
            </Avatar>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-medium text-sm truncate leading-tight">
                {room.name || getRoomTypeLabel(room.room_type)}
              </h3>
              <Badge variant="secondary" className="text-xs px-1.5 py-0.5 shrink-0">
                {room.room_type === 'direct' ? 'DM' : room.room_type.split('_')[0]}
              </Badge>
            </div>
            
            {room.description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mb-2 leading-relaxed">
                {room.description}
              </p>
            )}
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {participantCount}
              </span>
              {room.category && (
                <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
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