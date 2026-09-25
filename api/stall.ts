// Stall invite links, part 2: link previews. The app is an SPA (no
// server-rendered HTML), so a crawler (WhatsApp/Facebook/iMessage/
// Twitter/Slack/...) hitting /stall/<username> directly would only ever
// see index.html's generic, stall-agnostic <title>/meta tags -- never the
// real stall name/photo. vercel.json rewrites /stall/:username to THIS
// function, but only for requests whose User-Agent matches a known
// crawler pattern (see the `has` condition there) -- a real browser's
// request never reaches this file at all, it gets the normal SPA
// (index.html) exactly as before. This function fetches the stall's own
// name/tagline/front_image_path (same two-step public lookup
// StallVisitPage.tsx uses: get_stall_owner_id_by_username, then a
// `stalls` select -- both already anon-readable via existing RLS) and
// returns a minimal HTML page with real Open Graph/Twitter Card tags plus
// a meta-refresh to the real app URL, so a crawler that DOES follow the
// redirect (some do) still lands on the working SPA.
//
// No supabase-js import here deliberately -- that client module reads
// Vite's import.meta.env and sets up browser-only auth persistence,
// neither of which apply in this isolated serverless runtime. Plain
// fetch() against Supabase's REST/RPC endpoints is self-contained and
// needs no new dependency.

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

// The invite card for a member with no open stall: the site's own icon,
// served at its real size, so the dimension tags stay true.
const SITE_ICON = { url: `${SITE_URL}/apple-touch-icon.png`, width: 180, height: 180, type: 'image/png' };
const SITE_DESCRIPTION = 'Sow2Grow is a global tribal marketplace where sowers plant seeds, bestowers fund growth, and orchards turn community support into sustainable impact.';

function renderHtml(opts: {
  title: string; description: string; image: string | null; canonicalPath: string;
  fixedImage?: { url: string; width: number; height: number; type: string };
}): string {
  const { title, description, image, canonicalPath, fixedImage } = opts;
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;
  const t = escapeHtml(title);
  const pageTitle = title === 'Sow2Grow' ? 'Sow2Grow' : `${t} — Sow2Grow`;
  const d = escapeHtml(description);
  const imageUrl = image ? crawlerImageUrl(image) : null;
  const imageTags = fixedImage
    ? `
    <meta property="og:image" content="${escapeHtml(fixedImage.url)}">
    <meta property="og:image:width" content="${fixedImage.width}">
    <meta property="og:image:height" content="${fixedImage.height}">
    <meta property="og:image:type" content="${fixedImage.type}">
    <meta name="twitter:image" content="${escapeHtml(fixedImage.url)}">`
    : imageUrl
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
<meta name="twitter:card" content="${fixedImage ? 'summary' : 'summary_large_image'}">
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
  const usernameParam = req.query?.username;
  const username = Array.isArray(usernameParam) ? usernameParam[0] : usernameParam;
  const refParam = req.query?.ref;
  const ref = Array.isArray(refParam) ? refParam[0] : refParam;
  const canonicalPath = `/stall/${encodeURIComponent(username || '')}${ref ? `?ref=${encodeURIComponent(ref)}` : ''}`;

  const fallback = () => {
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.status(200).send(renderHtml({
      title: 'Sow2Grow',
      description: 'A stall on Sow2Grow',
      image: null,
      canonicalPath,
    }));
  };

  if (!username) return fallback();

  const headers = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'content-type': 'application/json' };

  // No open stall: the link is still that member's invite
  // (src/lib/invite/inviteLink.ts), and the app shows a join page naming
  // them -- the preview says the same.
  const invite = async () => {
    try {
      const profRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles_public?select=display_name,first_name,username&username=eq.${encodeURIComponent(username)}&limit=1`,
        { headers },
      );
      const profs = profRes.ok ? await profRes.json() : [];
      const p = Array.isArray(profs) ? profs[0] : null;
      const name = p ? (p.display_name?.trim() || p.first_name?.trim() || p.username?.trim() || null) : null;
      if (!name) return fallback();
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.status(200).send(renderHtml({
        title: `${name} invited you to Sow2Grow`,
        description: SITE_DESCRIPTION,
        image: null,
        fixedImage: SITE_ICON,
        canonicalPath,
      }));
    } catch {
      fallback();
    }
  };

  try {

    const ownerRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_stall_owner_id_by_username`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ _username: username }),
    });
    const ownerId = ownerRes.ok ? await ownerRes.json() : null;
    if (!ownerId || typeof ownerId !== 'string') return invite();

    const stallRes = await fetch(
      `${SUPABASE_URL}/rest/v1/stalls?select=name,tagline,front_image_path,published&user_id=eq.${encodeURIComponent(ownerId)}&limit=1`,
      { headers },
    );
    const rows = stallRes.ok ? await stallRes.json() : [];
    const stall = Array.isArray(rows) ? rows[0] : null;
    if (!stall || !stall.published) return invite();

    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.status(200).send(renderHtml({
      title: stall.name || 'Sow2Grow',
      description: stall.tagline || 'A stall on Sow2Grow',
      image: stall.front_image_path || null,
      canonicalPath,
    }));
  } catch {
    fallback();
  }
}
