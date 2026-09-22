// Stall link previews. See api/_og.ts for the shared crawler-page helpers;
// this file keeps only the stall-specific lookup and copy.
//
// vercel.json rewrites /stall/:username here ONLY for a matching crawler
// User-Agent -- a real browser never reaches this file and gets the normal
// SPA exactly as before.
import { SUPABASE_URL, ANON_KEY, renderHtml } from './_og';

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
