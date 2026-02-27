import React, { useRef, useState } from 'react';
import { Music, Video, Image, Volume2, VolumeX, Play } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BizAdCardProps {
  ad: any;
  showControls?: boolean;
  onToggleActive?: (id: string, isActive: boolean) => void;
  onDelete?: (id: string) => void;
  displayName?: string;
}

export default function BizAdCard({ ad, showControls, onToggleActive, onDelete, displayName }: BizAdCardProps) {
  const [playing, setPlaying] = useState(false);
  const voiceoverRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlayback = () => {
    if (playing) {
      voiceoverRef.current?.pause();
      videoRef.current?.pause();
      setPlaying(false);
    } else {
      videoRef.current?.play();
      voiceoverRef.current?.play();
      setPlaying(true);
    }
  };

  const overlayPos = ad.overlay_position || 'bottom';

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
      <div className="aspect-video bg-muted relative cursor-pointer" onClick={togglePlayback}>
        {/* Visual layer */}
        {ad.media_type === 'video' ? (
          <video
            ref={videoRef}
            src={ad.media_url}
            className="w-full h-full object-cover"
            muted={!!ad.voiceover_url}
            loop
            playsInline
            onEnded={() => setPlaying(false)}
          />
        ) : (
          <img src={ad.media_url} alt={ad.title} className="w-full h-full object-cover" />
        )}

        {/* Text overlay */}
        {(ad.overlay_headline || ad.overlay_tagline) && (
          <div
            className={cn(
              'absolute left-0 right-0 px-4 py-3 bg-gradient-to-t from-black/80 via-black/50 to-transparent',
              overlayPos === 'top' && 'top-0 bg-gradient-to-b',
              overlayPos === 'center' && 'top-1/2 -translate-y-1/2 bg-black/60',
              overlayPos === 'bottom' && 'bottom-0'
            )}
          >
            {ad.overlay_headline && (
              <p className="text-white font-bold text-lg leading-tight drop-shadow-md">{ad.overlay_headline}</p>
            )}
            {ad.overlay_tagline && (
              <p className="text-white/90 text-sm mt-0.5 drop-shadow-md">{ad.overlay_tagline}</p>
            )}
          </div>
        )}

        {/* Play / speaker indicator */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {playing ? (
            <div className="bg-black/50 rounded-full p-3">
              <VolumeX className="w-6 h-6 text-white" />
            </div>
          ) : (
            <div className="bg-black/50 rounded-full p-3">
              <Play className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          <Badge variant="outline" className="bg-background/80 text-xs">
            {ad.media_type === 'video' ? <Video className="w-3 h-3 mr-1" /> : <Image className="w-3 h-3 mr-1" />}
            {ad.media_type}
          </Badge>
          {ad.voiceover_url && (
            <Badge variant="outline" className="bg-background/80 text-xs">
              <Volume2 className="w-3 h-3 mr-1" /> voiceover
            </Badge>
          )}
        </div>

        {showControls && (
          <div className="absolute top-2 right-2">
            <Badge variant={ad.is_active ? 'default' : 'secondary'}>
              {ad.is_active ? 'Active' : 'Paused'}
            </Badge>
          </div>
        )}

        {/* Hidden voiceover audio */}
        {ad.voiceover_url && (
          <audio ref={voiceoverRef} src={ad.voiceover_url} onEnded={() => setPlaying(false)} />
        )}
      </div>

      <CardContent className="p-4 space-y-2">
        <h3 className="font-semibold text-lg truncate">{ad.title}</h3>
        {ad.description && <p className="text-sm text-muted-foreground line-clamp-2">{ad.description}</p>}
        {displayName && (
          <p className="text-xs text-muted-foreground">
            By {displayName} · {new Date(ad.created_at).toLocaleDateString()}
          </p>
        )}
        {showControls && onToggleActive && onDelete && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => onToggleActive(ad.id, ad.is_active)} className="flex-1 gap-1">
              {ad.is_active ? '⏸ Pause' : '▶ Activate'}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete(ad.id)} className="gap-1">
              🗑
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
