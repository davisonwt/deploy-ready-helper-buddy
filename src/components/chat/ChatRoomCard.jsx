import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MessageSquare, 
  Users, 
  Megaphone, 
  BookOpen, 
  Mic, 
  GraduationCap,
  Video,
  UserPlus,
  MoreVertical,
  Trash2,
  VideoIcon,
  Play
} from 'lucide-react';
import InviteUsersModal from './InviteUsersModal';

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

const ChatRoomCard = ({ room, isActive, onClick, participantCount = 0, showInviteButton = false, currentUserId, onDeleteConversation, onStartLiveVideo }) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const Icon = getRoomIcon(room.room_type);
  
  const handleInviteClick = (e) => {
    e.stopPropagation(); // Prevent room selection when clicking invite
    setShowInviteModal(true);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation(); // Prevent room selection when clicking delete
    if (window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      onDeleteConversation(room.id);
    }
  };

  const handleLiveVideoClick = (e) => {
    e.stopPropagation(); // Prevent room selection when clicking live video
    onStartLiveVideo(room);
  };

  // Don't show invite for direct messages
  const canInvite = showInviteButton && room.room_type !== 'direct' && room.created_by === currentUserId;
  
  // Can delete if user created the room or it's a direct message (both participants can delete)
  const canDelete = room.created_by === currentUserId || room.room_type === 'direct';
  
  // Show live video button for live room types
  const canGoLive = room.room_type && room.room_type.startsWith('live_');
  
  return (
    <>
      <Card 
        className={`cursor-pointer transition-all duration-200 hover:shadow-md border ${
          isActive 
            ? 'ring-2 ring-primary bg-primary/5 border-primary/20' 
            : 'hover:bg-accent/50 hover:border-accent'
        }`}
        onClick={() => onClick(room)}
      >
        <CardContent className="p-4 pb-3">
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
                <div className="flex items-center gap-1">
                  {(canInvite || canDelete) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-primary/10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        {canInvite && (
                          <DropdownMenuItem onClick={handleInviteClick}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Invite Users
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem 
                            onClick={handleDeleteClick}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5 shrink-0">
                    {room.room_type === 'direct' ? 'DM' : room.room_type.split('_')[0]}
                  </Badge>
                </div>
              </div>
              
              {room.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                  {room.description}
                </p>
              )}
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground mt-2">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {participantCount}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {canGoLive && onStartLiveVideo && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs bg-red-500 hover:bg-red-600 text-white border-red-500 hover:border-red-600"
                      onClick={handleLiveVideoClick}
                    >
                      <VideoIcon className="h-3 w-3 mr-1" />
                      Go Live
                    </Button>
                  )}
                  {room.category && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                      {room.category}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <InviteUsersModal 
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        roomId={room.id}
        roomName={room.name || getRoomTypeLabel(room.room_type)}
      />
    </>
  );
};

export default ChatRoomCard;