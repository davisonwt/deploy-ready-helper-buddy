// Wandering member link previews.
//
// /wandering/:role/:id is a public page (WanderingMemberPage), and the
// "share your door" flow in RegisterWanderingPage emits exactly that URL
// with the sharer's ?ref= on it. Without this, a door pasted into WhatsApp
// or Telegram showed the generic index.html title and no image.
//
// vercel.json rewrites the path here ONLY for a matching crawler
// User-Agent; a real browser never reaches this file and gets the SPA.
// Same jpeg treatment as stall previews -- see api/_og.ts, which owns the
// shared rendering and the Supabase image transformation that keeps
// Telegram working.
import { SUPABASE_URL, ANON_KEY, renderHtml } from './_og';

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

    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.status(200).send(renderHtml({
      title: `${name} — ${roleTitle}`,
      description: (row.tagline || '').trim() || (where ? `${roleTitle} in ${where}` : `A ${roleTitle} on Sow2Grow`),
      image: row.photo_url || null,
      canonicalPath,
    }));
  } catch {
    fallback();
  }
}
