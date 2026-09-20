import { useCallback, useId, useRef, useState } from 'react';
import { Loader2, Mic, X, Play, Pause } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatSizeMessage, mapStorageUploadError } from '@/lib/uploadErrors';
import { moderateStorageUpload, moderationRejectionMessage } from '@/lib/moderation/moderateUpload';
import { invokePaymentFunction } from '@/lib/payments/invokeFunction';

export interface StallWelcomeAudioResult {
  url: string;
  /** Storage path (stalls bucket) if this came from an upload this session -- null when loaded back from the saved stall row (only the public URL is persisted). */
  storagePath: string | null;
}

const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;
const MAX_DURATION_SECONDS = 60;
const ALLOWED_EXT = ['wav', 'mp3'];
const MIME_REJECTION_MESSAGE = "That file type isn't supported — use WAV or MP3.";

interface Props {
  pathPrefix: string;
  value: StallWelcomeAudioResult | null;
  onChange: (result: StallWelcomeAudioResult | null) => void;
}

function extOf(file: File): string {
  return file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
}

/**
 * Upload control for a stall's welcome voice note -- WAV/MP3 only,
 * duration always server-probed (never trusted from the browser), max
 * 60s with a clear rejection. Same stalls bucket + owner-folder
 * convention as StallImageUpload.tsx's front/interior images.
 */
export default function StallWelcomeAudioUpload({ pathPrefix, value, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const inputId = useId();

  const handleFile = useCallback(async (file: File) => {
    const ext = extOf(file);
    if (!ALLOWED_EXT.includes(ext)) {
      setError(MIME_REJECTION_MESSAGE);
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setError(formatSizeMessage(file, MAX_UPLOAD_SIZE_BYTES));
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const path = `${pathPrefix}/${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('stalls').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (uploadErr) {
        setError(mapStorageUploadError(uploadErr, file, MAX_UPLOAD_SIZE_BYTES, MIME_REJECTION_MESSAGE));
        return;
      }

      const { verdict, reason } = await moderateStorageUpload('stalls', path, 'image');
      if (verdict !== 'allow') {
        setError(moderationRejectionMessage(reason));
        await supabase.storage.from('stalls').remove([path]);
        return;
      }

      const { durationSeconds } = await invokePaymentFunction<{ durationSeconds: number }>('probe-audio-duration', { path, bucket: 'stalls' });
      if (durationSeconds > MAX_DURATION_SECONDS) {
        setError(`That's ${durationSeconds}s — welcome notes are ${MAX_DURATION_SECONDS}s or shorter. Trim it and try again.`);
        await supabase.storage.from('stalls').remove([path]);
        return;
      }

      const { data: pub } = supabase.storage.from('stalls').getPublicUrl(path);
      onChange({ url: pub.publicUrl, storagePath: path });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not process that file.');
    } finally {
      setBusy(false);
    }
  }, [pathPrefix, onChange]);

  const remove = () => {
    if (inputRef.current) inputRef.current.value = '';
    setError(null);
    setPlaying(false);
    onChange(null);
  };

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); } else { void el.play(); }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Welcome voice note (optional)</label>
      <p className="text-xs text-muted-foreground">Plays once for each visitor who steps into your stall's interior. WAV or MP3, {MAX_DURATION_SECONDS}s max.</p>
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
          <button type="button" onClick={togglePlay} className="shrink-0 rounded-full bg-primary/10 p-2 text-primary hover:bg-primary/20">
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <audio
            ref={audioRef}
            src={value.url}
            className="hidden"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
          />
          <span className="flex-1 text-sm text-muted-foreground">Welcome note uploaded</span>
          <button type="button" onClick={remove} className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={`flex items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 cursor-pointer transition-colors
            ${error ? 'border-destructive/60' : 'border-border hover:border-primary/60'}`}
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Mic className="h-5 w-5 text-muted-foreground" />}
          <span className="text-sm text-muted-foreground">{busy ? 'Uploading…' : 'Choose WAV or MP3'}</span>
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept=".wav,.mp3"
            className="sr-only"
            disabled={busy}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </label>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
