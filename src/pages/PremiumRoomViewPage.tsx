import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/hooks/useCurrency';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Users, Music, FileText, Image as ImageIcon, Download, Play, Pause, ShoppingCart, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { PremiumItemPurchaseModal } from '@/components/premium/PremiumItemPurchaseModal';
import { RoomAccessModal } from '@/components/premium/RoomAccessModal';

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
  profiles?: {
    display_name: string;
    avatar_url: string;
  };
}

const PremiumRoomViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const [room, setRoom] = React.useState<PremiumRoom | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [hasAccess, setHasAccess] = React.useState(false);
  const [playingTrack, setPlayingTrack] = React.useState<string | null>(null);
  const [purchaseItem, setPurchaseItem] = React.useState<{ item: any; type: 'music' | 'document' | 'artwork' } | null>(null);
  const [showAccessModal, setShowAccessModal] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Resolve a playable URL for stored files or direct URLs
  const inferCandidates = (input: string) => {
    const candidates: string[] = [];
    try {
      const u = new URL(input);
      const marker = '/storage/v1/object/';
      const idx = u.pathname.indexOf(marker);
      if (idx !== -1) {
        const after = u.pathname.substring(idx + marker.length);
        const parts = after.split('/');
        const bucketIndex = parts[0] === 'public' ? 1 : 0;
        if (parts[bucketIndex]) {
          const key = decodeURIComponent(parts.slice(bucketIndex + 1).join('/'));
          if (key) candidates.push(key);
        }
      }
      const fname = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '');
      if (fname) candidates.push(`music/${fname}`);
    } catch {
      const stripped = (input || '').replace(/^\/*/, '').replace(/^public\//, '');
      candidates.push(stripped);
    }
    return Array.from(new Set(candidates.filter(Boolean)));
  };

  const getPlayableUrl = async (track: any): Promise<string> => {
    const src: string = track?.url || track?.file_url || '';
    if (src && /^https?:/i.test(src)) return src;
    try {
      const candidates = inferCandidates(src);
      for (const cand of candidates) {
        const { data, error } = await supabase.storage.from('music-tracks').createSignedUrl(cand, 3600);
        if (!error && data?.signedUrl) return data.signedUrl;
      }
      if (candidates[0]) {
        const { data } = supabase.storage.from('music-tracks').getPublicUrl(candidates[0]);
        if (data?.publicUrl) return data.publicUrl;
      }
    } catch {}
    return src;
  };

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

        // Fetch creator profile separately
        const { data: profileData } = await supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('user_id', data.creator_id)
          .maybeSingle();
        
        if (profileData) {
          (data as any).profiles = profileData;
        }

        setRoom(data as PremiumRoom);

        // Check if user has access
        if (user) {
          if (data.creator_id === user.id) {
            setHasAccess(true);
          } else if (data.price === 0) {
            setHasAccess(true);
          } else {
            const { data: accessData } = await supabase
              .from('premium_room_access')
              .select('id')
              .eq('room_id', id)
              .eq('user_id', user.id)
              .maybeSingle();
            
            setHasAccess(!!accessData);
          }
        }
      } catch (error: any) {
        console.error('Error fetching room:', error);
        toast.error('Failed to load room');
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [id, user]);

  const handlePlayTrack = async (track: any) => {
    if (!hasAccess && track.price > 0) {
      setPurchaseItem({ item: track, type: 'music' });
      return;
    }

    if (playingTrack === track.id) {
      audioRef.current?.pause();
      setPlayingTrack(null);
    } else {
      try {
        const url = await getPlayableUrl(track);
        if (audioRef.current) {
          audioRef.current.src = url;
          await audioRef.current.play();
        }
        setPlayingTrack(track.id);
      } catch (e) {
        console.error('Audio play failed', e);
        toast.error('Unable to play this track');
        setPlayingTrack(null);
      }
    }
  };

  const handleJoinRoom = () => {
    if (!hasAccess) {
      setShowAccessModal(true);
    } else {
      toast.success('You already have access to this room');
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

  const isCreator = user?.id === room.creator_id;

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <audio ref={audioRef} onEnded={() => setPlayingTrack(null)} />
      
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
              {isCreator && <Badge variant="default" className="gap-1"><Crown className="h-3 w-3" />Creator</Badge>}
            </div>
            <p className="text-muted-foreground mb-4">{room.description}</p>
            
            {/* Creator Info */}
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={room.profiles?.avatar_url} />
                <AvatarFallback>{room.profiles?.display_name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">Created by {room.profiles?.display_name || 'Unknown'}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(room.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold mb-1">
              {room.price > 0 ? formatAmount(room.price) : 'Free'}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Max {room.max_participants} participants</span>
            </div>
            {hasAccess && (
              <Badge variant="outline" className="mt-2">Access Granted</Badge>
            )}
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
                            {track.price > 0 && <span>{formatAmount(track.price)}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {track.price > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPurchaseItem({ item: track, type: 'music' })}
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant={playingTrack === track.id ? "default" : "outline"}
                            onClick={() => handlePlayTrack(track)}
                            disabled={!hasAccess && track.price > 0}
                          >
                            {playingTrack === track.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </Button>
                        </div>
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
                            {doc.price > 0 && <span>{formatAmount(doc.price)}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {doc.price > 0 && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => setPurchaseItem({ item: doc, type: 'document' })}
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                          )}
                          {(hasAccess || doc.price === 0) && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={doc.url} download={doc.name}>
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
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
                            {art.price > 0 && <span>{formatAmount(art.price)}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {art.price > 0 && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => setPurchaseItem({ item: art, type: 'artwork' })}
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                          )}
                          {(hasAccess || art.price === 0) && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={art.url} download={art.name}>
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
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
                <h3 className="text-lg font-semibold mb-1">
                  {hasAccess ? 'You have access to this room' : 'Ready to join?'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {hasAccess 
                    ? 'You can access all room content'
                    : room.price > 0 
                      ? `Access all content for ${formatAmount(room.price)}` 
                      : 'This room is free to access'
                  }
                </p>
              </div>
              <Button size="lg" onClick={handleJoinRoom}>
                {room.price > 0 && !hasAccess ? 'Purchase Access' : 'Join Room'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Modals */}
      {purchaseItem && (
        <PremiumItemPurchaseModal
          open={!!purchaseItem}
          onOpenChange={(open) => !open && setPurchaseItem(null)}
          item={purchaseItem.item}
          itemType={purchaseItem.type}
          roomId={room.id}
          onPurchaseComplete={() => {
            toast.success('Item purchased successfully!');
            setPurchaseItem(null);
          }}
        />
      )}

      <RoomAccessModal
        open={showAccessModal}
        onOpenChange={setShowAccessModal}
        room={room}
        onAccessGranted={() => {
          setHasAccess(true);
          setShowAccessModal(false);
        }}
      />
    </div>
  );
};

export default PremiumRoomViewPage;
