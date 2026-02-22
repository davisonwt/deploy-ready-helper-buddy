import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Mic, Square, Play, Pause, Download, Trash2, Plus, Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Recording {
  id: string;
  title: string;
  blob: Blob;
  duration: number;
  createdAt: Date;
  savedPath?: string;
}

interface VoiceRecorderStudioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VoiceRecorderStudio: React.FC<VoiceRecorderStudioProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTitle, setRecordingTitle] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Notes & AI state
  const [notes, setNotes] = useState('');
  const [generatedScript, setGeneratedScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const title = recordingTitle.trim() || `Recording ${recordings.length + 1}`;
        const duration = recordingTime;

        setRecordings(prev => [...prev, {
          id: crypto.randomUUID(),
          title,
          blob,
          duration,
          createdAt: new Date(),
        }]);

        stream.getTracks().forEach(t => t.stop());
        setRecordingTitle('');
        setRecordingTime(0);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      toast({ title: 'Microphone Error', description: 'Could not access microphone.', variant: 'destructive' });
    }
  }, [recordingTitle, recordings.length, recordingTime, toast]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const playRecording = (rec: Recording) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (playingId === rec.id) { setPlayingId(null); return; }
    const url = URL.createObjectURL(rec.blob);
    const audio = new Audio(url);
    audio.onended = () => { setPlayingId(null); URL.revokeObjectURL(url); };
    audio.play();
    audioRef.current = audio;
    setPlayingId(rec.id);
  };

  const deleteRecording = (id: string) => {
    if (playingId === id && audioRef.current) { audioRef.current.pause(); setPlayingId(null); }
    setRecordings(prev => prev.filter(r => r.id !== id));
  };

  const downloadRecording = async (rec: Recording) => {
    try {
      const arrayBuffer = await rec.blob.arrayBuffer();
      const audioCtx = new AudioContext();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const numChannels = audioBuffer.numberOfChannels;
      const sampleRate = audioBuffer.sampleRate;
      const length = audioBuffer.length;

      const interleaved = new Float32Array(length * numChannels);
      for (let ch = 0; ch < numChannels; ch++) {
        const channelData = audioBuffer.getChannelData(ch);
        for (let i = 0; i < length; i++) {
          interleaved[i * numChannels + ch] = channelData[i];
        }
      }
      const pcm = new Int16Array(interleaved.length);
      for (let i = 0; i < interleaved.length; i++) {
        const s = Math.max(-1, Math.min(1, interleaved[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }

      const wavBuffer = new ArrayBuffer(44 + pcm.length * 2);
      const view = new DataView(wavBuffer);
      const writeStr = (off: number, str: string) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
      writeStr(0, 'RIFF');
      view.setUint32(4, 36 + pcm.length * 2, true);
      writeStr(8, 'WAVE');
      writeStr(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numChannels * 2, true);
      view.setUint16(32, numChannels * 2, true);
      view.setUint16(34, 16, true);
      writeStr(36, 'data');
      view.setUint32(40, pcm.length * 2, true);
      for (let i = 0; i < pcm.length; i++) view.setInt16(44 + i * 2, pcm[i], true);

      const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${rec.title}-${Date.now()}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      audioCtx.close();
    } catch {
      const url = URL.createObjectURL(rec.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${rec.title}-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const saveToCloud = async (rec: Recording) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const filePath = `radio-voice-segments/${user.id}/${Date.now()}-${rec.title}.webm`;
      const { error } = await supabase.storage.from('chat-files').upload(filePath, rec.blob);
      if (error) throw error;
      setRecordings(prev => prev.map(r => r.id === rec.id ? { ...r, savedPath: filePath } : r));
      toast({ title: 'Saved to Cloud', description: 'Recording saved. You can upload it into a timeline slot later.' });
    } catch (err: any) {
      toast({ title: 'Save Failed', description: err.message, variant: 'destructive' });
    }
  };

  const generateScript = async () => {
    if (!notes.trim()) {
      toast({ title: 'Notes Required', description: 'Write some rough notes first, then let AI polish them.', variant: 'destructive' });
      return;
    }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-radio-script', {
        body: { notes: notes.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGeneratedScript(data.script || '');
      toast({ title: 'Script Generated', description: 'Your notes have been polished into a radio script.' });
    } catch (err: any) {
      toast({ title: 'Generation Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyScript = () => {
    navigator.clipboard.writeText(generatedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card bg-background/95 border-primary/20 max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Mic className="w-5 h-5 text-primary" /> Voice Recording Studio
          </DialogTitle>
          <DialogDescription>
            Record voice segments, refine notes with AI, download as WAV, and upload them into your radio timeline slots later.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 max-h-[calc(85vh-120px)]">
          <div className="space-y-4 pr-4">
            {/* Notes & AI Section */}
            <div className="glass-panel rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> Script Notes & AI
              </p>
              <Textarea
                placeholder="Write your rough notes here... bullet points, talking points, anything. AI will polish them into a smooth radio script."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="min-h-[80px] text-sm"
              />
              <Button
                size="sm"
                onClick={generateScript}
                disabled={isGenerating || !notes.trim()}
                className="gap-1.5"
              >
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {isGenerating ? 'Generating...' : 'AI Refine Script'}
              </Button>

              {generatedScript && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Generated Script</p>
                    <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={copyScript}>
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                    {generatedScript}
                  </div>
                </div>
              )}
            </div>

            {/* Recorder */}
            <div className="glass-panel rounded-xl p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Recording title (optional)"
                  value={recordingTitle}
                  onChange={e => setRecordingTitle(e.target.value)}
                  disabled={isRecording}
                  className="flex-1"
                />
                {!isRecording ? (
                  <Button onClick={startRecording} size="icon" variant="default" className="bg-destructive hover:bg-destructive/90 shrink-0">
                    <Mic className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button onClick={stopRecording} size="icon" variant="destructive" className="shrink-0 animate-pulse">
                    <Square className="w-4 h-4" />
                  </Button>
                )}
              </div>
              {isRecording && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  <span className="text-destructive font-mono font-semibold">{formatTime(recordingTime)}</span>
                  <span className="text-muted-foreground">Recording...</span>
                </div>
              )}
            </div>

            {/* Recordings List */}
            {recordings.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Mic className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No recordings yet. Hit the mic to start!</p>
              </div>
            )}
            {recordings.map(rec => (
              <div key={rec.id} className="glass-card rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <Button size="icon" variant="ghost" className="shrink-0" onClick={() => playRecording(rec)}>
                    {playingId === rec.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{rec.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(rec.duration)}
                      {rec.savedPath && <Badge variant="outline" className="ml-2 text-[10px] px-1">Cloud ✓</Badge>}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pl-12">
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => downloadRecording(rec)} title="Download WAV">
                    <Download className="w-3.5 h-3.5" /> Download
                  </Button>
                  {!rec.savedPath && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary" onClick={() => saveToCloud(rec)} title="Save to Cloud">
                      <Plus className="w-3.5 h-3.5" /> Save
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive" onClick={() => deleteRecording(rec.id)} title="Delete">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
