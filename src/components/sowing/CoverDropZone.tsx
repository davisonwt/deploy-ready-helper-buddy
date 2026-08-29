import { useCallback, useRef, useState } from 'react';
import { Loader2, ImagePlus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatSizeMessage, mapStorageUploadError } from '@/lib/uploadErrors';

export interface CoverResult {
  fileUrl: string;
  storagePath: string;
}

const MAX_COVER_SIZE_BYTES = 10 * 1024 * 1024;
const MIME_REJECTION_MESSAGE = "That file type isn't supported — use JPG, PNG, GIF or WEBP.";

interface Props {
  bucket: string;
  pathPrefix: string;
  onChange: (result: CoverResult | null) => void;
  /** Shows "required" styling/copy; doesn't block anything itself — the parent form owns validation. */
  required?: boolean;
}

/** Center-crops to a square canvas, always exporting JPEG (predictable size/type for a cover). */
function cropToSquare(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - side) / 2;
      const sy = (img.naturalHeight - side) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = side;
      canvas.height = side;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('canvas unavailable')); return; }
      ctx.drawImage(img, sx, sy, side, side, 0, 0, side, side);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) resolve(blob); else reject(new Error('crop failed'));
      }, 'image/jpeg', 0.9);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('could not read image')); };
    img.src = url;
  });
}

export default function CoverDropZone({ bucket, pathPrefix, onChange, required }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Cover must be an image file (JPG, PNG, GIF, or WEBP).');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const cropped = await cropToSquare(file);

      if (cropped.size > MAX_COVER_SIZE_BYTES) {
        setError(formatSizeMessage(cropped, MAX_COVER_SIZE_BYTES));
        onChange(null);
        return;
      }

      const localUrl = URL.createObjectURL(cropped);
      setPreviewUrl(localUrl);

      const path = `${pathPrefix}/${Date.now()}.jpg`;
      const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, cropped, {
        cacheControl: '3600',
        contentType: 'image/jpeg',
        upsert: false,
      });
      if (uploadErr) {
        setError(mapStorageUploadError(uploadErr, cropped, MAX_COVER_SIZE_BYTES, MIME_REJECTION_MESSAGE));
        onChange(null);
        return;
      }
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange({ fileUrl: pub.publicUrl, storagePath: path });
    } catch (e: any) {
      setError(e?.message ?? 'Could not process that image.');
      onChange(null);
    } finally {
      setBusy(false);
    }
  }, [bucket, pathPrefix, onChange]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const clear = () => {
    if (inputRef.current) inputRef.current.value = '';
    setPreviewUrl(null);
    setError(null);
    onChange(null);
  };

  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative flex items-center justify-center w-28 h-28 rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-colors
          ${dragOver ? 'border-primary bg-primary/5' : error ? 'border-destructive/60' : 'border-border hover:border-primary/60'}`}
      >
        {busy ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        ) : previewUrl ? (
          <>
            <img src={previewUrl} alt="Cover" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); clear(); }}
              className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 hover:bg-destructive hover:text-destructive-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div className="text-center px-2">
            <ImagePlus className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground leading-tight">
              Cover{required ? ' *' : ''}
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </label>
      {error && <p className="mt-1 text-xs text-destructive max-w-[9rem]">{error}</p>}
    </div>
  );
}
