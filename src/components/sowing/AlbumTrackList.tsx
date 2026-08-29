import { useCallback, useRef, useState } from 'react';
import { AlertCircle, GripVertical, Loader2, Music, UploadCloud, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { formatSizeMessage, mapStorageUploadError } from '@/lib/uploadErrors';

export interface AlbumTrack {
  localId: string;
  file: File;
  name: string;
  size: number;
  status: 'uploading' | 'ready' | 'error';
  path?: string;
  url?: string;
  price: number | null;
  errorMessage?: string;
}

interface Props {
  /** Storage bucket the tracks upload to — same private bucket every other seed file uses. */
  bucket: string;
  /** Base folder for this album's tracks, e.g. `products/${user.id}/${timestamp}`. */
  pathPrefix: string;
  allowedLabel?: string;
  onChange: (tracks: AlbumTrack[]) => void;
}

const AUDIO_EXTENSIONS = ['wav', 'mp3', 'flac', 'aac', 'm4a', 'ogg'];
const MAX_TRACK_SIZE_BYTES = 150 * 1024 * 1024;
const MIME_REJECTION_MESSAGE = "That file type isn't supported — use WAV, MP3, FLAC, M4A or OGG.";

function extOf(file: File): string {
  return file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
}

function isAllowedAudioFile(file: File): boolean {
  if (!AUDIO_EXTENSIONS.includes(extOf(file))) return false;
  if (file.type && !file.type.startsWith('audio/') && file.type !== 'application/octet-stream') return false;
  return true;
}

// Same sanitizer as the old album upload form, so track paths look the same.
function sanitizeFileName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .slice(0, 200);
}

/**
 * Multi-file drop zone for an album's tracks — spec-sowing-forms.md's
 * "Music — album" form. Files are ordered by filename on drop, uploaded
 * immediately (same pattern as SeedDropZone/CoverDropZone), and can be
 * dragged into a different order afterwards. Per-track price is optional
 * metadata carried in the album manifest, not a separate purchasable row.
 */
export default function AlbumTrackList({ bucket, pathPrefix, allowedLabel, onChange }: Props) {
  const [tracks, setTracks] = useState<AlbumTrack[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const dragIndexRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const emit = useCallback((updater: (prev: AlbumTrack[]) => AlbumTrack[]) => {
    setTracks((prev) => {
      const next = updater(prev);
      onChange(next);
      return next;
    });
  }, [onChange]);

  const uploadTrack = useCallback(async (track: AlbumTrack) => {
    const ext = extOf(track.file);
    const baseName = track.file.name.replace(/\.[^.]+$/, '');
    const safeName = `${sanitizeFileName(baseName)}${ext ? '.' + sanitizeFileName(ext) : ''}`;
    const path = `${pathPrefix}/${safeName}`;
    const { error } = await supabase.storage.from(bucket).upload(path, track.file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (error) {
      const message = mapStorageUploadError(error, track.file, MAX_TRACK_SIZE_BYTES, MIME_REJECTION_MESSAGE);
      emit((prev) => prev.map((t) => (t.localId === track.localId ? { ...t, status: 'error', errorMessage: message } : t)));
      return;
    }
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    emit((prev) => prev.map((t) => (t.localId === track.localId ? { ...t, status: 'ready', path, url: pub.publicUrl } : t)));
  }, [bucket, pathPrefix, emit]);

  const addFiles = useCallback((files: File[]) => {
    const audioFiles = files.filter(isAllowedAudioFile);
    if (audioFiles.length === 0) return;
    const sorted = [...audioFiles].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
    const newTracks: AlbumTrack[] = sorted.map((file) => {
      const oversized = file.size > MAX_TRACK_SIZE_BYTES;
      return {
        localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        name: file.name,
        size: file.size,
        status: oversized ? 'error' : 'uploading',
        price: null,
        ...(oversized ? { errorMessage: formatSizeMessage(file, MAX_TRACK_SIZE_BYTES) } : {}),
      };
    });
    emit((prev) => [...prev, ...newTracks]);
    newTracks.filter((t) => t.status === 'uploading').forEach((t) => uploadTrack(t));
  }, [emit, uploadTrack]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(Array.from(e.dataTransfer.files));
  };

  const removeTrack = (localId: string) => {
    emit((prev) => prev.filter((t) => t.localId !== localId));
  };

  const setTrackPrice = (localId: string, price: number | null) => {
    emit((prev) => prev.map((t) => (t.localId === localId ? { ...t, price } : t)));
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    emit((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center w-full min-h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors p-4 text-center
          ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60'}`}
      >
        <UploadCloud className="w-6 h-6 mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Drop your tracks here, or tap to choose — select several at once</p>
        {allowedLabel && <p className="text-xs text-muted-foreground mt-0.5">{allowedLabel}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={AUDIO_EXTENSIONS.map((e) => `.${e}`).join(',')}
          multiple
          className="hidden"
          onChange={(e) => { if (e.target.files?.length) addFiles(Array.from(e.target.files)); e.target.value = ''; }}
        />
      </label>

      {tracks.length > 0 && (
        <ul className="space-y-1.5">
          {tracks.map((t, i) => (
            <li
              key={t.localId}
              draggable
              onDragStart={() => { dragIndexRef.current = i; }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const from = dragIndexRef.current;
                dragIndexRef.current = null;
                if (from !== null) reorder(from, i);
              }}
              className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-transparent hover:border-border transition-colors"
            >
              <GripVertical className="w-4 h-4 text-muted-foreground shrink-0 cursor-grab" />
              <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
              {t.status === 'uploading' ? (
                <Loader2 className="w-4 h-4 shrink-0 animate-spin text-primary" />
              ) : t.status === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0 text-destructive" />
              ) : (
                <Music className="w-4 h-4 shrink-0 text-emerald-500" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{t.name}</p>
                {t.status === 'error' && t.errorMessage && (
                  <p className="text-xs text-destructive truncate">{t.errorMessage}</p>
                )}
              </div>
              <div className="relative w-20 shrink-0">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="optional"
                  value={t.price ?? ''}
                  onChange={(e) => setTrackPrice(t.localId, e.target.value === '' ? null : Number(e.target.value))}
                  className="h-8 pl-5 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => removeTrack(t.localId)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
