import { useCallback, useId, useRef, useState } from 'react';
import { Loader2, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { formatSizeMessage, mapStorageUploadError } from '@/lib/uploadErrors';
import { moderateStorageUpload, moderationRejectionMessage } from '@/lib/moderation/moderateUpload';
import { resizeImage, type ResizeMode } from '@/lib/media/resizeImage';
import { detectAnimatedImage } from '@/lib/media/detectAnimatedImage';
import type { StallTemplate } from '@/lib/stalls/stallTypes';

export interface StallImageResult {
  /** Public URL, for immediate preview / the wizard's own preview step. */
  url: string;
  /** Storage path (stalls bucket) if this came from an upload -- null for a template pick, which is a static /public asset, not a storage object. */
  storagePath: string | null;
}

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const MIME_REJECTION_MESSAGE = "That file type isn't supported — use JPG, PNG, GIF or WEBP.";
const MIN_WIDTH_PX = 800;

interface Props {
  pathPrefix: string;
  mode: ResizeMode;
  /** Max square side ('square') or max width ('width'), in px, before WebP export. */
  maxSize: number;
  value: StallImageResult | null;
  onChange: (result: StallImageResult | null) => void;
  templates?: StallTemplate[];
  /** Which template field to use as this drop zone's image -- 'front' or 'interior'. */
  templateField: 'front' | 'interior';
  label: string;
  aspectClassName?: string;
}

/**
 * Upload-or-pick-a-template control for a stall's front/interior image.
 * Mirrors CoverDropZone.tsx's upload -> moderate -> getPublicUrl shape
 * exactly, but resizes via resizeImage() (WebP, square-or-width per the
 * Farm-Stalls spec) instead of CoverDropZone's fixed JPEG square crop, and
 * adds the template-picker option CoverDropZone has no equivalent of.
 */
export default function StallImageUpload({
  pathPrefix,
  mode,
  maxSize,
  value,
  onChange,
  templates = [],
  templateField,
  label,
  aspectClassName = 'aspect-square',
}: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Unique per instance -- up to 5 of these render at once (one per tile,
  // step 3), so a hardcoded id would collide and only the first input
  // would ever actually be reachable from its label.
  const inputId = useId();

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file (JPG, PNG, GIF, or WEBP).');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      // Animated GIF/WebP: never resize through resizeImage()'s <canvas>
      // step -- drawImage() only ever captures one frame, silently
      // flattening any animation before it reaches storage. Store the
      // original bytes as-is when dimensions already comply with the same
      // rules a static image gets; reject with a clear message otherwise
      // rather than silently degrading it to a still image. detectAnimatedImage
      // returns null when it can't verify (ImageDecoder unsupported, or
      // any decode error) -- treated the same as "not animated" here, i.e.
      // falls through to the existing resize path, never a false positive.
      const animCheck = await detectAnimatedImage(file);
      if (animCheck?.isAnimated) {
        if (animCheck.width < MIN_WIDTH_PX) {
          setError(`This image is only ${animCheck.width}px wide — please use one at least ${MIN_WIDTH_PX}px wide so it doesn't look blurry once it's live.`);
          return;
        }
        if (file.size > MAX_UPLOAD_SIZE_BYTES) {
          setError(formatSizeMessage(file, MAX_UPLOAD_SIZE_BYTES));
          return;
        }
        const ext = file.type === 'image/gif' ? 'gif' : 'webp';
        const path = `${pathPrefix}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('stalls').upload(path, file, {
          cacheControl: '3600',
          contentType: file.type,
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
        const { data: pub } = supabase.storage.from('stalls').getPublicUrl(path);
        onChange({ url: pub.publicUrl, storagePath: path });
        return;
      }

      const resized = await resizeImage(file, mode, maxSize);

      // resizeImage never upscales -- a source narrower than this comes
      // out exactly as narrow, then gets stretched to the stall's full
      // display width live, which is what actually reads as "blurry".
      // Reject it here instead, before it ever reaches storage.
      if (resized.width < MIN_WIDTH_PX) {
        setError(`This image is only ${resized.width}px wide — please use one at least ${MIN_WIDTH_PX}px wide so it doesn't look blurry once it's live.`);
        return;
      }

      if (resized.blob.size > MAX_UPLOAD_SIZE_BYTES) {
        setError(formatSizeMessage(resized.blob, MAX_UPLOAD_SIZE_BYTES));
        return;
      }

      const path = `${pathPrefix}/${Date.now()}.webp`;
      const { error: uploadErr } = await supabase.storage.from('stalls').upload(path, resized.blob, {
        cacheControl: '3600',
        contentType: 'image/webp',
        upsert: false,
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
      onChange({ url: pub.publicUrl, storagePath: path });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not process that image.');
    } finally {
      setBusy(false);
    }
  }, [mode, maxSize, pathPrefix, onChange]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const clear = () => {
    if (inputRef.current) inputRef.current.value = '';
    setError(null);
    onChange(null);
  };

  const pickTemplate = (t: StallTemplate) => {
    setError(null);
    onChange({ url: t[templateField], storagePath: null });
  };

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative flex items-center justify-center w-full ${aspectClassName} rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-colors
          ${dragOver ? 'border-primary bg-primary/5' : error ? 'border-destructive/60' : 'border-border hover:border-primary/60'}`}
      >
        {busy ? (
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        ) : value ? (
          <>
            <img src={value.url} alt={label} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); clear(); }}
              className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-destructive hover:text-destructive-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="text-center px-4">
            <ImagePlus className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{label} — drag &amp; drop or tap to upload</p>
          </div>
        )}
        {/*
          Visually hidden, NOT display:none (sr-only vs. Tailwind's
          .hidden) -- a display:none file input's associated <label> does
          not reliably open iOS Safari's photo/file picker on tap (a
          longstanding WebKit quirk; the input must still be part of the
          accessibility tree / layout for the label's implicit-activation
          behavior to fire). 2026-09-13 bug report: tapping the empty zone
          on iPhone Safari never opened the picker at all.
        */}
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

      {templates.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Or start from a template</p>
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <Button
                key={t.id}
                type="button"
                variant={value?.url === t[templateField] ? 'default' : 'outline'}
                size="sm"
                onClick={() => pickTemplate(t)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
