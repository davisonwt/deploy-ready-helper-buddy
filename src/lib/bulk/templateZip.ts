/**
 * The starter ZIP a member downloads, fills in, and uploads back.
 *
 * This is the product, not documentation. A member who lays the archive out
 * wrong gets a report full of failures and gives up, so the shape they need is
 * handed to them already built: the columns exist, one row is filled in as a
 * worked example, and the folders are already there to drop files into.
 */
import JSZip from 'jszip';
import { ZIP_LIMITS } from './zipBundle';

/** Column order is the order a member reads them in; required ones come first. */
export const TEMPLATE_COLUMNS = [
  'name',
  'description',
  'price',
  'category',
  'sku',
  'stock_qty',
  'image_file',
  'audio_file',
  'book_file',
  'video_url',
] as const;

const EXAMPLE_ROW: Record<(typeof TEMPLATE_COLUMNS)[number], string> = {
  name: 'Hand-thrown clay mug',
  description: 'Wheel-thrown stoneware, glazed inside, holds 350ml.',
  price: '24.00',
  category: 'Homeware',
  sku: 'MUG-001',
  stock_qty: '12',
  image_file: 'images/clay-mug.jpg',
  audio_file: '',
  book_file: '',
  video_url: 'https://www.youtube.com/watch?v=your-video-id',
};

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildTemplateCsv(): string {
  const header = TEMPLATE_COLUMNS.join(',');
  const example = TEMPLATE_COLUMNS.map((c) => csvCell(EXAMPLE_ROW[c])).join(',');
  return `${header}\n${example}\n`;
}

const mb = (bytes: number) => `${Math.round(bytes / 1024 / 1024)}MB`;

export function buildTemplateReadme(): string {
  return `SOW MANY SEEDS AT ONCE — HOW THIS ZIP WORKS
===========================================

You send ONE zip file. Inside it: a spreadsheet listing your products, and
folders holding your images and audio. Each row becomes its own seed card,
exactly as if you had sown it one at a time.

WHAT'S IN HERE
--------------
  products.csv    Your list. One row per product. Open it in Excel, Numbers,
                  Google Sheets or LibreOffice. The first row is the column
                  names — leave it alone. The second row is a worked example;
                  replace it with your own, or delete it.
  images/         Drop your product photos in here.
  audio/          Drop audio files in here, if you're sowing music.

WHEN YOU'RE DONE
----------------
Select these items, zip them, and upload the zip. On a Mac: select them,
right-click, "Compress". On Windows: select them, right-click, "Send to" then
"Compressed (zipped) folder".

THE COLUMNS
-----------
  name          Required. What the seed is called.
  description   What it is, in your own words.
  price         Numbers only — 24.00, not $24 or R24.
  category      Your own grouping, e.g. Homeware.
  sku           Your own product code, if you use one.
  stock_qty     How many you have.

  image_file    The photo's filename, e.g. images/clay-mug.jpg — or just
                clay-mug.jpg. Either works.
  audio_file    Same idea, for music.
  book_file     Same idea, for a PDF or ebook.

  video_url     A LINK, not a file. Paste the YouTube or Vimeo address.
                Videos are not put in the zip: a hundred marketing videos is
                tens of gigabytes and would never finish uploading from a
                phone. Most marketing video already lives on YouTube or Vimeo,
                so a link is what you paste here.

FILENAMES
---------
Upper or lower case doesn't matter, and a folder in front is fine —
"images/Hat.JPG", "Hat.jpg" and "hat.jpg" all find the same file.

Every filename must be different, even in different folders. If two files are
both called "photo.jpg", rename one.

IF A FILE IS MISSING
--------------------
The row is still imported. You get a report at the end naming the row and the
file it was looking for, so you can add that photo afterwards. One missing
file never costs you the whole upload.

LIMITS
------
  Whole zip          up to ${mb(ZIP_LIMITS.MAX_ARCHIVE_BYTES)}
  Files in the zip   up to ${ZIP_LIMITS.MAX_ENTRIES}
  Each image         up to ${mb(ZIP_LIMITS.MAX_IMAGE_BYTES)}
  Each audio file    up to ${mb(ZIP_LIMITS.MAX_AUDIO_BYTES)}
  Each book file     up to ${mb(ZIP_LIMITS.MAX_BOOK_BYTES)}

Anything larger is named in the report rather than silently dropped.

A NOTE ON WHAT YOU UPLOAD
-------------------------
Every image and file goes through the same check as a single upload. Nothing
skips it because it arrived in a zip.
`;
}

/** The finished template archive, ready to hand to the browser as a download. */
export async function buildTemplateZip(): Promise<Blob> {
  const zip = new JSZip();
  zip.file('products.csv', buildTemplateCsv());
  zip.file('README.txt', buildTemplateReadme());
  // Empty folders vanish in some zip tools, so each carries a note explaining
  // itself -- both are ignored on the way back in (a leading dot is skipped).
  zip.file('images/.keep', 'Put your product photos in this folder.\n');
  zip.file('audio/.keep', 'Put your audio files in this folder, if you have any.\n');
  return zip.generateAsync({ type: 'blob' });
}

export function downloadTemplateZip(blob: Blob, filename = 'sow2grow-bulk-template.zip'): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
