import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Music, Mic, Megaphone, FileText, Plus, Trash2, 
  Clock, GripVertical, Search, Play, Upload 
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';

const TOTAL_MINUTES = 120;

type SegmentType = 'music' | 'voice_note' | 'ad' | 'document';

interface TimelineSegment {
  id: string;
  type: SegmentType;
  title: string;
  durationMinutes: number;
  contentId?: string; // track ID from community library
  contentName?: string;
  file?: File; // for uploaded voice notes / ads / docs
  fileUrl?: string;
  notes?: string;
}

const SEGMENT_TYPES: { value: SegmentType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'music', label: 'Music', icon: <Music className="h-4 w-4" />, color: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' },
  { value: 'voice_note', label: 'Voice / Talk', icon: <Mic className="h-4 w-4" />, color: 'bg-blue-500/20 border-blue-500/40 text-blue-300' },
  { value: 'ad', label: 'Ad Break', icon: <Megaphone className="h-4 w-4" />, color: 'bg-amber-500/20 border-amber-500/40 text-amber-300' },
  { value: 'document', label: 'Document / Reading', icon: <FileText className="h-4 w-4" />, color: 'bg-purple-500/20 border-purple-500/40 text-purple-300' },
];

interface TimelineBuilderProps {
  segments: TimelineSegment[];
  onChange: (segments: TimelineSegment[]) => void;
}

export const TimelineBuilder: React.FC<TimelineBuilderProps> = ({ segments, onChange }) => {
  const { toast } = useToast();
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [musicSearch, setMusicSearch] = useState('');
  const [communityTracks, setCommunityTracks] = useState<any[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);

  const usedMinutes = segments.reduce((sum, s) => sum + s.durationMinutes, 0);
  const remainingMinutes = TOTAL_MINUTES - usedMinutes;

  const addSegment = (type: SegmentType) => {
    const defaultDuration = Math.min(
      type === 'ad' ? 5 : type === 'document' ? 10 : 15,
      remainingMinutes
    );
    if (defaultDuration <= 0) {
      toast({ title: 'Timeline Full', description: 'No time remaining. Adjust existing segments first.', variant: 'destructive' });
      return;
    }
    const newSegment: TimelineSegment = {
      id: crypto.randomUUID(),
      type,
      title: '',
      durationMinutes: defaultDuration,
    };
    onChange([...segments, newSegment]);
  };

  const updateSegment = (id: string, updates: Partial<TimelineSegment>) => {
    onChange(segments.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSegment = (id: string) => {
    onChange(segments.filter(s => s.id !== id));
  };

  const openMusicPicker = async (segmentId: string) => {
    setEditingSegmentId(segmentId);
    setShowMusicPicker(true);
    await loadCommunityMusic();
  };

  const loadCommunityMusic = async () => {
    setLoadingTracks(true);
    try {
      // Load from dj_music_tracks (public tracks)
      const { data: djTracks } = await supabase
        .from('dj_music_tracks')
        .select('id, track_title, artist_name, duration_seconds, price, music_genre, music_mood')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      // Load from products table (music products)
      const { data: productTracks } = await supabase
        .from('products')
        .select('id, title, description, price, category, music_genre, music_mood')
        .eq('category', 'music')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      const allTracks: any[] = [
        ...(djTracks || []).map((t: any) => ({
          id: t.id,
          title: t.track_title,
          artist: t.artist_name || 'Unknown',
          duration: t.duration_seconds ? Math.round(t.duration_seconds / 60) : null,
          price: t.price || 2,
          genre: t.music_genre || 'unknown',
          mood: t.music_mood || 'unknown',
          source: 'dj_track',
        })),
        ...(productTracks || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          artist: 'Sower',
          duration: null,
          price: p.price || 2,
          genre: p.music_genre || 'unknown',
          mood: p.music_mood || 'unknown',
          source: 'product',
        })),
      ];
      setCommunityTracks(allTracks);
    } catch (err) {
      console.error('Error loading community music:', err);
    } finally {
      setLoadingTracks(false);
    }
  };

  const selectTrack = (track: any) => {
    if (editingSegmentId) {
      updateSegment(editingSegmentId, {
        contentId: track.id,
        contentName: `${track.title} — ${track.artist}`,
        title: track.title,
        durationMinutes: track.duration || segments.find(s => s.id === editingSegmentId)?.durationMinutes || 5,
      });
    }
    setShowMusicPicker(false);
    setEditingSegmentId(null);
  };

  const filteredTracks = communityTracks.filter(t =>
    !musicSearch || 
    t.title.toLowerCase().includes(musicSearch.toLowerCase()) ||
    t.artist.toLowerCase().includes(musicSearch.toLowerCase()) ||
    t.genre.toLowerCase().includes(musicSearch.toLowerCase())
  );

  // Calculate running time position for each segment
  let runningMinutes = 0;

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Timeline Progress</span>
          <span className={remainingMinutes < 0 ? 'text-destructive font-bold' : 'text-muted-foreground'}>
            {usedMinutes} / {TOTAL_MINUTES} min used
            {remainingMinutes > 0 && ` (${remainingMinutes} min remaining)`}
            {remainingMinutes < 0 && ` (${Math.abs(remainingMinutes)} min over!)`}
          </span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              remainingMinutes < 0 ? 'bg-destructive' : remainingMinutes === 0 ? 'bg-emerald-500' : 'bg-primary'
            }`}
            style={{ width: `${Math.min((usedMinutes / TOTAL_MINUTES) * 100, 100)}%` }}
          />
        </div>
        {/* Visual timeline bar showing segments */}
        {segments.length > 0 && (
          <div className="h-6 bg-muted rounded flex overflow-hidden">
            {segments.map(seg => {
              const segType = SEGMENT_TYPES.find(t => t.value === seg.type);
              const widthPercent = (seg.durationMinutes / TOTAL_MINUTES) * 100;
              return (
                <div
                  key={seg.id}
                  className={`h-full border-r border-background/50 flex items-center justify-center text-[10px] font-medium truncate px-1 ${segType?.color || ''}`}
                  style={{ width: `${widthPercent}%` }}
                  title={`${seg.title || segType?.label} — ${seg.durationMinutes} min`}
                >
                  {widthPercent > 8 && (seg.title || segType?.label)}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Segment list */}
      <div className="space-y-3">
        {segments.map((segment, index) => {
          const segType = SEGMENT_TYPES.find(t => t.value === segment.type);
          const startTime = formatTime(runningMinutes);
          runningMinutes += segment.durationMinutes;
          const endTime = formatTime(runningMinutes);

          return (
            <div key={segment.id} className={`border rounded-lg p-3 space-y-2 ${segType?.color || ''}`}>
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <Badge variant="outline" className="text-xs font-mono">
                  {startTime} → {endTime}
                </Badge>
                <div className="flex items-center gap-1">
                  {segType?.icon}
                  <span className="text-sm font-medium">{segType?.label}</span>
                </div>
                <span className="text-xs text-muted-foreground">#{index + 1}</span>
                <div className="flex-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => removeSegment(segment.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Title</Label>
                  <Input
                    placeholder={`${segType?.label} title...`}
                    value={segment.title}
                    onChange={(e) => updateSegment(segment.id, { title: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Duration (min)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={segment.durationMinutes}
                    onChange={(e) => updateSegment(segment.id, { durationMinutes: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Content assignment based on type */}
              {segment.type === 'music' && (
                <div>
                  {segment.contentName ? (
                    <div className="flex items-center gap-2 p-2 bg-background/40 rounded text-sm">
                      <Music className="h-4 w-4 text-emerald-400" />
                      <span className="flex-1 truncate">{segment.contentName}</span>
                      <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => openMusicPicker(segment.id)}>
                        Change
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" size="sm" className="w-full text-xs" onClick={() => openMusicPicker(segment.id)}>
                      <Search className="h-3 w-3 mr-1" /> Browse Community Music Library
                    </Button>
                  )}
                </div>
              )}

              {(segment.type === 'voice_note' || segment.type === 'ad') && (
                <FileUploadZone
                  segment={segment}
                  onFileSelect={(file) => updateSegment(segment.id, { file, title: segment.title || file.name })}
                  accept={segment.type === 'voice_note' 
                    ? { 'audio/*': ['.mp3', '.wav', '.m4a', '.ogg'] }
                    : { 'audio/*': ['.mp3', '.wav', '.m4a'], 'video/*': ['.mp4'] }
                  }
                  label={segment.type === 'voice_note' ? 'Upload voice note / teaching audio' : 'Upload ad audio/video'}
                />
              )}

              {segment.type === 'document' && (
                <FileUploadZone
                  segment={segment}
                  onFileSelect={(file) => updateSegment(segment.id, { file, title: segment.title || file.name })}
                  accept={{ 'application/pdf': ['.pdf'], 'application/msword': ['.doc', '.docx'] }}
                  label="Upload PDF or Word document"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Add segment buttons */}
      {remainingMinutes > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Add Segment</Label>
          <div className="grid grid-cols-2 gap-2">
            {SEGMENT_TYPES.map(st => (
              <Button
                key={st.value}
                type="button"
                variant="outline"
                size="sm"
                className="justify-start gap-2"
                onClick={() => addSegment(st.value)}
              >
                {st.icon}
                {st.label}
                <Plus className="h-3 w-3 ml-auto" />
              </Button>
            ))}
          </div>
        </div>
      )}

      {segments.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="font-medium">Build Your 2-Hour Show</p>
          <p className="text-sm">Add segments to fill your 120-minute slot with music, talk, ads, and documents.</p>
        </div>
      )}

      {/* Community Music Picker Dialog */}
      <Dialog open={showMusicPicker} onOpenChange={setShowMusicPicker}>
        <DialogContent className="max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Music className="h-5 w-5" />
              Community Music Library
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, artist, or genre..."
                value={musicSearch}
                onChange={(e) => setMusicSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-1">
                {loadingTracks && <p className="text-center text-sm text-muted-foreground py-8">Loading community music...</p>}
                {!loadingTracks && filteredTracks.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-8">No tracks found</p>
                )}
                {filteredTracks.map(track => (
                  <div
                    key={track.id}
                    className="flex items-center gap-3 p-3 hover:bg-accent/50 rounded-lg cursor-pointer transition-colors"
                    onClick={() => selectTrack(track)}
                  >
                    <div className="h-10 w-10 rounded bg-primary/20 flex items-center justify-center">
                      <Play className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{track.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {track.artist}
                        {track.genre !== 'unknown' && ` • ${track.genre}`}
                        {track.duration && ` • ${track.duration} min`}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      ${track.price}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Small helper component for file uploads within segments
const FileUploadZone: React.FC<{
  segment: TimelineSegment;
  onFileSelect: (file: File) => void;
  accept: Record<string, string[]>;
  label: string;
}> = ({ segment, onFileSelect, accept, label }) => {
  const { getRootProps, getInputProps } = useDropzone({
    accept,
    maxFiles: 1,
    onDrop: (files) => files[0] && onFileSelect(files[0]),
  });

  if (segment.file) {
    return (
      <div className="flex items-center gap-2 p-2 bg-background/40 rounded text-sm">
        <FileText className="h-4 w-4" />
        <span className="flex-1 truncate">{segment.file.name}</span>
        <Badge variant="outline" className="text-xs">
          {(segment.file.size / 1024 / 1024).toFixed(1)} MB
        </Badge>
      </div>
    );
  }

  return (
    <div {...getRootProps()} className="border border-dashed rounded p-3 text-center cursor-pointer hover:border-primary/50 transition-colors">
      <input {...getInputProps()} />
      <Upload className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
};

export type { TimelineSegment, SegmentType };
