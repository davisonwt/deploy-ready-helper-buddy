import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Radio, MessageSquare, Calendar, Clock, Users, Play } from 'lucide-react';
import { format, parseISO, isFuture, isToday } from 'date-fns';

export function UpcomingSessionsWidget({ onJoinSession }) {
  const { user } = useAuth();
  const [upcomingRadio, setUpcomingRadio] = useState([]);
  const [upcomingRooms, setUpcomingRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUpcomingSessions();
    }
  }, [user]);

  const fetchUpcomingSessions = async () => {
    try {
      // Fetch upcoming radio sessions where user is host or co-host
      const { data: radioData, error: radioError } = await supabase
        .from('radio_schedule')
        .select(`
          id,
          start_time,
          end_time,
          hour_slot,
          time_slot_date,
          radio_shows (
            show_name,
            description,
            category
          ),
          radio_djs (
            dj_name,
            user_id,
            avatar_url
          )
        `)
        .gte('start_time', new Date().toISOString())
        .or(`dj_id.radio_djs.user_id.eq.${user.id}`)
        .order('start_time', { ascending: true })
        .limit(3);

      if (radioError) throw radioError;

      // Fetch premium rooms where user is creator or moderator
      const { data: roomsData, error: roomsError } = await supabase
        .from('chat_rooms')
        .select(`
          id,
          name,
          description,
          room_type,
          premium_category,
          is_premium,
          created_at,
          chat_participants!inner(user_id, is_moderator)
        `)
        .or(`created_by.eq.${user.id},chat_participants.user_id.eq.${user.id}`)
        .eq('chat_participants.is_active', true)
        .eq('is_active', true)
        .limit(3);

      if (roomsError) throw roomsError;

      setUpcomingRadio(radioData || []);
      setUpcomingRooms(roomsData || []);
    } catch (error) {
      console.error('Error fetching upcoming sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || (upcomingRadio.length === 0 && upcomingRooms.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Upcoming Radio Sessions */}
      {upcomingRadio.length > 0 && (
        <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" />
              Your Upcoming Radio Shows
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingRadio.map((session) => {
              const startTime = parseISO(session.start_time);
              const isUpcomingToday = isToday(startTime);

              return (
                <Card key={session.id} className="border-2 hover:border-primary/50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isUpcomingToday && (
                            <Badge variant="default" className="bg-primary">
                              Today
                            </Badge>
                          )}
                          <Badge variant="outline">
                            <Clock className="h-3 w-3 mr-1" />
                            {format(startTime, 'MMM dd, h:mm a')}
                          </Badge>
                        </div>
                        
                        <div>
                          <h3 className="font-bold">{session.radio_shows?.show_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Host: {session.radio_djs?.dj_name}
                          </p>
                        </div>

                        {session.radio_shows?.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {session.radio_shows.description}
                          </p>
                        )}
                      </div>

                      <Button
                        size="sm"
                        onClick={() => window.location.href = '/grove-station'}
                        className="shrink-0"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Prepare
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Room Sessions */}
      {upcomingRooms.length > 0 && (
        <Card className="bg-gradient-to-br from-secondary/5 via-secondary/10 to-secondary/5 border-secondary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-secondary" />
              Your Active Rooms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingRooms.map((room) => (
              <Card key={room.id} className="border-2 hover:border-secondary/50 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {room.is_premium && (
                          <Badge variant="secondary">
                            Premium
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {room.premium_category?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      
                      <div>
                        <h3 className="font-bold">{room.name}</h3>
                        {room.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {room.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onJoinSession?.(room)}
                      className="shrink-0"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Enter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
