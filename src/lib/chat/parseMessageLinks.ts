// Splits a chat message's plain text into segments so the renderer can
// show a real tappable link for any URL (the minimum -- broken messaging
// otherwise) and a real card, image + name + tap-through, for the ones
// that point back into this app (a stall or a seed within one). External
// URLs never get more than a plain link -- no preview fetch of an
// arbitrary site, which is exactly the security surface that invites.

export type MessageSegment =
  | { type: 'text'; value: string }
  | { type: 'stall-link'; href: string; internalPath: string; username: string; seedId: string | null }
  | { type: 'external-link'; href: string };

const URL_RE = /https?:\/\/[^\s]+/g;
// Trailing punctuation a sentence would naturally add right after a
// pasted link ("see my stall: https://...stall/me." ) that is not part
// of the URL itself.
const TRAILING_PUNCTUATION_RE = /[),.!?;:'"]+$/;

export function parseMessageLinks(content: string): MessageSegment[] {
  const segments: MessageSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  while ((match = URL_RE.exec(content))) {
    let url = match[0];
    const trailing = url.match(TRAILING_PUNCTUATION_RE);
    if (trailing) url = url.slice(0, -trailing[0].length);
    if (!url) continue;

    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: content.slice(lastIndex, match.index) });
    }
    segments.push(classifyLink(url));
    lastIndex = match.index + url.length;
  }
  if (lastIndex < content.length) {
    segments.push({ type: 'text', value: content.slice(lastIndex) });
  }
  return segments;
}

function classifyLink(url: string): MessageSegment {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host === 'sow2growapp.com') {
      const stallMatch = u.pathname.match(/^\/stall\/([^/]+)\/?$/);
      if (stallMatch) {
        const username = decodeURIComponent(stallMatch[1]);
        const hashParams = new URLSearchParams(u.hash.replace(/^#/, ''));
        const seedId = hashParams.get('seed');
        return {
          type: 'stall-link',
          href: url,
          // Same origin -- recombined verbatim from the parsed URL, not
          // re-encoded, so ?ref= and any #stall-kind=/seed= survive an
          // in-app navigate() exactly as pasted.
          internalPath: `${u.pathname}${u.search}${u.hash}`,
          username,
          seedId,
        };
      }
    }
    return { type: 'external-link', href: url };
  } catch {
    return { type: 'external-link', href: url };
  }
}
