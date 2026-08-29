import { useCallback, useRef, useState } from 'react';
import { Loader2, Music, UploadCloud, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { invokePaymentFunction } from '@/lib/payments/invokeFunction';
import { formatSizeMessage, mapStorageUploadError } from '@/lib/uploadErrors';

export type SeedKind = 'audio' | 'image' | 'document';

export interface SeedFileResult {
  file: File;
  fileUrl: string;
  storagePath: string;
  duration?: number;
  width?: number;
  height?: number;
  pageCount?: number;
  previewUrl?: string | null;
  /**
   * Only meaningful when generatePreview is true (audio).
   * 'unsupported' — the format itself can't be trimmed (not WAV/MP3): blocks
   *   Plant per spec-seed-protection.md ("if preview generation fails, the
   *   upload fails" — written for this case specifically).
   * 'preview_failed' — the main file uploaded fine and IS a supported
   *   format; only the preview step failed for an infrastructure reason
   *   (e.g. preview_upload_failed). Does not block Plant — retry-seed-previews
   *   fills preview_url in later.
   */
  previewStatus: 'idle' | 'reading' | 'uploading' | 'generating' | 'ready' | 'unsupported' | 'preview_failed' | 'error';
  previewMessage?: string;
}

interface Props {
  kind: SeedKind;
  /** Storage bucket the full file uploads to — private, matches every other seed upload path. */
  bucket: string;
  /** e.g. `products/${user.id}` */
  pathPrefix: string;
  /** Audio only, for now — the new 45s server-side preview (spec-seed-protection Phase 1). */
  generatePreview?: boolean;
  accept?: string;
  allowedLabel?: string;
  onChange: (result: SeedFileResult | null) => void;
}

const AUDIO_EXTENSIONS = ['wav', 'mp3', 'flac', 'aac', 'm4a', 'ogg'];
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const DOCUMENT_EXTENSIONS = ['pdf', 'epub'];

// Only kinds with an explicit ceiling get checked — 'document' has none yet.
const MAX_SIZE_BYTES: Partial<Record<SeedKind, number>> = {
  audio: 150 * 1024 * 1024,
  image: 10 * 1024 * 1024,
};

const MIME_REJECTION_MESSAGE: Record<SeedKind, string> = {
  audio: "That file type isn't supported — use WAV, MP3, FLAC, M4A or OGG.",
  image: "That file type isn't supported — use JPG, PNG, GIF or WEBP.",
  document: "That file type isn't supported — use PDF or EPUB.",
};

function extOf(file: File): string {
  return file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
}

function readAudioDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const d = Number.isFinite(audio.duration) ? audio.duration : undefined;
      URL.revokeObjectURL(url);
      resolve(d);
    };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(undefined); };
    audio.src = url;
  });
}

function readImageDimensions(file: File): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const result = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(result);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({}); };
    img.src = url;
  });
}

/** Rough heuristic, not a real PDF parser: counts "/Type /Page" object occurrences in the raw bytes. */
async function readPdfPageCount(file: File): Promise<number | undefined> {
  try {
    const text = await file.slice(0, 5 * 1024 * 1024).text();
    const matches = text.match(/\/Type\s*\/Page[^s]/g);
    return matches?.length || undefined;
  } catch {
    return undefined;
  }
}

export default function SeedDropZone({
  kind,
  bucket,
  pathPrefix,
  generatePreview = false,
  accept,
  allowedLabel,
  onChange,
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<SeedFileResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const extensions = kind === 'audio' ? AUDIO_EXTENSIONS : kind === 'image' ? IMAGE_EXTENSIONS : DOCUMENT_EXTENSIONS;

  const emit = useCallback((next: SeedFileResult | null) => {
    setResult(next);
    onChange(next);
  }, [onChange]);

  const handleFile = useCallback(async (file: File) => {
    const ext = extOf(file);
    if (!extensions.includes(ext)) {
      emit({
        file, fileUrl: '', storagePath: '', previewStatus: 'error',
        previewMessage: `That file type isn't supported. Allowed: ${allowedLabel ?? extensions.join(', ')}.`,
      });
      return;
    }

    const maxSize = MAX_SIZE_BYTES[kind];
    if (maxSize && file.size > maxSize) {
      emit({
        file, fileUrl: '', storagePath: '', previewStatus: 'error',
        previewMessage: formatSizeMessage(file, maxSize),
      });
      return;
    }

    let base: Partial<SeedFileResult> = {};
    emit({ file, fileUrl: '', storagePath: '', previewStatus: 'reading', ...base });

    if (kind === 'audio') {
      base.duration = await readAudioDuration(file);
    } else if (kind === 'image') {
      base = { ...base, ...(await readImageDimensions(file)) };
    } else if (kind === 'document' && ext === 'pdf') {
      base.pageCount = await readPdfPageCount(file);
    }

    emit({ file, fileUrl: '', storagePath: '', previewStatus: 'uploading', ...base });

    const path = `${pathPrefix}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadErr) {
      const message = mapStorageUploadError(uploadErr, file, maxSize ?? file.size, MIME_REJECTION_MESSAGE[kind]);
      emit({ file, fileUrl: '', storagePath: '', previewStatus: 'error', previewMessage: message, ...base });
      return;
    }
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);

    if (!generatePreview) {
      emit({ file, fileUrl: pub.publicUrl, storagePath: path, previewStatus: 'ready', ...base });
      return;
    }

    emit({ file, fileUrl: pub.publicUrl, storagePath: path, previewStatus: 'generating', ...base });
    try {
      const { previewUrl } = await invokePaymentFunction<{ previewUrl: string }>('generate-preview', { bucket, path });
      emit({ file, fileUrl: pub.publicUrl, storagePath: path, previewUrl, previewStatus: 'ready', ...base });
    } catch (err: any) {
      if (err?.message === 'unsupported_preview_format') {
        // Format-unsupported policy block (spec-seed-protection.md) —
        // the sower needs a different file, so this still blocks Plant.
        emit({
          file, fileUrl: pub.publicUrl, storagePath: path, previewStatus: 'unsupported',
          previewMessage: "We can only generate a preview from WAV or MP3 right now — please upload one of those formats.",
          ...base,
        });
        return;
      }
      // Any other failure (preview_upload_failed, a network blip, etc.) —
      // the main file is already safely uploaded and IS a supported
      // format; this is an infrastructure hiccup, not a reason to block
      // planting. retry-seed-previews fills preview_url in automatically.
      console.error('generate-preview failed (non-blocking):', err);
      emit({
        file, fileUrl: pub.publicUrl, storagePath: path, previewStatus: 'preview_failed',
        previewMessage: "Track uploaded. Preview couldn't be generated — we'll retry it automatically.",
        ...base,
      });
    }
  }, [bucket, pathPrefix, generatePreview, kind, extensions, allowedLabel, emit]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const clear = () => {
    if (inputRef.current) inputRef.current.value = '';
    emit(null);
  };

  const busy = result && ['reading', 'uploading', 'generating'].includes(result.previewStatus);
  const isError = result?.previewStatus === 'error' || result?.previewStatus === 'unsupported';
  const isPreviewFailed = result?.previewStatus === 'preview_failed';
  const isReady = result?.previewStatus === 'ready' || isPreviewFailed;

  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center w-full min-h-28 border-2 border-dashed rounded-xl cursor-pointer transition-colors p-4 text-center
          ${dragOver ? 'border-primary bg-primary/5' : isError ? 'border-destructive/60' : 'border-border hover:border-primary/60'}`}
      >
        {busy ? (
          <>
            <Loader2 className="w-6 h-6 mb-2 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {result?.previewStatus === 'uploading' ? 'Uploading…' : result?.previewStatus === 'generating' ? 'Making your 45-second preview…' : 'Reading file…'}
            </p>
          </>
        ) : isReady ? (
          <>
            <CheckCircle2 className="w-6 h-6 mb-2 text-emerald-500" />
            <p className="text-sm font-medium truncate max-w-full">{result?.file.name}</p>
            <button type="button" onClick={(e) => { e.preventDefault(); clear(); }} className="mt-1 text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1">
              <X className="w-3 h-3" /> Choose a different file
            </button>
            {isPreviewFailed && result?.previewMessage && (
              <p className="mt-2 text-xs text-muted-foreground flex items-start gap-1.5 text-left">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {result.previewMessage}
              </p>
            )}
          </>
        ) : (
          <>
            {kind === 'audio' ? <Music className="w-6 h-6 mb-2 text-muted-foreground" /> : <UploadCloud className="w-6 h-6 mb-2 text-muted-foreground" />}
            <p className="text-sm text-muted-foreground">Drop a file here, or tap to choose</p>
            {allowedLabel && <p className="text-xs text-muted-foreground mt-0.5">{allowedLabel}</p>}
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </label>
      {isError && result?.previewMessage && (
        <p className="mt-2 text-sm text-destructive flex items-start gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {result.previewMessage}
        </p>
      )}
    </div>
  );
}
