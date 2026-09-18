/**
 * Attach the media a member put in their ZIP to the rows that name it.
 *
 * Two rules drive everything here:
 *
 *  1. A row whose file is missing IS STILL IMPORTED, and the problem is named
 *     in the end-of-run report. One missing photo never costs a member the
 *     other ninety-nine rows.
 *  2. Every extracted file goes through moderateStorageUpload -- the SAME
 *     helper a single upload uses -- so it fails open and is flagged for
 *     review exactly as one file dropped on a form would be. There is no bulk
 *     bypass. (Before this, the bulk images step wrote straight to storage and
 *     never called it at all.)
 */
import { supabase } from '@/integrations/supabase/client';
import { moderateStorageUpload, moderationRejectionMessage } from '@/lib/moderation/moderateUpload';
import { lookupMedia, maxBytesFor, type MediaKind, type ZipMediaFile } from './zipBundle';

export const BULK_IMAGE_BUCKET = 'orchard-images';
export const BULK_FILE_BUCKET = 'orchard-images';

/** One actionable line in the end-of-run report. */
export interface BundleIssue {
  /** 1-based row number as the member sees it in their spreadsheet. */
  row: number;
  /** The product name, so they can find it without counting rows. */
  name: string;
  /** What they wrote in the cell, or the file we tried to use. */
  file?: string;
  problem: string;
}

export interface AttachedRowMedia {
  imageUrl?: string;
  imagePath?: string;
  fileUrl?: string;
  videoUrl?: string;
}

export interface AttachResult {
  /** rowIdx -> what actually attached. Rows absent here simply had no media. */
  attached: Map<number, AttachedRowMedia>;
  issues: BundleIssue[];
  /** Files in the ZIP no row ever asked for. */
  unusedFiles: string[];
  counts: { images: number; audio: number; books: number; videoUrls: number };
}

/** Read a column case-insensitively, tolerating stray spaces in the header. */
export function readCell(raw: Record<string, unknown>, column: string): string | undefined {
  const target = column.trim().toLowerCase();
  for (const [k, v] of Object.entries(raw ?? {})) {
    if (k.trim().toLowerCase() !== target) continue;
    if (v === null || v === undefined) return undefined;
    const s = String(v).trim();
    return s === '' ? undefined : s;
  }
  return undefined;
}

function looksLikeUrl(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value);
}

export interface AttachRowInput {
  idx: number;
  /** 1-based, as the member sees it. */
  displayRow: number;
  name: string;
  raw: Record<string, unknown>;
}

/**
 * @param onProgress called after each row so the UI can move; never throws.
 */
export async function attachBundleMedia(
  rows: AttachRowInput[],
  media: Map<string, ZipMediaFile>,
  ctx: { sowerId: string; jobId: string },
  onProgress?: (done: number, total: number) => void,
): Promise<AttachResult> {
  const attached = new Map<number, AttachedRowMedia>();
  const issues: BundleIssue[] = [];
  const used = new Set<string>();
  const counts = { images: 0, audio: 0, books: 0, videoUrls: 0 };

  const uploadOne = async (
    r: AttachRowInput,
    cell: string,
    kind: MediaKind,
  ): Promise<{ url: string; path: string } | null> => {
    const found = lookupMedia(media, cell);
    if (!found) {
      issues.push({
        row: r.displayRow,
        name: r.name,
        file: cell,
        problem: `No file named "${cell}" was in the ZIP. The row was imported without it — add it from the seed's own page.`,
      });
      return null;
    }
    used.add(found.key);

    const limit = maxBytesFor(kind);
    if (found.file.size > limit) {
      issues.push({
        row: r.displayRow,
        name: r.name,
        file: found.originalPath,
        problem: `That file is ${(found.file.size / 1024 / 1024).toFixed(1)}MB, over the ${Math.round(limit / 1024 / 1024)}MB limit. The row was imported without it.`,
      });
      return null;
    }

    const bucket = kind === 'image' ? BULK_IMAGE_BUCKET : BULK_FILE_BUCKET;
    const ext = found.key.split('.').pop() || 'bin';
    // Storage paths are built from ids we control. Nothing from the archive
    // reaches a path -- see basenameKey's own comment.
    const path = `products/${ctx.sowerId}/${ctx.jobId}_${r.idx}/${Date.now()}_${kind}.${ext}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, found.file, { upsert: false, contentType: found.file.type || undefined });
    if (error) {
      issues.push({
        row: r.displayRow,
        name: r.name,
        file: found.originalPath,
        problem: `Upload failed: ${error.message}. The row was imported without it.`,
      });
      return null;
    }

    // Identical to a single upload: a real content rejection blocks the file,
    // a scanner that cannot answer accepts it and flags it for review.
    const verdict = await moderateStorageUpload(bucket, path, kind === 'image' ? 'image' : 'video');
    if (verdict.verdict === 'block' || verdict.verdict === 'uncertain') {
      await supabase.storage.from(bucket).remove([path]).catch(() => undefined);
      issues.push({
        row: r.displayRow,
        name: r.name,
        file: found.originalPath,
        problem: moderationRejectionMessage(verdict.reason, kind === 'image' ? 'image' : 'file')
          + ' The row was imported without it.',
      });
      return null;
    }

    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: pub.publicUrl, path };
  };

  let done = 0;
  for (const r of rows) {
    const got: AttachedRowMedia = {};

    const imageCell = readCell(r.raw, 'image_file');
    if (imageCell) {
      const up = await uploadOne(r, imageCell, 'image');
      if (up) { got.imageUrl = up.url; got.imagePath = up.path; counts.images++; }
    }

    // A row is a product OR a track OR a book; whichever file it names wins,
    // and file_url carries it exactly as a single sow would.
    const audioCell = readCell(r.raw, 'audio_file');
    if (audioCell) {
      const up = await uploadOne(r, audioCell, 'audio');
      if (up) { got.fileUrl = up.url; counts.audio++; }
    }
    const bookCell = readCell(r.raw, 'book_file');
    if (bookCell && !got.fileUrl) {
      const up = await uploadOne(r, bookCell, 'book');
      if (up) { got.fileUrl = up.url; counts.books++; }
    }

    const video = readCell(r.raw, 'video_url');
    if (video) {
      if (looksLikeUrl(video)) {
        got.videoUrl = video;
        counts.videoUrls++;
      } else {
        issues.push({
          row: r.displayRow,
          name: r.name,
          file: video,
          problem: 'video_url must be a link starting with http:// or https:// — videos are linked, not put in the ZIP. The row was imported without it.',
        });
      }
    }

    if (Object.keys(got).length) attached.set(r.idx, got);
    done++;
    onProgress?.(done, rows.length);
  }

  const unusedFiles = [...media.values()].filter((m) => !used.has(m.key)).map((m) => m.originalPath);
  return { attached, issues, unusedFiles, counts };
}
