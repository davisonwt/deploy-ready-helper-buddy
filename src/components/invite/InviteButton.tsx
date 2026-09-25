import { useRef, type ReactNode } from 'react';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import { useMyInviteLink } from '@/hooks/useMyInviteLink';
import { INVITE_SHARE_TEXT, INVITE_SHARE_TITLE } from '@/lib/invite/inviteLink';

function prefersNativeShare(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
}

/**
 * Shares the signed-in member's own invite link: the native share sheet on
 * a touch device, a copy to the clipboard everywhere else. Needs no stall.
 */
export function useShareInvite() {
  const { url, loading } = useMyInviteLink();
  // A tap in the first seconds after the page opens lands while the code is
  // still loading. Wait briefly for it rather than asking them to tap
  // again: 4s stays inside the ~5s a browser keeps a tap's permission to
  // share or copy.
  const urlRef = useRef(url);
  urlRef.current = url;
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  const share = async () => {
    const started = Date.now();
    while (!urlRef.current && loadingRef.current && Date.now() - started < 4000) {
      await new Promise((r) => setTimeout(r, 100));
    }
    const url = urlRef.current;
    const loading = loadingRef.current;
    if (!url) {
      toast.error(loading ? 'Your invite link is still loading. Try again in a moment.' : "We couldn't load your invite link. Refresh the page and try again.");
      return;
    }
    if (prefersNativeShare()) {
      try {
        await navigator.share({ title: INVITE_SHARE_TITLE, text: INVITE_SHARE_TEXT, url });
        return;
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return; // they closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Invite link copied', { description: `Anyone who joins through it joins your tribe. ${url}` });
    } catch {
      toast.error("Couldn't copy automatically. Copy this link yourself:", { description: url, duration: 20000 });
    }
  };

  return { share, url, loading };
}

interface Props {
  className?: string;
  children?: ReactNode;
  /** Hide the leading icon when the caller supplies its own (e.g. an emoji nav row). */
  hideIcon?: boolean;
}

export default function InviteButton({ className, children, hideIcon }: Props) {
  const { share } = useShareInvite();
  return (
    <button type="button" onClick={() => void share()} className={className} data-testid="invite-people">
      {!hideIcon && <UserPlus className="h-4 w-4 shrink-0" />}
      {children ?? <span>Invite people</span>}
    </button>
  );
}
