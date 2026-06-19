/**
 * SacredDayBanner — global announcement bar shown on every page when the
 * current sacred day is a Sabbath or a Feast day. Driven by useSacredNow
 * so it rolls at the user's local sunrise (not midnight).
 *
 * On Sabbath we make it explicit: no buying or selling today. The marketplace
 * pauses until the next sunrise.
 */
import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useSacredNow } from '@/hooks/useSacredNow';

export default function SacredDayBanner() {
  const { isSabbath, isFeast, feastName, loading } = useSacredNow();
  const [dismissed, setDismissed] = useState(false);

  if (loading || dismissed) return null;
  if (!isSabbath && !isFeast) return null;

  const title = isSabbath
    ? '🕊️ Sabbath — set apart day'
    : `✨ Feast day — ${feastName || 'a set-apart convocation'}`;

  const body = isSabbath
    ? 'No buying and no selling today. The marketplace is paused until the next sunrise. Rest, gather, and bless the tribe.'
    : `${feastName ? feastName + ' is upon us. ' : ''}A set-apart day of remembrance — gather with your tribe.`;

  const tone = isSabbath
    ? 'from-amber-500/25 via-amber-400/15 to-yellow-300/10 border-amber-400/40 text-amber-50'
    : 'from-violet-500/25 via-fuchsia-400/15 to-pink-400/10 border-fuchsia-400/40 text-fuchsia-50';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`relative w-full border-b bg-gradient-to-r ${tone} backdrop-blur-md`}
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-start gap-3">
        <Sparkles className="h-4 w-4 mt-0.5 shrink-0 opacity-90" />
        <div className="flex-1 text-xs sm:text-sm leading-snug">
          <span className="font-semibold mr-2">{title}</span>
          <span className="opacity-90">{body}</span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="opacity-70 hover:opacity-100 transition-opacity shrink-0"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
