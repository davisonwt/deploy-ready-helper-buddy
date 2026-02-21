import React, { useState, useCallback, useRef, useMemo } from 'react';
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
  Music, Mic, MicOff, Megaphone, FileText, Plus, Trash2, 
  Clock, GripVertical, Search, Play, Upload, Square, RotateCcw,
  Download, Sparkles
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { AIVoicePanel } from './AIVoicePanel';

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
  audioBlob?: Blob; // for mic-recorded voice notes
  audioUrl?: string; // object URL for playback preview
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

  // Voice recording state
  const [recordingSegmentId, setRecordingSegmentId] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Dynamic max recording based on segment duration (in seconds)
  const getMaxRecordingSeconds = useCallback((segmentId: string) => {
    const seg = segments.find(s => s.id === segmentId);
    return seg ? seg.durationMinutes * 60 : 120;
  }, [segments]);

  const [isUploading, setIsUploading] = useState(false);

  // Ref to always hold the latest stopRecording without stale closures
  const stopRecordingRef = useRef<(segmentId: string) => void>(() => {});

  const startRecording = useCallback(async (segmentId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 44100, channelCount: 1, echoCancellation: true, noiseSuppression: true }
      });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;
      setRecordingSegmentId(segmentId);
      setRecordingTime(0);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      const maxSeconds = getMaxRecordingSeconds(segmentId);

      // Auto-stop is handled via the ref so it always calls the latest stopRecording
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const next = prev + 1;
          if (next >= maxSeconds) {
            setTimeout(() => {
              stopRecordingRef.current(segmentId);
              toast({ title: 'Recording Stopped', description: `Segment time limit of ${Math.floor(maxSeconds / 60)} min reached.` });
            }, 0);
          }
          return next;
        });
      }, 1000);

      mediaRecorder.start(100);
    } catch (err) {
      console.error('Mic error:', err);
      toast({ title: 'Mic Error', description: 'Could not access microphone. Check permissions.', variant: 'destructive' });
    }
  }, [toast, getMaxRecordingSeconds]);

  const stopRecording = useCallback((segmentId: string) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);

        // Auto-save to Supabase Storage to prevent data loss
        try {
          setIsUploading(true);
          const fileName = `radio-voice-segments/${segmentId}-${Date.now()}.webm`;
          const { error: uploadError } = await supabase.storage
            .from('chat-files')
            .upload(fileName, blob, { contentType: 'audio/webm', upsert: false });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            toast({ title: 'Auto-save failed', description: 'Recording kept locally. Try re-recording if page refreshes.', variant: 'destructive' });
            onChange(segments.map(s => s.id === segmentId ? { ...s, audioBlob: blob, audioUrl: url, file: undefined } : s));
          } else {
            const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(fileName);
            onChange(segments.map(s => s.id === segmentId ? { ...s, audioBlob: blob, audioUrl: url, fileUrl: publicUrl, file: undefined } : s));
            toast({ title: 'Recording Saved', description: 'Your voice recording has been saved to the server.' });
          }
        } catch (err) {
          console.error('Save error:', err);
          onChange(segments.map(s => s.id === segmentId ? { ...s, audioBlob: blob, audioUrl: url, file: undefined } : s));
        } finally {
          setIsUploading(false);
        }

        recorder.stream.getTracks().forEach(t => t.stop());
      };
      recorder.stop();
    }
    setRecordingSegmentId(null);
    setRecordingTime(0);
  }, [segments, onChange, toast]);

  // Keep the ref in sync so the timer always calls the latest version
  stopRecordingRef.current = stopRecording;

  const clearRecording = useCallback((segmentId: string) => {
    const seg = segments.find(s => s.id === segmentId);
    if (seg?.audioUrl) URL.revokeObjectURL(seg.audioUrl);
    onChange(segments.map(s => s.id === segmentId ? { ...s, audioBlob: undefined, audioUrl: undefined } : s));
  }, [segments, onChange]);

  const formatCountdown = (elapsed: number, segmentId?: string) => {
    const maxSec = segmentId ? getMaxRecordingSeconds(segmentId) : 120;
    const remaining = maxSec - elapsed;
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${m}:${s.toString().padStart(2, '0')} left`;
  };

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
      // Load from dj_music_tracks (public tracks) with DJ name
      const { data: djTracks } = await supabase
        .from('dj_music_tracks')
        .select('id, track_title, artist_name, duration_seconds, price, music_genre, music_mood, dj_id, radio_djs(dj_name)')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      // Load only music-related sower products with sower name via sowers table
      const { data: productTracks } = await supabase
        .from('products')
        .select('id, title, description, price, category, music_genre, music_mood, sower_id, type, duration, artist_name, sowers(display_name)')
      .eq('status', 'active')
      .in('type', ['music', 'Music'])
      .lte('price', 5)
      .order('created_at', { ascending: false });

      const allTracks: any[] = [
        ...(djTracks || []).map((t: any) => ({
          id: t.id,
          title: t.track_title,
          artist: t.artist_name || (t.radio_djs as any)?.dj_name || 'Unknown',
          durationSeconds: t.duration_seconds || null,
          price: t.price || 2,
          genre: t.music_genre || 'unknown',
          mood: t.music_mood || 'unknown',
          source: 'dj_track',
        })),
        ...(productTracks || []).map((p: any) => ({
          id: p.id,
          title: p.title,
          artist: p.artist_name || (p.sowers as any)?.display_name || 'Sower',
          durationSeconds: p.duration ? Number(p.duration) : null,
          price: p.price || 2,
          genre: p.music_genre || p.category || 'unknown',
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

  const formatDurationSeconds = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const selectTrack = (track: any) => {
    if (editingSegmentId) {
      const durationMin = track.durationSeconds
        ? Math.ceil(track.durationSeconds / 10) * 10 / 60  // round up to nearest 10 seconds
        : segments.find(s => s.id === editingSegmentId)?.durationMinutes || 5;
      updateSegment(editingSegmentId, {
        contentId: track.id,
        contentName: `${track.title} — ${track.artist}`,
        title: track.title,
        durationMinutes: durationMin,
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
    const totalSec = Math.round(minutes * 60);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return s > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${h}:${m.toString().padStart(2, '0')}`;
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
                  <Label className="text-xs">Duration</Label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={120}
                      value={Math.floor(segment.durationMinutes)}
                      onChange={(e) => {
                        const mins = Math.max(0, parseInt(e.target.value) || 0);
                        const currentSecs = Math.round((segment.durationMinutes % 1) * 60);
                        updateSegment(segment.id, { durationMinutes: mins + currentSecs / 60 });
                      }}
                      className="h-8 text-sm w-16"
                    />
                    <span className="text-xs text-muted-foreground">m</span>
                    <Select
                      value={String(Math.round((segment.durationMinutes % 1) * 60 / 10) * 10)}
                      onValueChange={(val) => {
                        const mins = Math.floor(segment.durationMinutes);
                        updateSegment(segment.id, { durationMinutes: mins + Number(val) / 60 });
                      }}
                    >
                      <SelectTrigger className="h-8 text-sm w-16">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 10, 20, 30, 40, 50].map(s => (
                          <SelectItem key={s} value={String(s)}>{s}s</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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

              {segment.type === 'voice_note' && (
                <VoiceSegmentControls
                  segment={segment}
                  isRecording={recordingSegmentId === segment.id}
                  isUploading={isUploading && recordingSegmentId === null}
                  recordingTime={recordingTime}
                  maxRecordingSeconds={getMaxRecordingSeconds(segment.id)}
                  formatCountdown={(elapsed) => formatCountdown(elapsed, segment.id)}
                  onStartRecording={() => startRecording(segment.id)}
                  onStopRecording={() => stopRecording(segment.id)}
                  onClearRecording={() => clearRecording(segment.id)}
                  onFileSelect={(file) => updateSegment(segment.id, { file, title: segment.title || file.name, audioBlob: undefined, audioUrl: undefined })}
                />
              )}

              {segment.type === 'ad' && (
                <FileUploadZone
                  segment={segment}
                  onFileSelect={(file) => updateSegment(segment.id, { file, title: segment.title || file.name })}
                  accept={{ 'audio/*': ['.mp3', '.wav', '.m4a'], 'video/*': ['.mp4'] }}
                  label="Upload ad audio/video"
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
                        {' • '}
                        {track.durationSeconds ? formatDurationSeconds(track.durationSeconds) : 'Duration N/A'}
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

// Voice segment with Record + Upload + AI Voice options
const VoiceSegmentControls: React.FC<{
  segment: TimelineSegment;
  isRecording: boolean;
  isUploading: boolean;
  recordingTime: number;
  maxRecordingSeconds: number;
  formatCountdown: (elapsed: number) => string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClearRecording: () => void;
  onFileSelect: (file: File) => void;
}> = ({ segment, isRecording, isUploading, recordingTime, maxRecordingSeconds, formatCountdown, onStartRecording, onStopRecording, onClearRecording, onFileSelect }) => {
  const [mode, setMode] = useState<'default' | 'ai_voice' | 'teleprompter'>('default');
  const [teleprompterScript, setTeleprompterScript] = useState('');

  const { getRootProps, getInputProps } = useDropzone({
    accept: { 'audio/*': ['.mp3', '.wav', '.m4a', '.ogg'] },
    maxFiles: 1,
    onDrop: (files) => files[0] && onFileSelect(files[0]),
  });

  const handleDownload = async () => {
    if (!segment.audioBlob) return;
    try {
      // Decode webm audio to PCM, then encode as MP3
      const arrayBuffer = await segment.audioBlob.arrayBuffer();
      const audioCtx = new AudioContext();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const samples = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;

      const { default: lamejs } = await import('lamejs');
      const mp3enc = new lamejs.Mp3Encoder(1, sampleRate, 128);
      const sampleBlockSize = 1152;
      const int16 = new Int16Array(samples.length);
      for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      const mp3Data: Uint8Array[] = [];
      for (let i = 0; i < int16.length; i += sampleBlockSize) {
        const chunk = int16.subarray(i, i + sampleBlockSize);
        const buf = mp3enc.encodeBuffer(chunk);
        if (buf.length > 0) mp3Data.push(new Uint8Array(buf));
      }
      const end = mp3enc.flush();
      if (end.length > 0) mp3Data.push(new Uint8Array(end));

      const mp3Blob = new Blob(mp3Data as BlobPart[], { type: 'audio/mp3' });
      const url = URL.createObjectURL(mp3Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${segment.title || 'voice-recording'}-${Date.now()}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      audioCtx.close();
    } catch (err) {
      console.error('MP3 conversion failed, falling back to webm:', err);
      const url = URL.createObjectURL(segment.audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${segment.title || 'voice-recording'}-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleStartTeleprompterRecord = (script: string) => {
    setTeleprompterScript(script);
    setMode('teleprompter');
    onStartRecording();
  };

  // Show uploading state
  if (isUploading) {
    return (
      <div className="p-3 rounded border border-primary/50 bg-primary/10 text-center">
        <span className="text-sm text-muted-foreground">Saving recording to server...</span>
      </div>
    );
  }

  // Show playback preview if recorded (with Download button)
  if (segment.audioBlob && segment.audioUrl) {
    return (
      <div className="space-y-2 p-2 bg-background/40 rounded">
        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">Recorded Voice Note</span>
          {segment.fileUrl && (
            <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/40">Saved ✓</Badge>
          )}
          <Badge variant="outline" className="text-xs ml-auto">
            {(segment.audioBlob.size / 1024).toFixed(0)} KB
          </Badge>
        </div>
        <audio src={segment.audioUrl} controls className="w-full h-8" />
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="text-xs gap-1 flex-1" onClick={onClearRecording}>
            <RotateCcw className="h-3 w-3" /> Re-record
          </Button>
          <Button type="button" variant="outline" size="sm" className="text-xs gap-1 flex-1" onClick={handleDownload}>
            <Download className="h-3 w-3" /> Download
          </Button>
          <Button type="button" variant="ghost" size="sm" className="text-xs gap-1 text-destructive" onClick={onClearRecording}>
            <Trash2 className="h-3 w-3" /> Delete
          </Button>
        </div>
      </div>
    );
  }

  // Show uploaded file
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

  // Recording in progress (with optional teleprompter)
  if (isRecording) {
    const isWarning = (maxRecordingSeconds - recordingTime) <= 30;
    return (
      <div className="p-3 rounded border border-destructive/50 bg-destructive/10 space-y-2">
        {/* Teleprompter script display */}
        {mode === 'teleprompter' && teleprompterScript && (
          <div className="p-3 bg-background/80 rounded border border-primary/30 max-h-32 overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-1">📜 Read this:</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{teleprompterScript}</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
          </span>
          <span className="text-sm font-medium text-destructive">Recording...</span>
          <span className={`text-xs ml-auto font-mono ${isWarning ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
            {isWarning && '⚠️ '}{formatCountdown(recordingTime)}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-destructive transition-all rounded-full"
            style={{ width: `${(recordingTime / maxRecordingSeconds) * 100}%` }}
          />
        </div>
        <Button type="button" variant="destructive" size="sm" className="w-full text-xs gap-1" onClick={() => { onStopRecording(); setMode('default'); }}>
          <Square className="h-3 w-3" /> Stop Recording
        </Button>
      </div>
    );
  }

  // AI Voice panel
  if (mode === 'ai_voice') {
    return (
      <AIVoicePanel
        segmentDurationMinutes={segment.durationMinutes}
        onStartTeleprompterRecord={handleStartTeleprompterRecord}
        onBack={() => setMode('default')}
      />
    );
  }

  // Default: show Record + Upload + AI Voice options (3-column)
  return (
    <div className="grid grid-cols-3 gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-xs gap-1.5 h-auto py-3 flex-col border-primary/30 hover:border-primary hover:bg-primary/5"
        onClick={onStartRecording}
      >
        <Mic className="h-5 w-5 text-primary" />
        Record with Mic
      </Button>
      <div
        {...getRootProps()}
        className="border border-dashed rounded-md p-3 text-center cursor-pointer hover:border-primary/50 transition-colors flex flex-col items-center justify-center"
      >
        <input {...getInputProps()} />
        <Upload className="h-5 w-5 text-muted-foreground mb-1" />
        <p className="text-xs text-muted-foreground">Upload File</p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-xs gap-1.5 h-auto py-3 flex-col border-primary/30 hover:border-primary hover:bg-primary/5"
        onClick={() => setMode('ai_voice')}
      >
        <Sparkles className="h-5 w-5 text-primary" />
        AI Voice
      </Button>
    </div>
  );
};

export type { TimelineSegment, SegmentType };
