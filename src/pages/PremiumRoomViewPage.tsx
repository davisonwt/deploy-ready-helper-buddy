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
  const [purchasedItems, setPurchasedItems] = React.useState<Set<string>>(new Set());
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [audioUnlocked, setAudioUnlocked] = React.useState(false);

  const resumeGlobalAudio = async () => {
    try {
      const w = window as any;
      let ctx: AudioContext | undefined = w.__unlockedAudioCtx;
      const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!ctx && Ctx) {
        ctx = new Ctx();
        w.__unlockedAudioCtx = ctx;
      }
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume().catch(() => {});
      }
      try { sessionStorage.setItem('audioUnlocked', '1'); } catch {}
      setAudioUnlocked(true);
    } catch {}
  };

  React.useEffect(() => {
    const check = () => {
      try {
        const w = window as any;
        const ctx: AudioContext | undefined = w.__unlockedAudioCtx;
        const unlockedFlag = sessionStorage.getItem('audioUnlocked') === '1';
        setAudioUnlocked(Boolean(unlockedFlag || (ctx && ctx.state === 'running')));
      } catch { setAudioUnlocked(false); }
    };
    check();
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, []);

  // Resolve a playable URL for stored files or direct URLs
  type StorageCandidate = { bucket: string; key: string };

  const parseStorageFromUrl = (input: string): StorageCandidate[] => {
    const out: StorageCandidate[] = [];
    try {
      const u = new URL(input);
      const marker = '/storage/v1/object/';
      const idx = u.pathname.indexOf(marker);
      if (idx !== -1) {
        const after = u.pathname.substring(idx + marker.length);
        const parts = after.split('/').filter(Boolean);
        // URL patterns:
        // - /storage/v1/object/public/<bucket>/<key>
        // - /storage/v1/object/sign/<bucket>/<key>
        const mode = parts[0];
        const bucket = mode === 'public' || mode === 'sign' ? parts[1] : parts[0];
        const keyStart = mode === 'public' || mode === 'sign' ? 2 : 1;
        const key = decodeURIComponent(parts.slice(keyStart).join('/'));
        if (bucket && key) out.push({ bucket, key });
      }
    } catch {
      // Not a full URL
    }
    return out;
  };

  const inferCandidates = (input: string, filenameHint?: string): StorageCandidate[] => {
    const candidates: StorageCandidate[] = [];
    if (!input && !filenameHint) return candidates;

    // From full Supabase URL
    candidates.push(...parseStorageFromUrl(input || ''));

    // If plain storage-like path provided
    const raw = (input || '').replace(/^\/*/, '');
    if (raw.startsWith('premium-room/')) {
      candidates.push({ bucket: 'premium-room', key: raw.replace(/^premium-room\//, '') });
    } else if (raw.startsWith('music-tracks/')) {
      candidates.push({ bucket: 'music-tracks', key: raw.replace(/^music-tracks\//, '') });
    } else if (raw) {
      // Try common folder layouts
      candidates.push({ bucket: 'premium-room', key: raw });
      candidates.push({ bucket: 'music-tracks', key: raw });
    }

    // Try filename-based guesses (room-scoped and flat music folder)
    const fname = filenameHint || decodeURIComponent(raw.split('/').filter(Boolean).pop() || '');
    if (fname) {
      // Room-scoped path (most likely for premium rooms)
      if (room?.id) {
        candidates.push({ bucket: 'premium-room', key: `rooms/${room.id}/music/${fname}` });
      }
      // Legacy/simple paths
      candidates.push({ bucket: 'premium-room', key: `music/${fname}` });
      candidates.push({ bucket: 'music-tracks', key: `music/${fname}` });
      candidates.push({ bucket: 'music-tracks', key: fname });
    }

    // De-duplicate
    const seen = new Set<string>();
    return candidates.filter(c => {
      const k = `${c.bucket}:${c.key}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  const getPlayableUrl = async (track: any): Promise<string> => {
    const src: string = track?.url || track?.file_url || track?.public_url || '';
    // If it's a local blob/data URL or a non-signed external HTTP URL, use it directly
    if (src && (/^blob:/.test(src) || /^data:/.test(src))) return src;
    if (src && /^https?:\/\//i.test(src) && !src.includes('/storage/v1/object/sign/')) return src;

    try {
      const filename = track?.name || track?.filename || '';
      const candidates = inferCandidates(src, filename).filter(c => !/^blob:/i.test(c.key));

      // Try signed URLs first (works for private buckets)
      for (const cand of candidates) {
        const { data, error } = await supabase.storage.from(cand.bucket).createSignedUrl(cand.key, 3600);
        if (!error && data?.signedUrl) return data.signedUrl;
      }

      // Fallback to public URLs if bucket/object is public
      for (const cand of candidates) {
        const { data } = supabase.storage.from(cand.bucket).getPublicUrl(cand.key);
        if (data?.publicUrl) return data.publicUrl;
      }
    } catch (e) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Playable URL resolution failed', e);
      }
    }

    // Last resort, return whatever we had
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

          // Fetch purchased items
          const { data: purchases } = await supabase
            .from('premium_item_purchases')
            .select('item_id')
            .eq('room_id', id)
            .eq('buyer_id', user.id);
          
          if (purchases) {
            setPurchasedItems(new Set(purchases.map(p => p.item_id)));
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
    // Check if user has access or has purchased this specific item
    const hasPurchased = purchasedItems.has(track.id);
    if (!hasAccess && !hasPurchased && track.price > 0) {
      setPurchaseItem({ item: track, type: 'music' });
      return;
    }

    if (playingTrack === track.id) {
      audioRef.current?.pause();
      setPlayingTrack(null);
    } else {
      try {
        const url = await getPlayableUrl(track);
        console.log('Resolved playable URL for track', { trackId: track.id, url });
        if (audioRef.current) {
          await resumeGlobalAudio();
          const el = audioRef.current;
          el.muted = false;
          el.volume = 1.0;
          el.src = url;
          el.load();
          try {
            await el.play();
          } catch (err) {
            // Retry once after ensuring context is resumed
            await resumeGlobalAudio();
            await el.play();
          }
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
      <audio ref={audioRef} controls preload="metadata" playsInline onEnded={() => setPlayingTrack(null)} onError={(e) => { const el = e.currentTarget; console.error('Audio element error:', el.error); toast.error('Audio failed to load'); setPlayingTrack(null); }} crossOrigin="anonymous" />
      {!audioUnlocked && (
        <div className="mt-2 mb-4">
          <Button variant="outline" onClick={resumeGlobalAudio}>Enable Sound</Button>
        </div>
      )}
      
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
          
          {isCreator && (
            <Button asChild variant="outline" className="ml-4">
              <Link to={`/premium-room/${room.id}/edit`}>Edit Room</Link>
            </Button>
          )}
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
                          {track.price > 0 && !hasAccess && !purchasedItems.has(track.id) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPurchaseItem({ item: track, type: 'music' })}
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                          )}
                          {(hasAccess || purchasedItems.has(track.id) || track.price === 0) && (
                            <Badge variant="outline" className="text-xs">
                              {purchasedItems.has(track.id) ? 'Owned' : 'Included'}
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant={playingTrack === track.id ? "default" : "outline"}
                            onClick={() => handlePlayTrack(track)}
                            disabled={!hasAccess && !purchasedItems.has(track.id) && track.price > 0}
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
                          {doc.price > 0 && !hasAccess && !purchasedItems.has(doc.id) && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => setPurchaseItem({ item: doc, type: 'document' })}
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                          )}
                          {(hasAccess || purchasedItems.has(doc.id) || doc.price === 0) && (
                            <>
                              {purchasedItems.has(doc.id) && (
                                <Badge variant="outline" className="text-xs">Owned</Badge>
                              )}
                              <Button size="sm" variant="outline" asChild>
                                <a href={doc.url} download={doc.name}>
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            </>
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
                          {art.price > 0 && !hasAccess && !purchasedItems.has(art.id) && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => setPurchaseItem({ item: art, type: 'artwork' })}
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                          )}
                          {(hasAccess || purchasedItems.has(art.id) || art.price === 0) && (
                            <>
                              {purchasedItems.has(art.id) && (
                                <Badge variant="outline" className="text-xs">Owned</Badge>
                              )}
                              <Button size="sm" variant="outline" asChild>
                                <a href={art.url} download={art.name}>
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            </>
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
              {hasAccess ? (
                <Badge variant="outline" className="px-4 py-2">Access Granted</Badge>
              ) : (
                <Button size="lg" onClick={handleJoinRoom}>
                  {room.price > 0 ? 'Purchase Access' : 'Join Room'}
                </Button>
              )}
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
          onPurchaseComplete={async (paymentRef) => {
            try {
              // Record the purchase
              const { error } = await supabase
                .from('premium_item_purchases')
                .insert({
                  room_id: room.id,
                  item_id: purchaseItem.item.id,
                  item_type: purchaseItem.type,
                  buyer_id: user!.id,
                  amount: purchaseItem.item.price,
                  payment_status: 'completed'
                });

              if (error) throw error;

              // Update local purchased items set
              setPurchasedItems(prev => new Set([...prev, purchaseItem.item.id]));
              
              toast.success('Item purchased successfully! You can now access it.');
              setPurchaseItem(null);
            } catch (error: any) {
              console.error('Failed to record purchase:', error);
              toast.error('Purchase completed but failed to record. Please contact support.');
            }
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
