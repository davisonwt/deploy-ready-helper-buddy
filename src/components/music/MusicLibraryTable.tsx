import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Share2, Download, DollarSign, Play, Pause, Edit, ShoppingCart, Gift } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMusicPurchase } from '@/hooks/useMusicPurchase';
import { useGiftBestowal } from '@/hooks/useGiftBestowal';
import { useProductBasket } from '@/contexts/ProductBasketContext';
import { toast } from 'sonner';
import { EditTrackModal } from './EditTrackModal';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrency } from '@/hooks/useCurrency';
import { launchConfetti } from '@/utils/confetti';
import { GradientPlaceholder } from '@/components/ui/GradientPlaceholder';
import { supabase } from '@/integrations/supabase/client';

const PREVIEW_SECONDS = 40;
const PRIVATE_BUCKETS = ['music-tracks', 'dj-music', 'premium-room'];

function extractBucketAndPath(url: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/storage\/v1\/object\/(?:public|authenticated|sign)\/([^/]+)\/(.+)$/);
    if (!m) return null;
    return { bucket: m[1], path: decodeURIComponent(m[2].split('?')[0]) };
  } catch {
    return null;
  }
}

async function resolveAudioUrl(rawUrl: string | null): Promise<string | null> {
  if (!rawUrl) return null;
  if (!rawUrl.startsWith('http')) {
    return supabase.storage.from('music-tracks').getPublicUrl(rawUrl).data.publicUrl;
  }
  const parts = extractBucketAndPath(rawUrl);
  if (!parts || !PRIVATE_BUCKETS.includes(parts.bucket)) return rawUrl;
  const { data } = await supabase.storage.from(parts.bucket).createSignedUrl(parts.path, 60 * 60);
  return data?.signedUrl || rawUrl;
}

interface MusicTrack {
  id: string;
  track_title: string;
  artist_name: string | null;
  duration_seconds: number | null;
  file_url: string;
  preview_url: string | null;
  price: number | null;
  genre: string | null;
  created_at: string;
  dj_id: string;
  wallet_address: string | null;
  product_id?: string | null;
  sower_user_id?: string | null;
  // Profile data from join
  profiles?: {
    username: string | null;
    avatar_url: string | null;
  };
}

interface MusicLibraryTableProps {
  tracks: MusicTrack[];
  showBestowalButton?: boolean;
  showEditButton?: boolean;
  allowSelection?: boolean;
  onTrackSelect?: (track: MusicTrack) => void;
  selectedTracks?: string[];
  highlightedTrackId?: string;
  highlightedProductId?: string;
}

export function MusicLibraryTable({ 
  tracks, 
  showBestowalButton = true,
  showEditButton = false,
  allowSelection = false,
  onTrackSelect,
  selectedTracks = [],
  highlightedTrackId,
  highlightedProductId
}: MusicLibraryTableProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const { addToBasket } = useProductBasket();
  const giftBestowal = useGiftBestowal();
  const musicPurchase = useMusicPurchase();
  const queryClient = useQueryClient();
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [editingTrack, setEditingTrack] = useState<MusicTrack | null>(null);
  const [ownedTrackIds, setOwnedTrackIds] = useState<Set<string>>(new Set());
  
  // Safely extract functions with fallbacks
  const purchaseTrack = musicPurchase?.purchaseTrack || (async () => {});
  const hookProcessing = (musicPurchase as any)?.loading || (musicPurchase as any)?.processing || false;
  const [localProcessing, setLocalProcessing] = useState(false);
  const processing = hookProcessing || localProcessing;

  useEffect(() => {
    if (!highlightedTrackId || tracks.length === 0) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`music-track-${highlightedTrackId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [highlightedTrackId, tracks.length]);

  useEffect(() => {
    let alive = true;
    const loadOwnedTracks = async () => {
      if (!user?.id || tracks.length === 0) {
        setOwnedTrackIds(new Set());
        return;
      }
      const ids = tracks.map((track) => track.id).filter(Boolean);
      const { data, error } = await supabase
        .from('music_purchases')
        .select('track_id')
        .eq('buyer_id', user.id)
        .eq('payment_status', 'completed')
        .in('track_id', ids);
      if (!alive) return;
      if (error) {
        console.warn('Music ownership check failed:', error);
        setOwnedTrackIds(new Set());
        return;
      }
      setOwnedTrackIds(new Set((data || []).map((row: any) => row.track_id)));
    };
    loadOwnedTracks();
    return () => { alive = false; };
  }, [tracks, user?.id]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePreview = async (track: MusicTrack) => {
    if (playingTrack === track.id) {
      audioElement?.pause();
      setPlayingTrack(null);
      return;
    }

    // Stop previous audio
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }

    const audioUrl = await resolveAudioUrl(track.preview_url || track.file_url);
    if (!audioUrl) {
      toast.error('No preview available for this track');
      return;
    }

    // Create new audio element for 40-second preview
    const audio = new Audio(audioUrl);
    audio.volume = 0.7;
    
    // Limit to 40 seconds for preview
    audio.addEventListener('timeupdate', () => {
      if (audio.currentTime >= PREVIEW_SECONDS) {
        audio.pause();
        audio.currentTime = 0;
        setPlayingTrack(null);
        toast.info(`Preview ended. Bestow ${formatAmount(2)} to unlock the full track.`);
      }
    });

    audio.addEventListener('ended', () => {
      setPlayingTrack(null);
    });

    audio.play().catch(() => {
      toast.error('Failed to play preview');
    });

    setAudioElement(audio);
    setPlayingTrack(track.id);
  };

  const handleBestowal = async (track: MusicTrack, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!user) {
      toast.error('Please sign in to make a bestowal');
      return;
    }

    const isPurchased = showEditButton || ownedTrackIds.has(track.id);
    if (isPurchased) {
      toast.info('You already own this track!');
      return;
    }

    try {
      setLocalProcessing(true);
      const price = track.price && track.price >= 2.00 ? track.price : 2.00;
      await purchaseTrack(track.id, price);
      
      // Award XP for music bestowal (100 XP) - use type assertion for RPC
      if (user) {
        try {
          await (supabase.rpc as any)('add_xp_to_current_user', { amount: 100 });
        } catch (err) {
          console.warn('XP award not available:', err);
        }
      }
      
      launchConfetti();
      toast.success('Bestowal completed! You can now download the track.');
    } catch (error: any) {
      console.error('Bestowal error:', error);
      toast.error(error?.message || 'Bestowal failed. Please try again.');
    } finally {
      setLocalProcessing(false);
    }
  };

  const handleBasketBestowal = (track: MusicTrack, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const productId = track.product_id || (track.id === highlightedTrackId ? highlightedProductId : undefined);
    if (!productId) {
      toast.info('Use Direct Bestow for this music seed. Basket checkout needs the product seed record.');
      return;
    }
    const price = track.price && track.price >= 2 ? Number(track.price) : 2;
    addToBasket({
      id: productId,
      title: track.track_title,
      price,
      cover_image_url: (track as any).cover_image_url || undefined,
      sower_id: track.sower_user_id || track.dj_id,
      bestowal_count: 0,
      sowers: { display_name: track.artist_name || track.profiles?.username || 'Sower' },
    });
    launchConfetti();
    toast.success('Music seed added to basket');
    navigate('/products/basket');
  };

  const handleGift = async (track: MusicTrack, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!user) {
      toast.error('Please sign in to gift this sower');
      return;
    }
    if (!track.sower_user_id) {
      toast.error('Sower recipient missing for this track');
      return;
    }
    await giftBestowal.send({
      recipientId: track.sower_user_id,
      amount: 2,
      contextKind: 'chat_tip',
      contextId: track.id,
      provider: 'paypal',
      message: `Freewill gift for ${track.track_title}`,
    });
  };

  const handleFollow = (djId: string) => {
    toast.info('Follow feature coming soon!');
  };

  const handleShare = async (track: MusicTrack, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      const shareData = {
        title: track.track_title,
        text: `Check out ${track.track_title} by ${track.artist_name || 'Unknown Artist'}`,
        url: window.location.href
      };
      
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          toast.success('Shared successfully!');
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            // Fallback to clipboard
            await navigator.clipboard.writeText(window.location.href);
            toast.success('Link copied to clipboard!');
          }
        }
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share');
    }
  };

  const handleDownload = async (track: MusicTrack) => {
    const isPurchased = showEditButton || ownedTrackIds.has(track.id);
    if (!isPurchased && track.price && track.price > 0) {
      toast.error('Please make a bestowal first to download this track');
      return;
    }

    toast.success('Download started!');
    // Implement actual download logic
    window.open(track.file_url, '_blank');
  };

  if (tracks.length === 0) {
    return (
      <Card className="p-8 text-center backdrop-blur-md bg-white/10 border-white/20">
        <p className="text-white/70">No music tracks available yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Edit Track Modal */}
      {editingTrack && (
        <EditTrackModal
          track={editingTrack}
          isOpen={!!editingTrack}
          onClose={() => setEditingTrack(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['my-music'] });
            queryClient.invalidateQueries({ queryKey: ['community-music'] });
          }}
        />
      )}

      {/* Header Row */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-white/80 border-b border-white/20">
        <div className="col-span-4">Track / Artist</div>
        <div className="col-span-2">Genre</div>
        <div className="col-span-1">Duration</div>
        <div className="col-span-1 text-center">Bestowal</div>
        <div className="col-span-4 text-center">Actions</div>
      </div>

      {/* Track Rows */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {tracks.map((track) => {
          const isPurchased = showEditButton || ownedTrackIds.has(track.id);
          const isPlaying = playingTrack === track.id;
          const isSelected = selectedTracks.includes(track.id);
          const isHighlighted = highlightedTrackId === track.id;

          return (
            <Card 
              key={track.id} 
              id={`music-track-${track.id}`}
              className={`p-4 backdrop-blur-md bg-white/10 border-white/20 hover:bg-white/20 transition-all ${allowSelection ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-white/50' : ''} ${isHighlighted ? 'ring-4 ring-yellow-300 bg-yellow-300/20 shadow-2xl shadow-yellow-300/30' : ''}`}
              onClick={() => allowSelection && onTrackSelect?.(track)}
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                {/* Selection Checkbox */}
                {allowSelection && (
                  <div className="col-span-1 flex justify-center">
                    <div 
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTrackSelect?.(track);
                      }}
                    >
                      {isSelected && (
                        <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                )}

                {/* Track Info */}
                <div className={`${allowSelection ? 'col-span-3' : 'col-span-4'} flex items-center gap-3`}>
                  {/* Cover Image / Album Art */}
                  <div className="relative h-12 w-12 flex-shrink-0 rounded overflow-hidden">
                    {(track as any).cover_image_url ? (
                      <img
                        src={(track as any).cover_image_url}
                        alt={track.track_title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Replace with placeholder on error
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : null}
                    {!(track as any).cover_image_url && (
                      <GradientPlaceholder 
                        type="music" 
                        title={track.track_title}
                        className="w-full h-full"
                        size="sm"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate text-white">
                      {track.track_title}
                    </p>
                    <p className="text-sm text-white/70 truncate">
                      lyrist: {track.artist_name || track.profiles?.username || 'Unknown Artist'}
                    </p>
                  </div>
                </div>

                {/* Genre */}
                <div className="col-span-2">
                  <Badge variant="outline" className="text-xs bg-white/20 border-white/30 text-white">
                    {track.genre || 'Unspecified'}
                  </Badge>
                </div>

                {/* Duration */}
                <div className="col-span-1 text-sm text-white">
                  {formatDuration(track.duration_seconds)}
                </div>

                {/* Bestow */}
                <div className="col-span-1 text-center">
                  <Badge className="bg-purple-500/30 text-white border-purple-400/50">
                    {formatAmount(2)}
                  </Badge>
                </div>

                {/* Actions */}
                <div className="col-span-4 flex items-center justify-end gap-2">
                  {showEditButton && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTrack(track);
                      }}
                      className="h-8 gap-1 border-white/30 text-white hover:bg-white/20"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreview(track);
                    }}
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFollow(track.dj_id);
                    }}
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  >
                    <Heart className="h-4 w-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleShare(track, e);
                    }}
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(track);
                    }}
                    className="h-8 w-8 p-0 text-white hover:bg-white/20"
                    disabled={!isPurchased && track.price && track.price > 0}
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  {showBestowalButton && !isPurchased && (
                    <>
                      <Button
                        size="sm"
                        onClick={(e) => handleBasketBestowal(track, e)}
                        disabled={processing}
                        className="h-8 w-8 p-0 text-white bg-emerald-500/80 hover:bg-emerald-500"
                        title="Bestow via basket"
                      >
                        <ShoppingCart className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleBestowal(track, e);
                        }}
                        disabled={processing}
                        className="h-8 gap-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                      >
                        <DollarSign className="h-3 w-3" />
                        Direct
                      </Button>
                      <Button
                        size="sm"
                        onClick={(e) => handleGift(track, e)}
                        disabled={giftBestowal.loading}
                        className="h-8 w-8 p-0 text-white bg-amber-500/80 hover:bg-amber-500"
                        title="Gift this sower"
                      >
                        <Gift className="h-3 w-3" />
                      </Button>
                    </>
                  )}

                  {isPurchased && (
                    <Badge variant="secondary" className="h-8 px-2 bg-green-500/30 text-white border-green-400/50">
                      Owned
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
