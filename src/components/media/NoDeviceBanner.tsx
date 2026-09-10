import { useState } from 'react';
import { X } from 'lucide-react';

// Shown by every Daily call join path (JitsiCall.tsx, JitsiRoom.tsx) when
// checkDeviceAvailability() (see daily-config.ts) found no usable camera
// or mic -- the call still joins, just as a viewer/listener instead of
// hanging on a getUserMedia call that will never resolve.
export function NoDeviceBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white backdrop-blur">
      <span>No camera/mic found — joined as viewer</span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="rounded-full p-0.5 hover:bg-white/20"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
