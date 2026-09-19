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
      // The upload path is fixed (upsert) so every replacement reuses the
      // same URL -- found live: Supabase's storage CDN does not appear to
      // invalidate its own cache on overwrite, so a fresh page load (a
      // brand-new browser context, not this browser's own cache) still
      // received the PREVIOUS photo's bytes after a real replace. A
      // version marker baked into the persisted URL itself, not just this
      // component's own local preview, is what actually fixes that --
      // every consumer (this editor, the My Story sheet, anyone, anytime)
      // gets a genuinely different URL after a change.
      const bustedUrl = `${pub.publicUrl}?v=${Date.now()}`;
      onChange({ url: bustedUrl, storagePath: path });
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
      {/* The remove button lives OUTSIDE the label -- the label clips to a
          circle via overflow-hidden (rounded-full), and a button
          positioned in its corner (top-right) sits in the square
          bounding-box area the circle's own curve cuts away, clipped out
          along with it. A sibling of the (non-clipped) outer wrapper
          instead, so it's never behind its own container's mask. */}
      <div className="relative h-24 w-24 shrink-0">
        <label
          htmlFor={inputId}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed cursor-pointer overflow-hidden transition-colors
            ${dragOver ? 'border-primary bg-primary/5' : error ? 'border-destructive/60' : 'border-border hover:border-primary/60'}`}
        >
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : value ? (
            <img src={value.url} alt="Your story photo" className="h-full w-full object-cover" />
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
        {value && !busy && (
          <button
            type="button"
            onClick={() => void clear()}
            aria-label="Remove photo"
            className="absolute -top-1 -right-1 rounded-full border border-border bg-background p-1 shadow hover:bg-destructive hover:text-destructive-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
