/**
 * HeartsMediaUpload — photos (up to 6) + voice note (30-60s) uploader.
 * Stores in private bucket `tribal-hearts-media`; persists URLs on profile.
 */
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTribalHeartsProfile } from '@/hooks/useTribalHeartsProfile';
import { toast } from 'sonner';
import { Camera, Mic, Square, Trash2, Play, Pause, Loader2, ImagePlus } from 'lucide-react';

const BUCKET = 'tribal-hearts-media';
const MAX_PHOTOS = 6;
const MIN_VOICE_SEC = 10;
const MAX_VOICE_SEC = 60;

async function signedUrl(path: string): Promise<string | null> {
  if (!path) return null;
  // Path stored as bucket-relative; create a 1h signed URL
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export function HeartsMediaUpload() {
  const { user } = useAuth();
  const { profile, save, reload } = useTribalHeartsProfile();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [resolvedPhotos, setResolvedPhotos] = useState<Record<string, string>>({});
  const [voicePlayingUrl, setVoicePlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Recording state
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recTimer = useRef<number | null>(null);

  if (!user || !profile) return null;

  const photos = profile.photos ?? [];
  const remaining = Math.max(0, MAX_PHOTOS - photos.length);

  // Resolve signed URLs lazily
  async function resolve(path: string) {
    if (resolvedPhotos[path]) return;
    const url = await signedUrl(path);
    if (url) setResolvedPhotos(prev => ({ ...prev, [path]: url }));
  }
  photos.forEach(resolve);

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, remaining);
    if (!files.length) return;
    setUploading(true);
    try {
      const newPaths: string[] = [];
      for (const f of files) {
        if (!f.type.startsWith('image/')) continue;
        if (f.size > 5 * 1024 * 1024) {
          toast.error(`${f.name} is over 5MB — please pick a smaller photo`);
          continue;
        }
        const ext = f.name.split('.').pop() || 'jpg';
        const path = `${user.id}/photos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, f, { upsert: false, contentType: f.type });
        if (error) { toast.error(error.message); continue; }
        newPaths.push(path);
      }
      if (newPaths.length) {
        await save({ photos: [...photos, ...newPaths] } as any);
        toast.success(`Added ${newPaths.length} photo${newPaths.length === 1 ? '' : 's'} 🌸`);
      }
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function removePhoto(path: string) {
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    await save({ photos: photos.filter(p => p !== path) } as any);
    toast.success('Photo removed');
  }

  // ---- Voice note ----
  async function startRec() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (recTimer.current) { window.clearInterval(recTimer.current); recTimer.current = null; }
        const dur = recSec;
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (dur < MIN_VOICE_SEC) {
          toast.error(`Voice notes must be at least ${MIN_VOICE_SEC} seconds`);
          setRecSec(0);
          return;
        }
        await uploadVoice(blob, Math.min(dur, MAX_VOICE_SEC));
        setRecSec(0);
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
      setRecSec(0);
      recTimer.current = window.setInterval(() => {
        setRecSec(s => {
          if (s + 1 >= MAX_VOICE_SEC) { stopRec(); return MAX_VOICE_SEC; }
          return s + 1;
        });
      }, 1000);
    } catch (e: any) {
      toast.error(e?.message ?? 'Microphone access denied');
    }
  }

  function stopRec() {
    setRecording(false);
    recRef.current?.stop();
  }

  async function uploadVoice(blob: Blob, dur: number) {
    setUploading(true);
    try {
      // Remove old voice note if any
      if (profile?.voice_note_url) {
        await supabase.storage.from(BUCKET).remove([profile.voice_note_url]).catch(() => {});
      }
      const path = `${user!.id}/voice/${Date.now()}.webm`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'audio/webm', upsert: false });
      if (error) throw error;
      await save({ voice_note_url: path, voice_note_duration_sec: dur } as any);
      toast.success('Voice note saved 💚');
      await reload();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not save voice note');
    } finally { setUploading(false); }
  }

  async function deleteVoice() {
    if (!profile?.voice_note_url) return;
    await supabase.storage.from(BUCKET).remove([profile.voice_note_url]).catch(() => {});
    await save({ voice_note_url: null, voice_note_duration_sec: null } as any);
    toast.success('Voice note removed');
  }

  async function playVoice() {
    if (!profile?.voice_note_url) return;
    if (voicePlayingUrl) {
      audioRef.current?.pause();
      setVoicePlayingUrl(null);
      return;
    }
    const url = await signedUrl(profile.voice_note_url);
    if (!url) { toast.error('Could not load voice note'); return; }
    const a = new Audio(url);
    audioRef.current = a;
    a.onended = () => setVoicePlayingUrl(null);
    a.play();
    setVoicePlayingUrl(url);
  }

  return (
    <div className="space-y-5">
      {/* Photos */}
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-foreground">Photos</div>
            <div className="text-xs text-muted-foreground">Add up to {MAX_PHOTOS} — bright, recent and unfiltered ✨</div>
          </div>
          <Button
            onClick={() => fileInput.current?.click()}
            disabled={uploading || remaining === 0}
            size="sm"
            variant="outline"
          >
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
            Add ({remaining} left)
          </Button>
          <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={handlePhotoSelect} />
        </div>
        {photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {photos.map((path) => (
              <div key={path} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
                {resolvedPhotos[path] ? (
                  <img src={resolvedPhotos[path]} alt="profile" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
                <button
                  onClick={() => removePhoto(path)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label="Remove photo"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
            <Camera className="mx-auto mb-1 h-6 w-6 opacity-60" />
            No photos yet — your warmth shines through with at least one.
          </div>
        )}
      </Card>

      {/* Voice note */}
      <Card className="space-y-3 p-4">
        <div>
          <div className="font-semibold text-foreground">Voice note</div>
          <div className="text-xs text-muted-foreground">
            A 30–60 second hello — your voice carries the truth that words alone can't.
          </div>
        </div>
        {profile.voice_note_url ? (
          <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/50 p-3">
            <Button onClick={playVoice} size="icon" variant="secondary" className="rounded-full">
              {voicePlayingUrl ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <div className="flex-1 text-sm">
              <div className="font-medium">Your voice note</div>
              <div className="text-xs text-muted-foreground">{profile.voice_note_duration_sec ?? 0}s</div>
            </div>
            <Button onClick={deleteVoice} size="sm" variant="ghost"><Trash2 className="h-4 w-4" /></Button>
          </div>
        ) : recording ? (
          <div className="flex items-center gap-3 rounded-xl border border-rose-500/40 bg-rose-500/5 p-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-500" />
            </span>
            <div className="flex-1 text-sm font-medium">Recording… {recSec}s</div>
            <Button onClick={stopRec} size="sm" variant="destructive">
              <Square className="mr-1 h-4 w-4" /> Stop
            </Button>
          </div>
        ) : (
          <Button onClick={startRec} disabled={uploading} variant="outline" className="w-full">
            <Mic className="mr-2 h-4 w-4" /> Record a 30–60s hello
          </Button>
        )}
      </Card>
    </div>
  );
}
