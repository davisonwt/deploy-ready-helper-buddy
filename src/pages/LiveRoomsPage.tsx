import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Video, Users, Search, Plus, Radio } from 'lucide-react';
import JitsiRoom from '@/components/jitsi/JitsiRoom';

interface LiveRoom {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_active: boolean;
  current_participants: number;
  max_participants: number;
  created_by: string;
  created_at: string;
}

export default function LiveRoomsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch live rooms
  const { data: rooms, isLoading } = useQuery({
    queryKey: ['live-rooms', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('live_rooms')
        .select('*')
        .eq('is_active', true)
        .order('current_participants', { ascending: false });

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LiveRoom[];
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const handleJoinRoom = (roomSlug: string) => {
    if (!displayName.trim()) {
      toast({
        title: 'Display name required',
        description: 'Please enter a display name to join the room',
        variant: 'destructive',
      });
      return;
    }
    setActiveRoom(roomSlug);
  };

  const handleLeaveRoom = () => {
    setActiveRoom(null);
  };

  const handleCreateRoom = () => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please login to create a live room',
        variant: 'destructive',
      });
      navigate('/login');
      return;
    }
    navigate('/create-live-room');
  };

  // If user is in a room, show the Jitsi interface
  if (activeRoom) {
    return <JitsiRoom roomName={activeRoom} displayName={displayName} onLeave={handleLeaveRoom} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <Video className="h-10 w-10 text-primary" />
                Live Video Rooms
              </h1>
              <p className="text-muted-foreground text-lg">
                Join live video conversations with people around the world
              </p>
            </div>
            <Button onClick={handleCreateRoom} size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Create Room
            </Button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search live rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 text-lg h-12"
            />
          </div>
        </div>

        {/* Display Name Input (if not logged in) */}
        {!user && (
          <Card className="mb-6 border-primary/20">
            <CardHeader>
              <CardTitle>Enter Your Name</CardTitle>
              <CardDescription>Choose a display name to join rooms</CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Your display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="max-w-md"
              />
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {/* No Rooms */}
        {!isLoading && (!rooms || rooms.length === 0) && (
          <Card className="p-12 text-center">
            <Radio className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No live rooms available</h3>
            <p className="text-muted-foreground mb-6">Be the first to create a live video room!</p>
            <Button onClick={handleCreateRoom} size="lg">
              Create First Room
            </Button>
          </Card>
        )}

        {/* Rooms Grid */}
        {!isLoading && rooms && rooms.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <Card key={room.id} className="hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="default" className="gap-1">
                      <Radio className="h-3 w-3 animate-pulse" />
                      LIVE
                    </Badge>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>
                        {room.current_participants}/{room.max_participants}
                      </span>
                    </div>
                  </div>
                  <CardTitle className="text-xl">{room.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 line-clamp-2">{room.description}</p>
                  <Button
                    onClick={() => handleJoinRoom(room.slug)}
                    disabled={room.current_participants >= room.max_participants || (!user && !displayName)}
                    className="w-full"
                  >
                    {room.current_participants >= room.max_participants ? 'Room Full' : 'Join Room'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
