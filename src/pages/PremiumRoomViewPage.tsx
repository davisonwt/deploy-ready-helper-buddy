import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Users, Music, FileText, Image as ImageIcon, Download, Play } from 'lucide-react';
import { toast } from 'sonner';

interface PremiumRoom {
  id: string;
  title: string;
  description: string;
  room_type: string;
  max_participants: number;
  price: number;
  is_public: boolean;
  creator_id: string;
  created_at: string;
  documents: any[];
  artwork: any[];
  music: any[];
}

const PremiumRoomViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [room, setRoom] = React.useState<PremiumRoom | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [playingTrack, setPlayingTrack] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchRoom = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('premium_rooms')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        
        if (!data) {
          toast.error('Room not found');
          return;
        }

        setRoom(data as PremiumRoom);
      } catch (error: any) {
        console.error('Error fetching room:', error);
        toast.error('Failed to load room');
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [id]);

  const handlePlayTrack = (trackId: string) => {
    if (playingTrack === trackId) {
      setPlayingTrack(null);
    } else {
      setPlayingTrack(trackId);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading room...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <h2 className="text-2xl font-bold">Room not found</h2>
            <p className="text-muted-foreground">This premium room doesn't exist or has been removed.</p>
            <Button asChild>
              <Link to="/premium-rooms">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Rooms
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/premium-rooms">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Rooms
          </Link>
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{room.title}</h1>
              <Badge variant="secondary">{room.room_type}</Badge>
            </div>
            <p className="text-muted-foreground">{room.description}</p>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold mb-1">
              {room.price > 0 ? `$${room.price}` : 'Free'}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Max {room.max_participants} participants</span>
            </div>
          </div>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Music Tracks */}
        {room.music && room.music.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5" />
                Music Tracks ({room.music.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {room.music.map((track: any) => (
                    <Card key={track.id} className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{track.name}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{(track.size / 1024 / 1024).toFixed(2)} MB</span>
                            {track.price > 0 && <span>${track.price}</span>}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={playingTrack === track.id ? "default" : "outline"}
                          onClick={() => handlePlayTrack(track.id)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Documents */}
        {room.documents && room.documents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents ({room.documents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {room.documents.map((doc: any) => (
                    <Card key={doc.id} className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{doc.name}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{(doc.size / 1024 / 1024).toFixed(2)} MB</span>
                            {doc.price > 0 && <span>${doc.price}</span>}
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Artwork */}
        {room.artwork && room.artwork.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Artwork ({room.artwork.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {room.artwork.map((art: any) => (
                    <Card key={art.id} className="p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{art.name}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{(art.size / 1024 / 1024).toFixed(2)} MB</span>
                            {art.price > 0 && <span>${art.price}</span>}
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Join Room Section */}
        <Card className="lg:col-span-2">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Ready to join?</h3>
                <p className="text-sm text-muted-foreground">
                  {room.price > 0 
                    ? `Access all content for $${room.price}` 
                    : 'This room is free to access'}
                </p>
              </div>
              <Button size="lg">
                {room.price > 0 ? 'Purchase Access' : 'Join Room'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PremiumRoomViewPage;
