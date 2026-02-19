import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Music, Search, Disc3, BookOpen, Megaphone, X } from 'lucide-react';

interface TrackOption {
  id: string;
  title: string;
  artist?: string;
  duration_seconds?: number;
  url?: string;
  source: 'dj_track' | 'community_seed';
  type?: string;
}

interface SegmentAudioPickerProps {
  onSelect: (track: TrackOption) => void;
  onClear: () => void;
  currentTrackTitle?: string;
  currentTrackDuration?: number;
  segmentDuration: number; // minutes
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const SegmentAudioPicker: React.FC<SegmentAudioPickerProps> = ({
  onSelect,
  onClear,
  currentTrackTitle,
  currentTrackDuration,
  segmentDuration,
}) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [djTracks, setDjTracks] = useState<TrackOption[]>([]);
  const [communityTracks, setCommunityTracks] = useState<TrackOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);

    const fetchTracks = async () => {
      // Fetch DJ's own tracks
      const { data: djData } = await supabase
        .from('dj_music_tracks')
        .select('id, track_title, artist_name, duration_seconds, file_url, track_type')
        .order('created_at', { ascending: false })
        .limit(100);

      if (djData) {
        setDjTracks(djData.map((t: any) => ({
          id: t.id,
          title: t.track_title,
          artist: t.artist_name,
          duration_seconds: t.duration_seconds,
          url: t.file_url,
          source: 'dj_track' as const,
          type: t.track_type,
        })));
      }

      // Fetch community music seeds
      const { data: seedData } = await (supabase
        .from('seeds') as any)
        .select('id, title, sower_name, duration_seconds, file_url')
        .eq('type', 'music')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(200);

      if (seedData) {
        setCommunityTracks((seedData as any[]).map((s) => ({
          id: s.id,
          title: s.title,
          artist: s.sower_name,
          duration_seconds: s.duration_seconds,
          url: s.file_url,
          source: 'community_seed' as const,
        })));
      }

      setLoading(false);
    };

    fetchTracks();
  }, [open, user]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const filter = (t: TrackOption) =>
      t.title.toLowerCase().includes(q) || (t.artist?.toLowerCase().includes(q) ?? false);
    return {
      dj: djTracks.filter(filter),
      community: communityTracks.filter(filter),
    };
  }, [search, djTracks, communityTracks]);

  const handleSelect = (track: TrackOption) => {
    onSelect(track);
    setOpen(false);
    setSearch('');
  };

  const segmentSeconds = segmentDuration * 60;
  const isOver = currentTrackDuration ? currentTrackDuration > segmentSeconds : false;

  if (currentTrackTitle) {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <Music className="h-3 w-3 text-primary shrink-0" />
        <span className="text-[11px] text-primary truncate max-w-[120px]">{currentTrackTitle}</span>
        <span className={`text-[10px] ${isOver ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
          ({formatDuration(currentTrackDuration)})
        </span>
        {isOver && <span className="text-[9px] text-destructive">⚠️ too long</span>}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="ml-auto text-muted-foreground hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 text-[10px] gap-1 text-muted-foreground hover:text-primary px-1.5"
        >
          <Music className="h-3 w-3" />
          Attach Audio
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="bottom">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tracks..."
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <p className="text-xs text-muted-foreground text-center py-4">Loading tracks...</p>
          ) : (
            <>
              {filtered.dj.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground px-3 py-1.5 bg-muted/50 sticky top-0">
                    🎧 Your Tracks ({filtered.dj.length})
                  </p>
                  {filtered.dj.map((t) => (
                    <TrackRow key={`dj-${t.id}`} track={t} segmentSeconds={segmentSeconds} onSelect={handleSelect} />
                  ))}
                </div>
              )}

              {filtered.community.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground px-3 py-1.5 bg-muted/50 sticky top-0">
                    🌱 Community Seeds ({filtered.community.length})
                  </p>
                  {filtered.community.map((t) => (
                    <TrackRow key={`seed-${t.id}`} track={t} segmentSeconds={segmentSeconds} onSelect={handleSelect} />
                  ))}
                </div>
              )}

              {filtered.dj.length === 0 && filtered.community.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">No tracks found</p>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

function TrackRow({
  track,
  segmentSeconds,
  onSelect,
}: {
  track: TrackOption;
  segmentSeconds: number;
  onSelect: (t: TrackOption) => void;
}) {
  const isOver = track.duration_seconds ? track.duration_seconds > segmentSeconds : false;

  const icon = track.type === 'teaching' ? (
    <BookOpen className="h-3 w-3 text-primary" />
  ) : track.type === 'advert' ? (
    <Megaphone className="h-3 w-3 text-destructive" />
  ) : (
    <Disc3 className="h-3 w-3 text-accent-foreground" />
  );

  return (
    <button
      type="button"
      onClick={() => onSelect(track)}
      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent/50 transition-colors"
    >
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{track.title}</p>
        {track.artist && <p className="text-[10px] text-muted-foreground truncate">{track.artist}</p>}
      </div>
      <span className={`text-[10px] shrink-0 ${isOver ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
        {formatDuration(track.duration_seconds)}
      </span>
      {isOver && <span className="text-[9px] text-destructive">⚠️</span>}
    </button>
  );
}
