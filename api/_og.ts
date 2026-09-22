// Shared Open Graph helpers for the crawler-only pages under /api.
//
// Underscore prefix: Vercel does not expose _og.ts as a route, it is only
// imported by the real handlers (stall.ts, wandering.ts). One copy on
// purpose -- two would drift, and the one that drifted would be the one
// nobody tested. That is exactly what buildSeedShareUrl's own comment in
// src/lib/share/seedShareUrl.ts warns about.

export const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
export const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';
export const SITE_URL = 'https://sow2growapp.com';

// Telegram will not render a webp og:image. WhatsApp and Facebook do, which
// is why previews "worked" and only Telegram came up empty -- measured
// 2026-09-21: /stall/davison.taljaard advertised
// .../object/public/stalls/<id>/front.webp, served 200 image/webp, 339KB.
//
// Supabase's image transformation endpoint is enabled on this project and
// negotiates on Accept: it returns webp only to a client that asks for
// webp, and jpeg to everything else. Verified against the live bucket --
// Accept: */* and a bare TelegramBot UA both come back image/jpeg. So the
// same URL stays correct for every crawler without converting anything
// ourselves, and without a new dependency.
//
// A fixed 1200x630 cover crop, rather than width alone, is what lets the
// og:image:width/height tags below be true: width=1200 on its own returns
// 1200x853 for this stall and something else for the next one, and a
// dimension tag that has to be guessed is worse than none. 1.91:1 is the
// box Telegram and WhatsApp render a large preview in anyway.
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

/** Routes a Supabase public-object URL through the transformation endpoint. Anything else passes through untouched. */
export function crawlerImageUrl(url: string): string {
  const marker = '/storage/v1/object/public/';
  if (!url.includes(marker)) return url;
  const base = url.replace(marker, '/storage/v1/render/image/public/');
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}width=${OG_IMAGE_WIDTH}&height=${OG_IMAGE_HEIGHT}&resize=cover&quality=80`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderHtml(opts: { title: string; description: string; image: string | null; canonicalPath: string }): string {
  const { title, description, image, canonicalPath } = opts;
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;
  const t = escapeHtml(title);
  const pageTitle = title === 'Sow2Grow' ? 'Sow2Grow' : `${t} — Sow2Grow`;
  const d = escapeHtml(description);
  const imageUrl = image ? crawlerImageUrl(image) : null;
  const imageTags = imageUrl
    ? `
    <meta property="og:image" content="${escapeHtml(imageUrl)}">
    <meta property="og:image:width" content="${OG_IMAGE_WIDTH}">
    <meta property="og:image:height" content="${OG_IMAGE_HEIGHT}">
    <meta property="og:image:type" content="image/jpeg">
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}">`
    : '';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${pageTitle}</title>
<meta name="description" content="${d}">
<meta property="og:type" content="website">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${canonicalUrl}">
<meta property="og:site_name" content="Sow2Grow">${imageTags}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta http-equiv="refresh" content="0; url=${canonicalPath}">
</head>
<body>
<p>Redirecting to <a href="${canonicalPath}">${t} on Sow2Grow</a>&hellip;</p>
</body>
</html>`;
}

