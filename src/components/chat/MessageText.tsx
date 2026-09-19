import { parseMessageLinks } from '@/lib/chat/parseMessageLinks';
import StallLinkCard from './StallLinkCard';

/**
 * Renders a plain-text chat message's content with any URL made tappable
 * -- a sow2growapp.com stall/seed link as a real card (StallLinkCard),
 * any other URL as a plain link. Runs on every text message, including
 * ones sent before this shipped -- there is nothing to backfill, this is
 * a render-time transform of message.content, not a stored flag.
 */
export function MessageText({ content }: { content: string }) {
  const segments = parseMessageLinks(content);
  return (
    // A plain div, not <p> -- StallLinkCard renders a Card (a block
    // element), and a <p> may not legally contain one; browsers close the
    // <p> early to cope, which silently breaks the DOM structure here.
    <div className="text-sm whitespace-pre-wrap break-words">
      {segments.map((seg, i) => {
        if (seg.type === 'text') return <span key={i}>{seg.value}</span>;
        if (seg.type === 'external-link') {
          return (
            <a key={i} href={seg.href} target="_blank" rel="noopener noreferrer" className="underline break-all">
              {seg.href}
            </a>
          );
        }
        return (
          <span key={i} className="mt-1 block whitespace-normal">
            <StallLinkCard segment={seg} />
          </span>
        );
      })}
    </div>
  );
}
