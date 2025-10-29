import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  MessageSquare, 
  Users, 
  Crown,
  Loader2,
  AlertCircle,
  Video
} from 'lucide-react';

export function MyPremiumRooms() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMyPremiumRooms();
      
      // Set up realtime subscription
      const channel = supabase
        .channel('my-premium-rooms')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_rooms',
            filter: `created_by=eq.${user.id}`
          },
          () => {
            fetchMyPremiumRooms();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchMyPremiumRooms = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          *,
          orchards (
            title,
            category
          )
        `)
        .eq('created_by', user.id)
        .eq('is_premium', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get participant counts for each room
      const roomsWithCounts = await Promise.all(
        (data || []).map(async (room) => {
          const { count } = await supabase
            .from('chat_participants')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id)
            .eq('is_active', true);

          return {
            ...room,
            participant_count: count || 0
          };
        })
      );

      setRooms(roomsWithCounts);
    } catch (error) {
      console.error('Error fetching premium rooms:', error);
      toast.error('Failed to load your premium rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterRoom = (roomId) => {
    try { sessionStorage.setItem('chat:allowOpen', '1'); } catch {}
    navigate(`/chatapp?room=${roomId}`);
  };

  const getCategoryColor = (category) => {
    const colors = {
      'cooking_nutrition': 'bg-orange-500',
      'diy_home': 'bg-blue-500',
      'natural_health': 'bg-green-500',
      'business_training': 'bg-purple-500',
      'podcasts_interviews': 'bg-pink-500',
      'marketing': 'bg-yellow-500',
      'general_courses': 'bg-gray-500'
    };
    return colors[category] || 'bg-gray-500';
  };

  const formatCategoryName = (category) => {
    if (!category) return 'General';
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return null;
  }

  if (rooms.length === 0) {
    return null;
  }

  return (
    <Card className="bg-white/80 border-white/40 shadow-xl h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ 
          color: 'hsl(280, 60%, 50%)', 
          textShadow: '1px 1px 2px rgba(0,0,0,0.2)' 
        }}>
          <Crown className="h-5 w-5 text-yellow-600" />
          My Premium Rooms ({rooms.length})
        </CardTitle>
        <p className="text-sm text-muted-foreground" style={{ textShadow: '0 0 2px white, 0 0 2px white' }}>
          Exclusive rooms created from your completed orchards
        </p>
      </CardHeader>
      <CardContent className="space-y-4 flex-1">
        {rooms.map((room) => (
          <Card key={room.id} className="border-2">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* Room Name and Category */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base">
                        {room.name}
                      </h3>
                      {room.orchards?.title && (
                        <p className="text-xs text-muted-foreground">
                          From: {room.orchards.title}
                        </p>
                      )}
                    </div>
                    {room.premium_category && (
                      <Badge 
                        className={`${getCategoryColor(room.premium_category)} text-white`}
                      >
                        {formatCategoryName(room.premium_category)}
                      </Badge>
                    )}
                  </div>

                  {/* Description */}
                  {room.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {room.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {room.participant_count} / {room.max_participants || '∞'} members
                    </div>
                  </div>
                </div>

                {/* Enter Room Button */}
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => handleEnterRoom(room.id)}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Enter Room
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
