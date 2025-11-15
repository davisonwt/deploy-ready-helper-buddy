import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Share2, Download, DollarSign, Play, Pause, Edit } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useMusicPurchase } from '@/hooks/useMusicPurchase';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { EditTrackModal } from './EditTrackModal';
import { useQueryClient } from '@tanstack/react-query';

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
}

export function MusicLibraryTable({ 
  tracks, 
  showBestowalButton = true,
  showEditButton = false,
  allowSelection = false,
  onTrackSelect,
  selectedTracks = []
}: MusicLibraryTableProps) {
  const { user } = useAuth();
  const musicPurchase = useMusicPurchase();
  const queryClient = useQueryClient();
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [editingTrack, setEditingTrack] = useState<MusicTrack | null>(null);
  
  // Safely extract functions with fallbacks
  const purchaseTrack = musicPurchase?.purchaseTrack || (async () => {});
  const hasPurchased = musicPurchase?.hasPurchased || (() => false);
  const processing = musicPurchase?.processing || false;

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePreview = (track: MusicTrack) => {
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

    // Create new audio element for 30-second preview
    const audio = new Audio(track.preview_url || track.file_url);
    audio.volume = 0.7;
    
    // Limit to 30 seconds for preview
    audio.addEventListener('timeupdate', () => {
      if (audio.currentTime >= 30) {
        audio.pause();
        setPlayingTrack(null);
        toast.info('Preview ended. Bestow $2 to download full track!');
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

  const handleBestowal = async (track: MusicTrack) => {
    if (!user) {
      toast.error('Please sign in to make a bestowal');
      return;
    }

    const isPurchased = hasPurchased(track.id);
    if (isPurchased) {
      toast.info('You already own this track!');
      return;
    }

    try {
      await purchaseTrack(track.id, 2); // $2 including 10% tithing + 5% admin
      toast.success('Track purchased! Check your downloads.');
    } catch (error) {
      toast.error('Purchase failed. Please try again.');
    }
  };

  const handleFollow = (djId: string) => {
    toast.info('Follow feature coming soon!');
  };

  const handleShare = (track: MusicTrack) => {
    if (navigator.share) {
      navigator.share({
        title: track.track_title,
        text: `Check out ${track.track_title} by ${track.artist_name || 'Unknown Artist'}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleDownload = async (track: MusicTrack) => {
    const isPurchased = hasPurchased(track.id);
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
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No music tracks available yet.</p>
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
      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
        <div className="col-span-4">Track / Artist</div>
        <div className="col-span-2">Genre</div>
        <div className="col-span-1">Duration</div>
        <div className="col-span-1 text-center">Price</div>
        <div className="col-span-4 text-center">Actions</div>
      </div>

      {/* Track Rows */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {tracks.map((track) => {
          const isPurchased = hasPurchased(track.id);
          const isPlaying = playingTrack === track.id;
          const isSelected = selectedTracks.includes(track.id);

          return (
            <Card 
              key={track.id} 
              className={`p-4 hover:shadow-md transition-shadow ${allowSelection ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-primary' : ''}`}
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
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={track.profiles?.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10">
                      {track.artist_name?.charAt(0) || 'M'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate text-foreground">
                      {track.track_title}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {track.artist_name || track.profiles?.username || 'Unknown Artist'}
                    </p>
                  </div>
                </div>

                {/* Genre */}
                <div className="col-span-2">
                  <Badge variant="outline" className="text-xs">
                    {track.genre || 'Unspecified'}
                  </Badge>
                </div>

                {/* Duration */}
                <div className="col-span-1 text-sm text-foreground">
                  {formatDuration(track.duration_seconds)}
                </div>

                {/* Price */}
                <div className="col-span-1 text-center">
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    $2.00
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
                      className="h-8 gap-1"
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
                    className="h-8 w-8 p-0"
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
                    className="h-8 w-8 p-0"
                  >
                    <Heart className="h-4 w-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(track);
                    }}
                    className="h-8 w-8 p-0"
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
                    className="h-8 w-8 p-0"
                    disabled={!isPurchased && track.price && track.price > 0}
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  {showBestowalButton && !isPurchased && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBestowal(track);
                      }}
                      disabled={processing}
                      className="h-8 gap-1"
                    >
                      <DollarSign className="h-3 w-3" />
                      Bestow
                    </Button>
                  )}

                  {isPurchased && (
                    <Badge variant="secondary" className="h-8 px-2">
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
