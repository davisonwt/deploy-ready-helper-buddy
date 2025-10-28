import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Music, ShoppingCart, Loader2 } from 'lucide-react';
import { AudioSnippetPlayer } from '@/components/radio/AudioSnippetPlayer';
import { useCryptoPay } from '@/hooks/useCryptoPay';
import { toast } from 'sonner';

export default function SowerProfile() {
  const { id } = useParams<{ id: string }>();
  const { buySong, processing, connected, connectWallet } = useCryptoPay();

  const { data: sower, isLoading: loadingSower } = useQuery({
    queryKey: ['sower', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('radio_djs')
        .select('*, profiles!inner(*)')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: songs, isLoading: loadingSongs } = useQuery({
    queryKey: ['sower-songs', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dj_music_tracks')
        .select('id, dj_id, track_title, duration_seconds, file_url, file_size, price, is_original, is_public, created_at')
        .eq('dj_id', id)
        .eq('is_original', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const handleBuySong = async (track: any) => {
    if (!connected) {
      await connectWallet();
      return;
    }

    await buySong(track);
  };

  if (loadingSower) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="mb-8 border-primary/20">
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={sower?.avatar_url} />
            <AvatarFallback className="bg-primary/10 text-primary">
              <Music className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-2xl">{sower?.dj_name}</CardTitle>
            <CardDescription>{sower?.bio || 'Original music creator'}</CardDescription>
            <Badge variant="secondary" className="mt-2">
              {songs?.length || 0} Original Tracks
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Available Tracks</h2>
        
        {loadingSongs ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : songs?.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Music className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No tracks available yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {songs?.map((track) => (
              <Card key={track.id} className="border-primary/10 hover:border-primary/30 transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{track.track_title}</CardTitle>
                      <CardDescription>
                        Original Track
                      </CardDescription>
                    </div>
                    <Badge variant="default" className="bg-green-600">
                      {track.price} USDC
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <AudioSnippetPlayer 
                    fileUrl={track.file_url} 
                    duration={Math.min(30, track.duration_seconds || 30)}
                  />

                  <Button 
                    onClick={() => handleBuySong(track)}
                    disabled={processing}
                    className="w-full gap-2"
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-4 w-4" />
                    )}
                    Buy Song
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
