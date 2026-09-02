import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Share2, Download, DollarSign, Play, Pause, Loader2, Edit, Gift } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMusicPurchase } from '@/hooks/useMusicPurchase';
import { useGiftBestowal } from '@/hooks/useGiftBestowal';
import { useProductBasket } from '@/contexts/ProductBasketContext';
import { toast } from 'sonner';
import { EditTrackModal } from './EditTrackModal';
import { ConfirmBestowModal } from '@/components/payments/ConfirmBestowModal';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrency } from '@/hooks/useCurrency';
import { launchConfetti } from '@/utils/confetti';
import { GradientPlaceholder } from '@/components/ui/GradientPlaceholder';
import { supabase } from '@/integrations/supabase/client';
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer';
import {
  startPreviewPlayback,
  stopPreviewPlayback,
  subscribeToPreviewPlayback,
  getCurrentlyPlayingId,
} from '@/lib/media/previewPlaybackStore';
import { PREVIEW_SECONDS } from '@/lib/media/previewLength';

const PRIVATE_BUCKETS = ['music-tracks', 'dj-music', 'premium-room', 'orchard-images', 'seed-previews'];
const PRIVATE_COVER_BUCKETS = new Set(['music-tracks', 'dj-music', 'premium-room']);

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
    // Stored as a bucket-relative path; music buckets are private -> sign it.
    const { data } = await supabase.storage.from('music-tracks').createSignedUrl(rawUrl, 60 * 60);
    return data?.signedUrl || supabase.storage.from('music-tracks').getPublicUrl(rawUrl).data.publicUrl;
  }
  const parts = extractBucketAndPath(rawUrl);
  if (!parts || !PRIVATE_BUCKETS.includes(parts.bucket)) return rawUrl;
  const { data } = await supabase.storage.from(parts.bucket).createSignedUrl(parts.path, 60 * 60);
  return data?.signedUrl || rawUrl;
}


function SignedCover({ src, alt }: { src: string; alt: string }) {
  const [resolved, setResolved] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    setFailed(false);
    if (!src) { setResolved(null); return; }
    if (src.startsWith('/__l5e/') || src.startsWith('/assets/') || src.startsWith('data:') || src.startsWith('blob:')) {
      setResolved(src);
      return () => { alive = false; };
    }
    if (!src.startsWith('http')) {
      supabase.storage.from('music-tracks').createSignedUrl(src, 60 * 60 * 6)
        .then(({ data }) => { if (alive) setResolved(data?.signedUrl || null); });
      return () => { alive = false; };
    }
    const parts = extractBucketAndPath(src);
    if (!parts || !PRIVATE_COVER_BUCKETS.has(parts.bucket)) {
      setResolved(src);
      return () => { alive = false; };
    }
    supabase.storage.from(parts.bucket).createSignedUrl(parts.path, 60 * 60 * 6)
      .then(({ data }) => { if (alive) setResolved(data?.signedUrl || null); });
    return () => { alive = false; };
  }, [src]);
  if (!resolved || failed) {
    return (
      <GradientPlaceholder
        type="music"
        title={alt}
        className="w-full h-full"
        size="sm"
      />
    );
  }
  return (
    <img
      src={resolved}
      alt={alt}
      className="w-full h-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

/**
 * Play/pause icon button for one row. Product-sourced tracks (a real
 * products.preview_url + product_id) go through the shared usePreviewPlayer
 * hook, same as every other seed card — owner/buyer upgrades to the full
 * file via get-seed-file on click. dj_music_tracks rows keep their
 * pre-existing signed-URL-then-cap-at-40s behavior (that table has no
 * get-seed-file/entitlement concept here), but now route through the same
 * previewPlaybackStore singleton so starting one stops whatever else on the
 * page — including a ProductCard preview — was playing.
 */
function TrackPreviewButton({ track, formatAmount }: { track: MusicTrack; formatAmount: (n: number) => string }) {
  const isProductTrack = track.source_type === 'product' && !!track.product_id;
  const player = usePreviewPlayer({
    id: track.id,
    previewUrl: isProductTrack ? (track.preview_url ?? null) : null,
    productId: isProductTrack ? track.product_id! : undefined,
  });

  const [djPlaying, setDjPlaying] = useState(() => getCurrentlyPlayingId() === track.id);
  const [djLoading, setDjLoading] = useState(false);

  useEffect(() => {
    if (isProductTrack) return;
    return subscribeToPreviewPlayback((id) => setDjPlaying(id === track.id));
  }, [isProductTrack, track.id]);

  useEffect(() => () => { if (!isProductTrack) stopPreviewPlayback(track.id); }, [isProductTrack, track.id]);

  const toggleDjPreview = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (djPlaying) {
      stopPreviewPlayback(track.id);
      return;
    }
    setDjLoading(true);
    const url = await resolveAudioUrl(track.preview_url || track.file_url);
    setDjLoading(false);
    if (!url) {
      toast.error('No preview available for this track');
      return;
    }
    startPreviewPlayback(track.id, url, {
      onProgress: (_fraction, currentTime) => {
        if (currentTime >= PREVIEW_SECONDS) {
          stopPreviewPlayback(track.id);
          toast.info(`Preview ended. Bestow ${formatAmount(2)} to unlock the full track.`);
        }
      },
      onError: () => toast.error('Failed to play preview'),
    });
  };

  if (isProductTrack) {
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={player.toggle}
        className="h-8 w-8 p-0 text-white hover:bg-white/20"
      >
        {player.isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : player.isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={toggleDjPreview}
      className="h-8 w-8 p-0 text-white hover:bg-white/20"
    >
      {djLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : djPlaying ? (
        <Pause className="h-4 w-4" />
      ) : (
        <Play className="h-4 w-4" />
      )}
    </Button>
  );
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
  wallet_address?: string | null;
  product_id?: string | null;
  sower_id?: string | null;
  sower_user_id?: string | null;
  source_type?: string;
  cover_image_url?: string | null;
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
  const [editingTrack, setEditingTrack] = useState<MusicTrack | null>(null);
  const [ownedTrackIds, setOwnedTrackIds] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{ track: MusicTrack; kind: 'bestow' | 'gift' } | null>(null);
  
  // Safely extract functions with fallbacks
  const purchaseTrack = musicPurchase?.purchaseTrack || (async () => {});
  const hookProcessing = (musicPurchase as any)?.loading || (musicPurchase as any)?.processing || false;
  const [localProcessing, setLocalProcessing] = useState(false);
  const processing = hookProcessing || localProcessing;

  useEffect(() => {
    const targetId = highlightedTrackId || highlightedProductId;
    if (!targetId || tracks.length === 0) return;
    const timer = window.setTimeout(() => {
      document.getElementById(`music-track-${targetId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [highlightedTrackId, highlightedProductId, tracks.length]);

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

    if (track.source_type === 'product' || track.product_id) {
      handleBasketBestowal(track, e);
      return;
    }

    setConfirmAction({ track, kind: 'bestow' });
  };

  const handleBasketBestowal = (track: MusicTrack, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const productId = track.product_id || (track.id === highlightedTrackId ? highlightedProductId : undefined);
    if (!productId) {
      toast.info('Use Direct Bestow for this music seed. Basket checkout needs the product seed record.');
      return;
    }
    // Store the sower's price in the basket. Checkout adds Sow2Grow's 15% on
    // top, keeping the base and platform fee visible as separate amounts.
    const price = Number(track.price) || 0;
    addToBasket({
      id: productId,
      title: track.track_title,
      price,
      type: 'music',
      cover_image_url: (track as any).cover_image_url || undefined,
      sower_id: track.sower_id || track.sower_user_id || track.dj_id,
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
    setConfirmAction({ track, kind: 'gift' });
  };

  const confirmActionWithProvider = async (provider: 'nowpayments' | 'paypal') => {
    if (!confirmAction) return;
    const { track, kind } = confirmAction;
    setLocalProcessing(true);
    try {
      if (kind === 'bestow') {
        await purchaseTrack(track.id, Number(track.price) || 0, { provider });
        if (user) {
          try {
            await (supabase.rpc as any)('add_xp_to_current_user', { amount: 100 });
          } catch (err) {
            console.warn('XP award not available:', err);
          }
        }
        launchConfetti();
        toast.success('Bestowal completed! You can now download the track.');
      } else {
        await giftBestowal.send({
          recipientId: track.sower_user_id!,
          amount: 2,
          contextKind: 'chat_tip',
          contextId: track.id,
          provider,
          message: `Freewill gift for ${track.track_title}`,
        });
      }
      setConfirmAction(null);
    } catch (error: any) {
      console.error('Bestowal error:', error);
      toast.error(error?.message || 'Bestowal failed. Please try again.');
    } finally {
      setLocalProcessing(false);
    }
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

      {confirmAction && (
        <ConfirmBestowModal
          isOpen
          onClose={() => setConfirmAction(null)}
          title={confirmAction.track.track_title}
          amount={confirmAction.kind === 'bestow' ? Number(confirmAction.track.price) || 0 : 2}
          confirming={localProcessing}
          actionLabel={confirmAction.kind === 'gift' ? 'Gift' : 'Bestow'}
          onConfirm={confirmActionWithProvider}
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
          const isSelected = selectedTracks.includes(track.id);
          const isHighlighted = highlightedTrackId === track.id || highlightedProductId === track.product_id || highlightedProductId === track.id;

          return (
            <Card 
              key={track.id} 
              id={`music-track-${track.product_id || track.id}`}
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
                  <div className="relative h-12 w-12 flex-shrink-0 rounded overflow-hidden bg-white/10">
                    {(track as any).cover_image_url ? (
                      <SignedCover
                        src={(track as any).cover_image_url}
                        alt={track.track_title}
                      />
                    ) : (
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
                      {(track.artist_name || track.profiles?.username || 'Unknown Artist')
                        .replace(/^\s*(lyricist|lyrist)\s*:\s*/i, '')}
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

                  <TrackPreviewButton track={track} formatAmount={formatAmount} />

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
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleBestowal(track, e);
                        }}
                        disabled={processing}
                        className="h-8 gap-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                      >
                        <DollarSign className="h-3 w-3" />
                        Bestow
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
