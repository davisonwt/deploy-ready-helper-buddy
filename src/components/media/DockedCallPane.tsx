import { useState, type ReactNode } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface DockedCallPaneProps {
  children: ReactNode;
  /** Tailwind height class for the docked (non-expanded) state. */
  dockedHeightClass?: string;
}

// Wraps a call view (JitsiCall/JitsiRoom, rendered with its non-fullscreen
// sizing mode) so it docks in a fixed-height pane above the rest of a
// chat screen instead of taking over the whole page -- messages, the
// text input, and voice/video note buttons stay usable underneath. Tap
// the corner button to expand to fullscreen and back; the call's own
// controls (mute, camera, hang up, participant count) are unaffected
// either way, they just fill whatever height this pane gives them.
export function DockedCallPane({ children, dockedHeightClass = 'h-[40vh]' }: DockedCallPaneProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={
        expanded
          ? 'fixed inset-0 z-[70] bg-black'
          : `relative w-full ${dockedHeightClass} shrink-0 overflow-hidden border-b border-border bg-black`
      }
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-label={expanded ? 'Shrink call' : 'Expand call to fullscreen'}
        className="absolute top-2 right-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur"
      >
        {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
      <div className="h-full w-full">{children}</div>
    </div>
  );
}
