/**
 * Bulk upload: unpacking a member's ZIP of spreadsheet + media, in the browser.
 *
 * Why a ZIP at all: a folder of 100 files multi-selected in a browser picker is
 * slow, error-prone and near-impossible on a phone. One file is one tap.
 *
 * Nothing here touches the network. It opens the archive, finds the
 * spreadsheet, and indexes the media by BASENAME so a row can say
 * `images/hat.jpg`, `hat.JPG` or `hat.jpg` and mean the same file. Uploading
 * and moderation happen in the caller, on the same path a single upload takes.
 *
 * Videos are deliberately NOT carried here -- they arrive as a `video_url`
 * column. A hundred marketing videos is tens of gigabytes; a member on a phone
 * will never upload that, and most of it already lives on YouTube or Vimeo.
 */
import JSZip from 'jszip';

export const ZIP_LIMITS = {
  /** The .zip the member picks. */
  MAX_ARCHIVE_BYTES: 200 * 1024 * 1024,
  /** Total UNCOMPRESSED size. A small archive can expand to fill memory -- this
   *  is the guard against that, checked before anything is decompressed. */
  MAX_UNCOMPRESSED_BYTES: 500 * 1024 * 1024,
  /** Entries we will even look at. */
  MAX_ENTRIES: 2000,
  /** Per-file ceilings, matching what a single upload already allows. */
  MAX_IMAGE_BYTES: 5 * 1024 * 1024,
  MAX_AUDIO_BYTES: 25 * 1024 * 1024,
  MAX_BOOK_BYTES: 25 * 1024 * 1024,
} as const;

const SPREADSHEET_RE = /\.(csv|xlsx|xls)$/i;
const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif)$/i;
const AUDIO_RE = /\.(mp3|m4a|aac|wav|ogg|flac)$/i;
const BOOK_RE = /\.(pdf|epub|docx?)$/i;

export type MediaKind = 'image' | 'audio' | 'book';

export interface ZipMediaFile {
  /** Lower-cased basename, the key rows are matched on. */
  key: string;
  /** The name as it appeared in the archive, for the report. */
  originalPath: string;
  kind: MediaKind;
  file: File;
}

export interface ZipBundle {
  /** The spreadsheet to hand to the existing parser. Null if none was found. */
  spreadsheet: File | null;
  spreadsheetPath: string | null;
  /** basename (lower-cased) -> file. */
  media: Map<string, ZipMediaFile>;
  /** Things the member should know that are not per-row failures. */
  warnings: string[];
}

/**
 * Last path segment, lower-cased, with any directory prefix and any Windows
 * separator discarded.
 *
 * This is the whole path-traversal defence and it is deliberately blunt: a
 * member's archive can contain `../../etc/passwd` or an absolute path and it
 * simply becomes `passwd`, a lookup key in a Map. No path from the archive is
 * ever used to write anything -- storage paths are built from the sower id and
 * job id in the caller, never from archive input.
 */
export function basenameKey(path: string): string {
  const last = path.replace(/\\/g, '/').split('/').filter(Boolean).pop() ?? '';
  return last.trim().toLowerCase();
}

/** What a spreadsheet cell means, tolerant of a leading folder and of case. */
export function lookupMedia(media: Map<string, ZipMediaFile>, cell: string | undefined | null): ZipMediaFile | null {
  if (!cell) return null;
  const key = basenameKey(String(cell));
  if (!key) return null;
  return media.get(key) ?? null;
}

function classify(name: string): MediaKind | null {
  if (IMAGE_RE.test(name)) return 'image';
  if (AUDIO_RE.test(name)) return 'audio';
  if (BOOK_RE.test(name)) return 'book';
  return null;
}

export function maxBytesFor(kind: MediaKind): number {
  return kind === 'image'
    ? ZIP_LIMITS.MAX_IMAGE_BYTES
    : kind === 'audio'
      ? ZIP_LIMITS.MAX_AUDIO_BYTES
      : ZIP_LIMITS.MAX_BOOK_BYTES;
}

export function isZipFile(file: File): boolean {
  return /\.zip$/i.test(file.name) || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
}

/**
 * Open the archive and index it. Throws only when the archive itself is
 * unusable (too big, not a zip, no spreadsheet) -- anything a member can fix
 * per-row is a warning, never a thrown error, because one bad file must never
 * cost them the whole upload.
 */
export async function openZipBundle(archive: File): Promise<ZipBundle> {
  if (archive.size > ZIP_LIMITS.MAX_ARCHIVE_BYTES) {
    throw new Error(
      `That ZIP is ${(archive.size / 1024 / 1024).toFixed(0)}MB. The limit is ${ZIP_LIMITS.MAX_ARCHIVE_BYTES / 1024 / 1024}MB — `
      + 'split it into a few smaller uploads, or use smaller images.',
    );
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(archive);
  } catch {
    throw new Error('That file could not be opened as a ZIP. Re-zip the folder and try again.');
  }

  const entries = Object.values(zip.files).filter((e) => !e.dir);
  if (entries.length > ZIP_LIMITS.MAX_ENTRIES) {
    throw new Error(`That ZIP holds ${entries.length} files. The limit is ${ZIP_LIMITS.MAX_ENTRIES}.`);
  }

  // Bomb guard: sum the DECLARED uncompressed sizes before decompressing
  // anything. jszip exposes this from the central directory.
  let declared = 0;
  for (const e of entries) {
    const size = (e as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0;
    declared += size;
  }
  if (declared > ZIP_LIMITS.MAX_UNCOMPRESSED_BYTES) {
    throw new Error(
      `That ZIP expands to ${(declared / 1024 / 1024).toFixed(0)}MB, over the `
      + `${ZIP_LIMITS.MAX_UNCOMPRESSED_BYTES / 1024 / 1024}MB limit. Split it into smaller uploads.`,
    );
  }

  const warnings: string[] = [];
  const media = new Map<string, ZipMediaFile>();
  let spreadsheet: File | null = null;
  let spreadsheetPath: string | null = null;

  for (const entry of entries) {
    const path = entry.name;
    const base = basenameKey(path);
    // Zip tooling noise, and macOS resource forks that would otherwise shadow
    // a real file of the same name.
    if (!base || base.startsWith('.') || path.startsWith('__MACOSX/')) continue;

    if (SPREADSHEET_RE.test(base)) {
      // Shallowest wins, so a stray copy in a subfolder cannot beat the real
      // one at the root.
      const depth = path.split('/').length;
      const currentDepth = spreadsheetPath ? spreadsheetPath.split('/').length : Infinity;
      if (depth < currentDepth) {
        const blob = await entry.async('blob');
        spreadsheet = new File([blob], base, { type: blob.type || 'application/octet-stream' });
        spreadsheetPath = path;
      } else {
        warnings.push(`Ignored a second spreadsheet: ${path}`);
      }
      continue;
    }

    const kind = classify(base);
    if (!kind) {
      warnings.push(`Ignored ${path} — not an image, audio or book file.`);
      continue;
    }

    if (media.has(base)) {
      warnings.push(`Two files are both named "${base}" (${path}). Only the first is used — rename one.`);
      continue;
    }

    const blob = await entry.async('blob');
    const file = new File([blob], base, { type: blob.type || 'application/octet-stream' });
    media.set(base, { key: base, originalPath: path, kind, file });
  }

  if (!spreadsheet) {
    throw new Error(
      'That ZIP has no spreadsheet in it. It needs one .csv or .xlsx file listing your products — '
      + 'download the template to see the shape.',
    );
  }

  return { spreadsheet, spreadsheetPath, media, warnings };
}
