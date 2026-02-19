import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Music, Sprout, Send, X, ListMusic, Filter } from 'lucide-react';
import { MUSIC_MOODS, MUSIC_GENRES } from '@/constants/musicCategories';

interface SeedOption {
  id: string;
  title: string;
  artist?: string;
  cover_url?: string;
  file_url?: string;
  duration_seconds?: number;
  source: 'product' | 'dj_track';
  music_mood?: string;
  music_genre?: string;
}

interface SeedRequest {
  id: string;
  seed_title: string;
  seed_artist?: string;
  seed_cover_url?: string;
  status: string;
  requester_id: string;
  message?: string;
  created_at: string;
}

const fmt = (s?: number) => {
  if (!s) return '';
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
};

// ── Listener: categorized song request ──
export const SeedRequestForm: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [moodFilter, setMoodFilter] = useState<string>('all');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [allSongs, setAllSongs] = useState<SeedOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<SeedOption | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch all music seeds on mount
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      // Fetch music products
      const { data: products } = await supabase
        .from('products')
        .select('id, title, cover_image_url, file_url, music_mood, music_genre, sowers(sower_name)')
        .eq('type', 'music')
        .order('created_at', { ascending: false })
        .limit(500);

      // Fetch public DJ tracks
      const { data: djTracks } = await supabase
        .from('dj_music_tracks')
        .select('id, track_title, artist_name, file_url, duration_seconds, music_mood, music_genre')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(200);

      const combined: SeedOption[] = [
        ...(products || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          artist: p.sowers?.sower_name,
          cover_url: p.cover_image_url,
          file_url: p.file_url,
          source: 'product' as const,
          music_mood: p.music_mood,
          music_genre: p.music_genre,
        })),
        ...(djTracks || []).map((t: any) => ({
          id: t.id,
          title: t.track_title,
          artist: t.artist_name,
          file_url: t.file_url,
          duration_seconds: t.duration_seconds,
          source: 'dj_track' as const,
          music_mood: t.music_mood,
          music_genre: t.music_genre,
        })),
      ];
      setAllSongs(combined);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const filtered = useMemo(() => {
    return allSongs.filter((s) => {
      if (moodFilter !== 'all' && s.music_mood !== moodFilter) return false;
      if (genreFilter !== 'all' && s.music_genre !== genreFilter) return false;
      return true;
    });
  }, [allSongs, moodFilter, genreFilter]);

  const submitRequest = async () => {
    if (!selected || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from('radio_seed_requests').insert({
      session_id: sessionId,
      requester_id: user.id,
      seed_id: selected.source === 'product' ? selected.id : null,
      track_id: selected.source === 'dj_track' ? selected.id : null,
      seed_title: selected.title,
      seed_artist: selected.artist || null,
      seed_cover_url: selected.cover_url || null,
      seed_file_url: selected.file_url || null,
      seed_duration_seconds: selected.duration_seconds || null,
      message: message || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not send request.' });
    } else {
      toast({ title: '🎵 Song Requested!', description: `"${selected.title}" has been sent to the DJ.` });
      setSelected(null);
      setMessage('');
    }
  };

  const moodMeta = (val: string) => MUSIC_MOODS.find((m) => m.value === val);
  const genreMeta = (val: string) => MUSIC_GENRES.find((g) => g.value === val);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ListMusic className="h-4 w-4 text-primary" />
          Request a Song
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!selected ? (
          <>
            {/* Filters */}
            <div className="flex gap-2">
              <Select value={moodFilter} onValueChange={setMoodFilter}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Mood" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Moods</SelectItem>
                  {MUSIC_MOODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={genreFilter} onValueChange={setGenreFilter}>
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Genre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genres</SelectItem>
                  {MUSIC_GENRES.map((g) => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Song list */}
            {loading ? (
              <p className="text-xs text-muted-foreground text-center py-4">Loading music library...</p>
            ) : (
              <ScrollArea className="max-h-56">
                <div className="space-y-1">
                  {filtered.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No songs match these filters</p>
                  )}
                  {filtered.map((song) => (
                    <button
                      key={`${song.source}-${song.id}`}
                      onClick={() => setSelected(song)}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent/50 transition-colors text-left"
                    >
                      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {song.cover_url ? (
                          <img src={song.cover_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Music className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{song.title}</p>
                        {song.artist && <p className="text-[10px] text-muted-foreground truncate">{song.artist}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        {song.music_mood && moodMeta(song.music_mood) && (
                          <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5" style={{ borderColor: moodMeta(song.music_mood)?.color }}>
                            {moodMeta(song.music_mood)?.label}
                          </Badge>
                        )}
                        {song.music_genre && (
                          <span className="text-[9px] text-muted-foreground">{genreMeta(song.music_genre)?.label || song.music_genre}</span>
                        )}
                      </div>
                      {song.duration_seconds && (
                        <span className="text-[10px] text-muted-foreground shrink-0">{fmt(song.duration_seconds)}</span>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg">
              <Sprout className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selected.title}</p>
                {selected.artist && <p className="text-xs text-muted-foreground">{selected.artist}</p>}
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelected(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message (optional)..."
              className="h-8 text-xs"
            />
            <Button onClick={submitRequest} disabled={submitting} className="w-full h-9 gap-2 text-sm">
              <Send className="h-3.5 w-3.5" />
              Send Request
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ── DJ: manage the request queue with drag-and-drop swap ──
export const DJSeedRequestQueue: React.FC<{
  sessionId: string;
  segments?: any[];
  onSwapSegmentAudio?: (segmentIndex: number, track: { id: string; title: string; url?: string; duration_seconds?: number }) => void;
}> = ({ sessionId, segments, onSwapSegmentAudio }) => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<SeedRequest[]>([]);
  const [draggedRequest, setDraggedRequest] = useState<SeedRequest | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('radio_seed_requests')
        .select('*')
        .eq('session_id', sessionId)
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: true });
      setRequests((data as SeedRequest[]) || []);
    };
    fetch();

    const channel = supabase
      .channel(`seed-requests-${sessionId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'radio_seed_requests',
        filter: `session_id=eq.${sessionId}`,
      }, () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  const updateStatus = async (id: string, status: 'approved' | 'skipped') => {
    const { error } = await supabase
      .from('radio_seed_requests')
      .update({ status, resolved_at: new Date().toISOString() })
      .eq('id', id);
    if (error) toast({ variant: 'destructive', title: 'Error', description: 'Could not update request.' });
  };

  const handleDragStart = (e: React.DragEvent, request: SeedRequest) => {
    setDraggedRequest(request);
    e.dataTransfer.setData('text/plain', request.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSegmentDrop = (e: React.DragEvent, segIndex: number) => {
    e.preventDefault();
    if (!draggedRequest || !onSwapSegmentAudio) return;

    onSwapSegmentAudio(segIndex, {
      id: (draggedRequest as any).seed_id || (draggedRequest as any).track_id || draggedRequest.id,
      title: draggedRequest.seed_title,
      url: (draggedRequest as any).seed_file_url,
      duration_seconds: (draggedRequest as any).seed_duration_seconds,
    });

    // Mark as played
    updateStatus(draggedRequest.id, 'approved');
    setDraggedRequest(null);

    toast({ title: '🎵 Swapped!', description: `"${draggedRequest.seed_title}" mapped to segment.` });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div className="space-y-4">
      {/* Request queue */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <ListMusic className="h-3.5 w-3.5" />
          Song Requests ({requests.length})
        </p>
        {requests.length === 0 && (
          <div className="text-center py-4 text-xs text-muted-foreground">
            <ListMusic className="h-5 w-5 mx-auto mb-1 opacity-50" />
            No song requests yet
          </div>
        )}
        {requests.map((r) => (
          <div
            key={r.id}
            draggable
            onDragStart={(e) => handleDragStart(e, r)}
            className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg cursor-grab active:cursor-grabbing hover:bg-muted/50 transition-colors border border-transparent hover:border-primary/20"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{r.seed_title}</p>
              {r.seed_artist && <p className="text-[10px] text-muted-foreground truncate">{r.seed_artist}</p>}
              {r.message && <p className="text-[10px] text-muted-foreground italic mt-0.5">"{r.message}"</p>}
            </div>
            <Badge variant={r.status === 'approved' ? 'default' : 'outline'} className="text-[9px] shrink-0">
              {r.status}
            </Badge>
            {r.status === 'pending' && (
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-primary" onClick={() => updateStatus(r.id, 'approved')}>
                  ✅
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => updateStatus(r.id, 'skipped')}>
                  ❌
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Drop targets: timeline segments */}
      {segments && segments.length > 0 && requests.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">
            🎯 Drag a request onto a segment to swap its audio:
          </p>
          <div className="space-y-1">
            {segments.map((seg, i) => (
              <div
                key={i}
                onDrop={(e) => handleSegmentDrop(e, i)}
                onDragOver={handleDragOver}
                className="flex items-center gap-2 p-2 rounded-lg border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors bg-card"
                style={{ borderLeftWidth: 4, borderLeftColor: seg.color, borderLeftStyle: 'solid' }}
              >
                <span className="text-sm">{seg.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{seg.title}</p>
                  {seg.mapped_track_title && (
                    <p className="text-[10px] text-primary truncate">🎵 {seg.mapped_track_title}</p>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{seg.duration}m</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
