import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Sprout } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  username: string;
  /** The inviter's code from ?ref= (also captured app-wide by useReferralCapture). */
  refCode: string | null;
}

/**
 * What a signed-out visitor sees at /stall/<username>?ref=<code> when that
 * member has no published stall yet: who invited them, what Sow2Grow is,
 * and Join -- carrying the code through signup so they land in the
 * inviter's tribe. The same URL opens the stall itself once one exists.
 */
export default function InviteJoinView({ username, refCode }: Props) {
  const [inviterName, setInviterName] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    supabase.from('profiles_public')
      .select('display_name, first_name, username')
      .eq('username', username)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        const p = data as { display_name: string | null; first_name: string | null; username: string | null } | null;
        setInviterName(p ? (p.display_name?.trim() || p.first_name?.trim() || p.username?.trim() || null) : null);
      });
    return () => { alive = false; };
  }, [username]);

  if (inviterName === undefined) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const registerPath = refCode ? `/register?ref=${encodeURIComponent(refCode)}` : '/register';
  const loginPath = refCode ? `/login?ref=${encodeURIComponent(refCode)}` : '/login';

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-6" data-testid="invite-join">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Sow2Grow home
      </Link>
      <div className="rounded-2xl border bg-card p-6 text-center space-y-4 shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600/15">
          <Sprout className="h-7 w-7 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold">
          {inviterName ? `${inviterName} invited you to Sow2Grow` : "You're invited to Sow2Grow"}
        </h1>
        <p className="text-muted-foreground">
          Sow2Grow is a global tribal marketplace where sowers plant seeds, bestowers fund growth, and orchards turn community support into lasting impact.
        </p>
        {inviterName && (
          <p className="text-sm text-muted-foreground">Join through this page and you'll be part of {inviterName}'s tribe.</p>
        )}
        <Link
          to={registerPath}
          className="block w-full rounded-full bg-emerald-600 px-6 py-3 text-base font-semibold text-white hover:bg-emerald-500 transition-colors"
        >
          Join Sow2Grow
        </Link>
        <p className="text-sm text-muted-foreground">
          Already a member? <Link to={loginPath} className="underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
