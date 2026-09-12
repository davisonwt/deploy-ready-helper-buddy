import { useCallback, useId, useRef, useState } from 'react';
import { Loader2, FileText, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatSizeMessage, mapStorageUploadError } from '@/lib/uploadErrors';
import { moderateStorageUpload, moderationRejectionMessage } from '@/lib/moderation/moderateUpload';

export interface StallPdfResult {
  /** Public URL, for the "Open my story" flow. */
  url: string;
  /** Storage path (stalls bucket) -- saved to stalls.story_pdf_path. */
  storagePath: string;
  /** Display name only -- not persisted anywhere, so a freshly-loaded existing PDF just shows "story.pdf" (its real stored name) until re-uploaded in this session. */
  fileName: string;
}

// Matches the "stalls" bucket's file_size_limit (20260911020000_stall_story_pdf.sql).
const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;
const MIME_REJECTION_MESSAGE = 'Please choose a PDF file.';

interface Props {
  /** user id -- the PDF always lands at `${pathPrefix}/story.pdf`. */
  pathPrefix: string;
  value: StallPdfResult | null;
  onChange: (result: StallPdfResult | null) => void;
}

/**
 * "Upload PDF" for a stall's My Story -- drag-and-drop or tap, same shape
 * as StallImageUpload's drop zone. Unlike that component's timestamped
 * filenames (one stall can hold several images), this always uploads to
 * the same fixed path (`<user_id>/story.pdf`, per the migration this
 * shipped with) with upsert:true -- re-uploading replaces the previous
 * story PDF, which is the "change my story" flow, not a name collision to
 * reject.
 */
export default function StallPdfUpload({ pathPrefix, value, onChange }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
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
      const path = `${pathPrefix}/story.pdf`;
      const { error: uploadErr } = await supabase.storage.from('stalls').upload(path, file, {
        cacheControl: '3600',
        contentType: 'application/pdf',
        upsert: true,
      });
      if (uploadErr) {
        setError(mapStorageUploadError(uploadErr, file, MAX_UPLOAD_SIZE_BYTES, MIME_REJECTION_MESSAGE));
        return;
      }

      // Same "must get a verdict row or this bucket entry stays effectively
      // orphaned of an audit trail" pattern StallImageUpload follows --
      // moderate-media auto-allows non-visual types (a PDF's real
      // downloaded blob.type isn't image/* or video/*) but still needs to
      // be called so that happens on the record, not skipped client-side.
      const { verdict, reason } = await moderateStorageUpload('stalls', path, 'image');
      if (verdict !== 'allow') {
        setError(moderationRejectionMessage(reason));
        await supabase.storage.from('stalls').remove([path]);
        return;
      }

      const { data: pub } = supabase.storage.from('stalls').getPublicUrl(path);
      onChange({ url: pub.publicUrl, storagePath: path, fileName: file.name });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not upload that file.');
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

  if (value) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm truncate flex-1">{value.fileName}</span>
          <button
            type="button"
            onClick={clear}
            className="text-muted-foreground hover:text-destructive shrink-0"
            aria-label="Remove PDF"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex items-center justify-center gap-2 w-full rounded-lg border-2 border-dashed px-4 py-3 cursor-pointer transition-colors text-sm
          ${dragOver ? 'border-primary bg-primary/5' : error ? 'border-destructive/60' : 'border-border hover:border-primary/60'}`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <>
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Upload PDF — drag &amp; drop or tap</span>
          </>
        )}
        {/* See StallImageUpload.tsx's identical fix for why sr-only, not display:none. */}
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </label>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
