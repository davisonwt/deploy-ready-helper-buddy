import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import { basenameKey, lookupMedia, openZipBundle, ZIP_LIMITS, type ZipMediaFile } from '@/lib/bulk/zipBundle';
import { readCell } from '@/lib/bulk/attachBundleMedia';
import { buildTemplateCsv, buildTemplateReadme, TEMPLATE_COLUMNS } from '@/lib/bulk/templateZip';

const zipToFile = async (zip: JSZip, name = 'bundle.zip') => {
  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], name, { type: 'application/zip' });
};

describe('basenameKey', () => {
  it('reduces a path to its lower-cased last segment', () => {
    expect(basenameKey('images/Clay-Mug.JPG')).toBe('clay-mug.jpg');
    expect(basenameKey('hat.jpg')).toBe('hat.jpg');
    expect(basenameKey('deep/nested/folder/x.png')).toBe('x.png');
  });

  it('defuses path traversal -- the whole defence, stated as a test', () => {
    // Nothing from an archive is ever used to build a write path, but even if
    // it were, these collapse to a harmless lookup key.
    expect(basenameKey('../../../etc/passwd')).toBe('passwd');
    expect(basenameKey('/absolute/path/evil.jpg')).toBe('evil.jpg');
    expect(basenameKey('..\\..\\windows\\system32\\cmd.exe')).toBe('cmd.exe');
  });
});

describe('lookupMedia', () => {
  const media = new Map<string, ZipMediaFile>([
    ['clay-mug.jpg', { key: 'clay-mug.jpg', originalPath: 'images/clay-mug.jpg', kind: 'image', file: new File([''], 'clay-mug.jpg') }],
  ]);

  it('matches case-insensitively and tolerates a leading folder', () => {
    expect(lookupMedia(media, 'clay-mug.jpg')?.key).toBe('clay-mug.jpg');
    expect(lookupMedia(media, 'images/Clay-Mug.JPG')?.key).toBe('clay-mug.jpg');
    expect(lookupMedia(media, '  IMAGES/CLAY-MUG.JPG  ')?.key).toBe('clay-mug.jpg');
  });

  it('returns null for a miss or an empty cell, never throws', () => {
    expect(lookupMedia(media, 'nope.jpg')).toBeNull();
    expect(lookupMedia(media, '')).toBeNull();
    expect(lookupMedia(media, undefined)).toBeNull();
  });
});

describe('readCell', () => {
  it('reads a column case-insensitively, ignoring header whitespace', () => {
    const raw = { ' Image_File ': 'a.jpg', VIDEO_URL: 'https://x.test/v', empty: '   ' };
    expect(readCell(raw, 'image_file')).toBe('a.jpg');
    expect(readCell(raw, 'video_url')).toBe('https://x.test/v');
    expect(readCell(raw, 'empty')).toBeUndefined();
    expect(readCell(raw, 'missing')).toBeUndefined();
  });
});

describe('openZipBundle', () => {
  it('finds the spreadsheet and indexes media by basename', async () => {
    const zip = new JSZip();
    zip.file('products.csv', 'name,image_file\nMug,images/mug.jpg\n');
    zip.file('images/Mug.JPG', 'fake-bytes');
    zip.file('audio/song.mp3', 'fake-bytes');
    const bundle = await openZipBundle(await zipToFile(zip));

    expect(bundle.spreadsheet?.name).toBe('products.csv');
    expect(bundle.media.get('mug.jpg')?.kind).toBe('image');
    expect(bundle.media.get('song.mp3')?.kind).toBe('audio');
    // The row says images/mug.jpg; the archive says images/Mug.JPG. Same file.
    expect(lookupMedia(bundle.media, 'images/mug.jpg')?.originalPath).toBe('images/Mug.JPG');
  });

  it('refuses an archive with no spreadsheet, in words a member can act on', async () => {
    const zip = new JSZip();
    zip.file('images/a.jpg', 'x');
    await expect(openZipBundle(await zipToFile(zip))).rejects.toThrow(/no spreadsheet/i);
  });

  it('ignores __MACOSX forks and dotfiles rather than letting them shadow real files', async () => {
    const zip = new JSZip();
    zip.file('products.csv', 'name\nA\n');
    zip.file('__MACOSX/images/._mug.jpg', 'junk');
    zip.file('images/.DS_Store', 'junk');
    zip.file('images/mug.jpg', 'real');
    const bundle = await openZipBundle(await zipToFile(zip));
    expect([...bundle.media.keys()]).toEqual(['mug.jpg']);
  });

  it('warns about a duplicate basename instead of silently picking one', async () => {
    const zip = new JSZip();
    zip.file('products.csv', 'name\nA\n');
    zip.file('images/photo.jpg', 'first');
    zip.file('audio-covers/photo.jpg', 'second');
    const bundle = await openZipBundle(await zipToFile(zip));
    expect(bundle.media.size).toBe(1);
    expect(bundle.warnings.join(' ')).toMatch(/both named "photo\.jpg"/i);
  });

  it('names an unrecognised file rather than dropping it without a word', async () => {
    const zip = new JSZip();
    zip.file('products.csv', 'name\nA\n');
    zip.file('notes.txt.bak', 'x');
    const bundle = await openZipBundle(await zipToFile(zip));
    expect(bundle.warnings.join(' ')).toMatch(/notes\.txt\.bak/);
  });

  it('prefers the shallowest spreadsheet when there are two', async () => {
    const zip = new JSZip();
    zip.file('nested/deep/other.csv', 'name\nB\n');
    zip.file('products.csv', 'name\nA\n');
    const bundle = await openZipBundle(await zipToFile(zip));
    expect(bundle.spreadsheetPath).toBe('products.csv');
  });

  it('rejects an oversized archive before reading it', async () => {
    const big = new File([new Uint8Array(8)], 'big.zip', { type: 'application/zip' });
    Object.defineProperty(big, 'size', { value: ZIP_LIMITS.MAX_ARCHIVE_BYTES + 1 });
    await expect(openZipBundle(big)).rejects.toThrow(/limit is 200MB/i);
  });
});

describe('the downloadable template', () => {
  it('carries every column the importer reads, video_url included', () => {
    const header = buildTemplateCsv().split('\n')[0].split(',');
    expect(header).toEqual([...TEMPLATE_COLUMNS]);
    for (const c of ['image_file', 'audio_file', 'book_file', 'video_url']) {
      expect(header).toContain(c);
    }
  });

  it('ships one worked example row, not an empty sheet', () => {
    const lines = buildTemplateCsv().trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/clay-mug\.jpg/);
  });

  it('tells the member why video is a link and what happens to a missing file', () => {
    const readme = buildTemplateReadme();
    expect(readme).toMatch(/video_url/);
    expect(readme).toMatch(/not put in the zip/i);
    expect(readme).toMatch(/still imported/i);
    // The limits must be stated, and must be the real ones.
    expect(readme).toContain('200MB');
  });
});
