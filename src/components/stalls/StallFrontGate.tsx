import SignedImg from '@/components/media/SignedImg';
import { X } from 'lucide-react';

interface Props {
  frontImageUrl: string;
  stallName: string;
  onEnter: () => void;
  onClose: () => void;
}

/**
 * S2G-run "places" (stalls.enter_via_front -- Grove Station, Wandering
 * Hearts, Companions Village, Scripture Study) show this full-frame front/
 * gate image first, before StallVisitPage ever mounts StallInteriorView.
 * Same full-screen dark-wood chrome as StallInteriorView itself (this is
 * the "you're standing at the gate" half of that same room), just with no
 * hotspots of its own -- tapping anywhere, or the Enter pill, is the only
 * action. Every other stall skips this entirely and opens straight into
 * the interior, unchanged.
 */
export default function StallFrontGate({ frontImageUrl, stallName, onEnter, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col overflow-hidden">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-amber-100 hover:bg-black/70 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={onEnter}
        aria-label={`Enter ${stallName}`}
        className="relative flex-1 min-h-0 w-full"
      >
        <SignedImg src={frontImageUrl} alt={stallName} className="absolute inset-0 h-full w-full object-contain" />
        <span className="absolute inset-x-0 bottom-10 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-5 py-2.5 text-sm font-serif font-semibold tracking-wide text-amber-200 backdrop-blur-sm border border-amber-500/30 animate-pulse">
            Enter
          </span>
        </span>
      </button>
    </div>
  );
}
