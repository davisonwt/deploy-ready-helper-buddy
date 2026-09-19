import { useCallback, useId, useRef, useState } from 'react';
import { Loader2, ImagePlus, X, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatSizeMessage, mapStorageUploadError } from '@/lib/uploadErrors';
import { moderateStorageUpload, moderationRejectionMessage } from '@/lib/moderation/moderateUpload';
import { resizeImage } from '@/lib/media/resizeImage';

export interface StoryPhotoResult {
  url: string;
  storagePath: string;
}

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const MIME_REJECTION_MESSAGE = "That file type isn't supported — use JPG, PNG, GIF or WEBP.";

interface Props {
  /** user id -- always writes to `${pathPrefix}/story-photo.webp`. */
  pathPrefix: string;
  value: StoryPhotoResult | null;
  onChange: (result: StoryPhotoResult | null) => void;
}

/**
 * My Story's profile photo -- same upload -> moderate -> storage-object
 * pipeline as StallImageUpload.tsx (private "stalls" bucket,
 * moderateStorageUpload, resizeImage), but a fixed filename + upsert:true
 * like StallPdfUpload.tsx's story PDF, since a photo has exactly one
 * "current" version rather than a gallery -- re-uploading replaces it in
 * place instead of orphaning the old object.
 */
export default function StoryPhotoUpload({ pathPrefix, value, onChange }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  // The upload path is fixed (upsert), so replacing a photo keeps the same
  // URL -- without this, this component's own <img> would keep showing
  // the byte it already had cached for that URL right after a successful
  // re-upload. Bumped locally on every successful upload; never part of
  // the value passed to onChange (and so never what gets persisted) --
  // that stays the clean canonical URL.
  const [bustNonce, setBustNonce] = useState(0);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPG, PNG, GIF, or WEBP).');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const resized = await resizeImage(file, 'square', 600);
      if (resized.blob.size > MAX_UPLOAD_SIZE_BYTES) {
        setError(formatSizeMessage(resized.blob, MAX_UPLOAD_SIZE_BYTES));
        return;
      }

      const path = `${pathPrefix}/story-photo.webp`;
      const { error: uploadErr } = await supabase.storage.from('stalls').upload(path, resized.blob, {
        cacheControl: '3600',
        contentType: 'image/webp',
        upsert: true,
      });
      if (uploadErr) {
        setError(mapStorageUploadError(uploadErr, resized.blob, MAX_UPLOAD_SIZE_BYTES, MIME_REJECTION_MESSAGE));
        return;
      }

      const { verdict, reason } = await moderateStorageUpload('stalls', path, 'image');
      if (verdict !== 'allow') {
        setError(moderationRejectionMessage(reason));
        await supabase.storage.from('stalls').remove([path]);
        return;
      }

      const { data: pub } = supabase.storage.from('stalls').getPublicUrl(path);
      setBustNonce((n) => n + 1);
      onChange({ url: pub.publicUrl, storagePath: path });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not process that image.');
    } finally {
      setBusy(false);
    }
  }, [pathPrefix, onChange]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const clear = async () => {
    if (inputRef.current) inputRef.current.value = '';
    setError(null);
    if (value?.storagePath) {
      await supabase.storage.from('stalls').remove([value.storagePath]);
    }
    onChange(null);
  };

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed cursor-pointer overflow-hidden transition-colors shrink-0
          ${dragOver ? 'border-primary bg-primary/5' : error ? 'border-destructive/60' : 'border-border hover:border-primary/60'}`}
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : value ? (
          <>
            <img src={bustNonce > 0 ? `${value.url}${value.url.includes('?') ? '&' : '?'}v=${bustNonce}` : value.url} alt="Your story photo" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); void clear(); }}
              aria-label="Remove photo"
              className="absolute top-0.5 right-0.5 rounded-full bg-background/80 p-1 hover:bg-destructive hover:text-destructive-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center text-center px-1">
            <User className="h-5 w-5 text-muted-foreground" />
            <ImagePlus className="h-3 w-3 -mt-1 text-muted-foreground" />
          </div>
        )}
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
