import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Copy, Radio, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ensureMyRefLink, buildWhispererShareLink } from '@/lib/whisperer/attribution';

interface Props {
  assignmentId: string;
  seedPath: string;
  seedTitle?: string;
  /** Live session the whisperer is broadcasting in, when they are going live. */
  liveSessionId?: string | null;
  sessionKind?: string | null;
  triggerLabel?: string;
  triggerVariant?: 'default' | 'secondary' | 'outline';
}

/**
 * Mints (or fetches) the whisperer's OWN referral code for one approved seed —
 * an evergreen code, and a separate code for the live session they are
 * broadcasting in, so a sale made during that live is traceable back to it.
 * Only ACTIVE (sower-approved) assignments can mint a code.
 */
export default function WhispererLiveLinkDialog({
  assignmentId,
  seedPath,
  seedTitle,
  liveSessionId = null,
  sessionKind = null,
  triggerLabel = 'My buy link',
  triggerVariant = 'secondary',
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [evergreen, setEvergreen] = useState<string | null>(null);
  const [liveCode, setLiveCode] = useState<string | null>(null);

  const mint = async (forLive: boolean) => {
    setLoading(true);
    try {
      const { refCode } = await ensureMyRefLink(
        assignmentId,
        forLive ? liveSessionId : null,
        forLive ? sessionKind ?? 'live' : null,
      );
      if (forLive) setLiveCode(refCode);
      else setEvergreen(refCode);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not create your whisperer link');
    } finally {
      setLoading(false);
    }
  };

  const copy = async (code: string, forLive: boolean) => {
    const link = buildWhispererShareLink(seedPath, code, forLive ? liveSessionId : null);
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Copied — every sale through this link pays you.');
    } catch {
      toast.info(link);
    }
  };

  const row = (code: string | null, forLive: boolean) => (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center gap-2">
        {forLive ? <Radio className="h-4 w-4 text-primary" /> : <LinkIcon className="h-4 w-4 text-primary" />}
        <span className="text-sm font-medium">{forLive ? 'This live session' : 'Evergreen link'}</span>
        {code && <Badge variant="outline" className="ml-auto font-mono">{code}</Badge>}
      </div>
      {code ? (
        <>
          <p className="text-xs text-muted-foreground break-all">
            {buildWhispererShareLink(seedPath, code, forLive ? liveSessionId : null)}
          </p>
          <Button size="sm" variant="outline" className="w-full" onClick={() => copy(code, forLive)}>
            <Copy className="h-4 w-4 mr-1" /> Copy link
          </Button>
        </>
      ) : (
        <Button size="sm" className="w-full" disabled={loading} onClick={() => mint(forLive)}>
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
          {forLive ? 'Generate my live buy link' : 'Generate my link'}
        </Button>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={triggerVariant} className="w-full mt-3">
          <LinkIcon className="h-4 w-4 mr-1" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Your whisperer buy link</DialogTitle>
          <DialogDescription>
            {seedTitle ? `${seedTitle} — ` : ''}every sale that comes through your own link is credited to
            you and paid the moment the buyer's payment clears. No further approval from the sower.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {row(evergreen, false)}
          {liveSessionId ? (
            row(liveCode, true)
          ) : (
            <p className="text-xs text-muted-foreground">
              Start a live session to get a separate code for that broadcast, so sales made during your
              live are traced back to it.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
