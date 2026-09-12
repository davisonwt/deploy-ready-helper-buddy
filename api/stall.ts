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
  const imageTags = image
    ? `
    <meta property="og:image" content="${escapeHtml(image)}">
    <meta name="twitter:image" content="${escapeHtml(image)}">`
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

  try {
    const headers = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'content-type': 'application/json' };

    const ownerRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_stall_owner_id_by_username`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ _username: username }),
    });
    const ownerId = ownerRes.ok ? await ownerRes.json() : null;
    if (!ownerId || typeof ownerId !== 'string') return fallback();

    const stallRes = await fetch(
      `${SUPABASE_URL}/rest/v1/stalls?select=name,tagline,front_image_path,published&user_id=eq.${encodeURIComponent(ownerId)}&limit=1`,
      { headers },
    );
    const rows = stallRes.ok ? await stallRes.json() : [];
    const stall = Array.isArray(rows) ? rows[0] : null;
    if (!stall || !stall.published) return fallback();

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
