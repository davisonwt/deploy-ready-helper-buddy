// Wandering member link previews.
//
// /wandering/:role/:id is a public page (WanderingMemberPage), and the
// "share your door" flow emits exactly that URL with the sharer's ?ref=.
// Without this, a door pasted into WhatsApp or Telegram showed the generic
// index.html title and no image.
//
// vercel.json rewrites the path here ONLY for a matching crawler
// User-Agent; a real browser never reaches this file and gets the SPA.
//
// The helpers below are duplicated from api/stall.ts ON PURPOSE. They were
// briefly extracted to api/_og.ts and BOTH functions started returning
// FUNCTION_INVOCATION_FAILED in production: Vercel's builder ignores
// underscore-prefixed files under /api, so the import did not exist at
// runtime. If these are ever shared, the shared module must live somewhere
// the builder actually deploys, and the stall preview must be re-tested
// with a crawler UA before it is called done.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zuwkgasbkpjlxzsjzumu.supabase.co';
const ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_Z8-I1gu2Q1yid1Q4jKRf7Q_jSGcsVpa';
const SITE_URL = 'https://sow2growapp.com';

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
function crawlerImageUrl(url: string): string {
  const marker = '/storage/v1/object/public/';
  if (!url.includes(marker)) return url;
  const base = url.replace(marker, '/storage/v1/render/image/public/');
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}width=${OG_IMAGE_WIDTH}&height=${OG_IMAGE_HEIGHT}&resize=cover&quality=80`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderHtml(opts: { title: string; description: string; image: string | null; canonicalPath: string }): string {
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

export default async function handler(req: any, res: any) {
  const one = (v: unknown) => (Array.isArray(v) ? v[0] : v) as string | undefined;
  const role = one(req.query?.role);
  const id = one(req.query?.id);
  const ref = one(req.query?.ref);
  const canonicalPath = `/wandering/${encodeURIComponent(role || '')}/${encodeURIComponent(id || '')}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`;

  const fallback = () => {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.status(200).send(renderHtml({
      title: 'Sow2Grow',
      description: 'A Wandering member on Sow2Grow',
      image: null,
      canonicalPath,
    }));
  };

  // A uuid is the only shape this route ever carries; anything else is a
  // crawler probing, and asking PostgREST for it just 400s.
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return fallback();

  try {
    const headers = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'content-type': 'application/json' };
    const res1 = await fetch(
      `${SUPABASE_URL}/rest/v1/wandering_roles?select=display_name,role,base_town,tagline,photo_url,status&id=eq.${encodeURIComponent(id)}&limit=1`,
      { headers },
    );
    const rows = res1.ok ? await res1.json() : [];
    const row = Array.isArray(rows) ? rows[0] : null;
    // Only an active row is public -- the same cut the page itself makes.
    if (!row || row.status !== 'active') return fallback();

    const ROLE_TITLE: Record<string, string> = {
      pillow: 'Wandering Pillow', hand: 'Wandering Hand', wheel: 'Wandering Wheel',
      field: 'Wandering Field', hearth: 'Wandering Hearth', forge: 'Wandering Forge',
      story: 'Wandering Story', heart: 'Wandering Heart', whisperer: 'Whisperer',
    };
    const roleTitle = ROLE_TITLE[row.role] || 'Wandering member';
    const name = (row.display_name || '').trim() || 'A tribe member';
    const where = (row.base_town || '').trim();

    // Only advertise an image a crawler can actually fetch. Every
    // wandering_roles.photo_url points into `premium-room`, which is a
    // PRIVATE bucket, so its /object/public/ URL 400s for anyone
    // unauthenticated -- measured live. In the app this is invisible
    // because SignedImg re-signs those URLs client-side; a crawler has no
    // session and cannot. Advertising it anyway gave Telegram and WhatsApp
    // an og:image that 400s, which is worse than no image at all.
    //
    // Structural fix, flagged not built: Wandering photos belong in a
    // public bucket, the way stall fronts already live in `stalls`. Until
    // then a door preview is title + description only.
    const PUBLIC_BUCKETS = new Set([
      'stalls', 'memry-media', 'stay-photos', 'provider-assets',
      'service-provider-images', 'book-images', 'live-session-art',
      'stream-thumbnails', 'biz-ads', 'onboarding', 'orchard-videos',
      'product-videos',
      // The bucket Wandering media now lives in (migrated 2026-09-22 out of
      // the private `premium-room`). This is what lets a door preview carry
      // the member's own photo.
      'wandering',
    ]);
    const photo = row.photo_url || null;
    const bucket = photo ? (photo.split('/object/public/')[1] || '').split('/')[0] : '';
    const publicPhoto = photo && PUBLIC_BUCKETS.has(bucket) ? photo : null;

    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.status(200).send(renderHtml({
      title: `${name} — ${roleTitle}`,
      description: (row.tagline || '').trim() || (where ? `${roleTitle} in ${where}` : `A ${roleTitle} on Sow2Grow`),
      image: publicPhoto,
      canonicalPath,
    }));
  } catch {
    fallback();
  }
}
