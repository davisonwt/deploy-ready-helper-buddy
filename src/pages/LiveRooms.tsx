import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Radio, Lock, Loader2, Search, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCryptoPay } from '@/hooks/useCryptoPay';
import { toast } from 'sonner';

export default function LiveRooms() {
  const [searchQuery, setSearchQuery] = useState('');
  const { processing } = useCryptoPay();
  const queryClient = useQueryClient();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['live-rooms', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('chat_rooms')
        .select('*')
        .eq('is_active', true)
        .order('current_listeners', { ascending: false });

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel('live-rooms-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_rooms',
          filter: 'is_active=eq.true',
        },
        () => {
          // Invalidate and refetch instead of full page reload
          queryClient.invalidateQueries({ queryKey: ['live-rooms'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const handleJoinRoom = async (room: any) => {
    if (!room.is_free) {
      // Check if already paid
      const { data: purchased } = await supabase
        .from('bestowals')
        .select('id')
        .eq('orchard_id', room.orchard_id)
        .eq('bestower_id', (await supabase.auth.getUser()).data.user?.id)
        .gte('amount', room.required_bestowal_amount)
        .single();

      if (!purchased) {
        toast.error('Payment required to join this room');
        // TODO: Implement payment flow
        return;
      }
    }

    // Check capacity
    if (room.max_capacity && room.current_listeners >= room.max_capacity) {
      toast.error('Room is full');
      return;
    }

    toast.success('Joining room...');
    // TODO: Implement actual join logic
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Live Rooms</h1>
        <p className="text-muted-foreground">
          Join live audio sessions happening now or coming soon
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : rooms?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Radio className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No live rooms available</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rooms?.map((room: any) => (
            <Card key={room.id} className="border-primary/10 hover:border-primary/30 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-xl">{room.name}</CardTitle>
                      {room.status === 'live' && (
                        <Badge variant="default" className="bg-green-600 animate-pulse">
                          <Radio className="h-3 w-3 mr-1" />
                          Live Now
                        </Badge>
                      )}
                      {room.status === 'upcoming' && (
                        <Badge variant="secondary">Starts Soon</Badge>
                      )}
                    </div>
                    <CardDescription className="line-clamp-2">
                      {room.description}
                    </CardDescription>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {room.current_listeners} listening
                      </span>
                      {room.max_capacity && (
                        <span>Capacity: {room.current_listeners}/{room.max_capacity}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 items-end">
                    {room.is_free ? (
                      <Badge variant="default" className="bg-green-600">
                        Free
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        {room.required_bestowal_amount} USDC
                      </Badge>
                    )}
                    
                    <Button
                      onClick={() => handleJoinRoom(room)}
                      disabled={processing || (room.max_capacity && room.current_listeners >= room.max_capacity)}
                      size="sm"
                      variant={room.is_free ? 'default' : 'destructive'}
                      className="gap-2"
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : room.is_free ? (
                        <Radio className="h-4 w-4" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                      {room.is_free ? 'Join Free' : `Join for ${room.required_bestowal_amount} USDC`}
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
