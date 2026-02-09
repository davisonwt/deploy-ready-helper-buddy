import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Trash2,
  Check,
  Clock
} from 'lucide-react';

interface ChatRoom {
  id: string;
  name: string;
  room_type: string;
  created_by: string;
  created_at: string;
  is_active: boolean;
  creator_name?: string;
  participant_count?: number;
  creator?: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface ChatRoomMonitorTabProps {
  rooms: ChatRoom[];
  loading: boolean;
  onDelete: (roomId: string) => void;
  onApprove: (roomId: string) => void;
}

export function ChatRoomMonitorTab({ rooms, loading, onDelete, onApprove }: ChatRoomMonitorTabProps) {
  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (rooms.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No content found</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {rooms.map((item) => {
        const isNew = new Date(item.created_at) > new Date(Date.now() - 3600000); // Last hour

        return (
          <Card
            key={item.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${isNew ? 'ring-2 ring-amber-500/50' : ''}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1 truncate">{item.name || 'Unnamed'}</h3>
                  <p className="text-xs text-muted-foreground">
                    {item.creator?.display_name || item.creator_name || 'Unknown'} • {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                {isNew && <Badge className="bg-amber-500 text-white text-xs">NEW</Badge>}
              </div>
              
              <div className="flex items-center gap-2 mt-3">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{item.participant_count || 0} participants</span>
              </div>

              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Type: {item.room_type}</span>
              </div>

              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-1 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  DELETE
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1 text-xs bg-green-600 hover:bg-green-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    onApprove(item.id);
                  }}
                >
                  <Check className="w-3 h-3 mr-1" />
                  APPROVE
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
