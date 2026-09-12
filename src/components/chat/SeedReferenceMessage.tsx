import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Sprout } from 'lucide-react';

interface SeedReferenceMetadata {
  seed_id: string;
  title: string;
  cover: string | null;
  /** In-app path back to the seed -- the exact stall sheet it was messaged from, when known (/stall/<username>#stall-kind=<kind>&seed=<id>), else openPath. */
  href: string;
}

/**
 * A quoted "this is what the conversation is about" card, auto-sent as
 * the room's first message by SeedCard.tsx's Message action
 * (attachSeedReferenceIfFirstMessage) -- otherwise a chat scrolls past
 * the one seed it started over and there's no way back to it.
 */
export function SeedReferenceMessage({ metadata }: { metadata: SeedReferenceMetadata }) {
  return (
    <Card className="overflow-hidden max-w-xs border-amber-500/20 bg-[#180f08]">
      <Link to={metadata.href} className="flex items-center gap-3 p-2.5 hover:bg-amber-500/5 transition-colors">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-amber-950/40">
          {metadata.cover ? (
            <img src={metadata.cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-amber-500/50">
              <Sprout className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-500/70">About this seed</p>
          <p className="truncate text-sm font-medium text-amber-50">{metadata.title}</p>
        </div>
      </Link>
    </Card>
  );
}
