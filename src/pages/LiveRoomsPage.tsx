import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Video, Users, Plus, ArrowLeft } from 'lucide-react';
import OneOnOneRoom from '@/components/live/OneOnOneRoom';

interface LiveRoom {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  is_active: boolean;
}

export default function LiveRoomsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const roomParam = searchParams.get('room');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(roomParam);

  useEffect(() => { setActiveRoomId(roomParam); }, [roomParam]);

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['my-live-rooms', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('live_rooms')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as LiveRoom[];
    },
  });

  const activeRoom = useMemo(() => rooms.find(r => r.id === activeRoomId) || null, [rooms, activeRoomId]);

  const handleLeave = () => {
    setActiveRoomId(null);
    setSearchParams({});
  };

  if (activeRoomId && activeRoom) {
    return <OneOnOneRoom roomId={activeRoom.id} roomName={activeRoom.name} onLeave={handleLeave} />;
  }

  if (activeRoomId && !isLoading && !activeRoom) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader><CardTitle>Room not available</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">You weren't invited to this room, or it's no longer active.</p>
            <Button onClick={handleLeave} className="w-full">Back to my rooms</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="mb-2 gap-2"><ArrowLeft className="h-4 w-4" /> Dashboard</Button>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3"><Video className="h-10 w-10 text-primary" /> 1-on-1 Live</h1>
            <p className="text-muted-foreground text-lg">Private rooms you host or were invited to.</p>
          </div>
          <Button onClick={() => navigate('/communications-hub')} size="lg" className="gap-2"><Plus className="h-5 w-5" /> New room</Button>
        </div>

        {isLoading && <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}

        {!isLoading && rooms.length === 0 && (
          <Card className="p-12 text-center">
            <Video className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No private rooms yet</h3>
            <p className="text-muted-foreground mb-6">Create a 1-on-1 from the ChatApp Go-Live launcher and invite a tribe member.</p>
            <Button onClick={() => navigate('/communications-hub')} size="lg">Open launcher</Button>
          </Card>
        )}

        {!isLoading && rooms.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map(room => (
              <Card key={room.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant={room.created_by === user?.id ? 'default' : 'secondary'} className="gap-1">
                      <Users className="h-3 w-3" />
                      {room.created_by === user?.id ? 'Hosting' : 'Invited'}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{room.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 line-clamp-2">{room.description}</p>
                  <Button onClick={() => setSearchParams({ room: room.id })} className="w-full">Open room</Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
