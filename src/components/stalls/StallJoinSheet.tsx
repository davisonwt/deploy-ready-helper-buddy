import { useNavigate, useLocation } from 'react-router-dom';
import { X, Sprout } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  stallName: string;
  onClose: () => void;
}

/**
 * Guests can browse a published stall's front and interior read-only
 * (StallVisitPage has no ProtectedRoute) -- this is what gates every
 * actual INTERACTION for them: tapping a painted hotspot button. Rail
 * actions (Message/Voice/Video/Heart) and Bestow live inside the sheet a
 * hotspot tap would otherwise open, so gating the tap itself covers all
 * three without touching SeedCard's own per-action guards (which stay
 * exactly as they are for every other page SeedCard renders on).
 *
 * `?ref=<code>` on the current URL is already captured into localStorage
 * by useReferralCapture() (mounted globally in App.tsx) the moment this
 * page loads, and useAuth.jsx's register() already reads it from there
 * -- nothing here needs to thread the code through manually. `next=`
 * carries the full current path (interior stays open at whatever hash
 * state it's in) through register/login and the mandatory onboarding
 * chain via the existing storePendingReturn/readPendingReturn system
 * (src/lib/returnTo.ts, already used by shared-video-link signups).
 */
export default function StallJoinSheet({ stallName, onClose }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = encodeURIComponent(location.pathname + location.search + location.hash);

  return (
    <>
      <div className="fixed inset-0 z-[10000] bg-black/70" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-[10001] rounded-t-2xl bg-[#140c06] border-t border-amber-500/25 px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:inset-x-auto sm:left-1/2 sm:bottom-auto sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[420px] sm:rounded-2xl sm:border">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-amber-300 hover:bg-amber-500/10"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-300">
          <Sprout className="h-6 w-6" />
        </div>
        <h2 className="text-center font-serif text-lg font-semibold text-amber-50">Join Sow2Grow to step in</h2>
        <p className="mt-1.5 text-center text-sm text-amber-100/70">
          Sign up to browse {stallName}'s full stall, message the sower, and bestow.
        </p>

        <div className="mt-5 flex flex-col gap-2">
          <Button
            type="button"
            onClick={() => navigate(`/register?next=${returnTo}`)}
            className="w-full bg-amber-500 text-amber-950 hover:bg-amber-400"
          >
            Sign up free
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/login?next=${returnTo}`)}
            className="w-full border-amber-500/30 text-amber-100 hover:bg-amber-500/10"
          >
            I already have an account
          </Button>
          <button type="button" onClick={onClose} className="mt-1 text-center text-xs text-amber-100/50 hover:text-amber-100/80">
            Not now
          </button>
        </div>
      </div>
    </>
  );
}
