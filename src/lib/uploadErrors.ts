// Plain-language file-upload error helpers, shared by every seed upload
// surface (SeedDropZone, AlbumTrackList) so the message a sower sees never
// depends on Supabase Storage's own wording. "Errors are always plain,
// specific and actionable" — CLAUDE.md.

export function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

/** e.g. "File is 187.3 MB — the limit is 150 MB". Takes anything with a .size (File or Blob — CoverDropZone checks its cropped output blob, not the original File). */
export function formatSizeMessage(file: { size: number }, limitBytes: number): string {
  return `File is ${formatMB(file.size)} MB — the limit is ${formatMB(limitBytes)} MB`;
}

interface StorageErrorLike {
  message?: string;
  statusCode?: string | number;
}

/**
 * Turns a raw Supabase Storage upload error into plain language. Always
 * logs the original error to console first, so the real wording is still
 * there for debugging even though the user never sees it.
 */
export function mapStorageUploadError(
  err: StorageErrorLike | null | undefined,
  file: { size: number },
  limitBytes: number,
  mimeRejectionMessage: string,
): string {
  console.error('Storage upload error:', err);
  const raw = err?.message ?? '';
  const lower = raw.toLowerCase();
  const statusCode = String(err?.statusCode ?? '');

  if (statusCode === '413' || lower.includes('exceeded the maximum allowed size') || lower.includes('payload too large')) {
    return formatSizeMessage(file, limitBytes);
  }
  if (lower.includes('mime type') || lower.includes('not allowed')) {
    return mimeRejectionMessage;
  }
  return raw || 'Upload failed. Please try again.';
}
