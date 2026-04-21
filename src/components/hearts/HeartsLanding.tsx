/**
 * HeartsLanding — Sanctuary splash screen (ref image #17).
 * Shown to non-Ambassadors as the gate, with single CTA to Ambassador page.
 */
import { Link } from 'react-router-dom';
import { LotusHeartLogo } from './atoms/LotusHeartLogo';
import { GlowButton } from './atoms/GlowButton';
import { SacredFooterGlyphs } from './atoms/SacredFooterGlyphs';
import { Heart } from 'lucide-react';

export function HeartsLanding() {
  return (
    <div className="tribal-hearts-sanctuary relative min-h-[calc(100vh-4rem)]">
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col items-center justify-center px-6 py-14 text-center">
        <div className="mb-8 th-ember-pulse rounded-full p-1">
          <LotusHeartLogo size={140} />
        </div>

        <h1 className="th-serif text-5xl font-semibold leading-tight th-gold-text sm:text-6xl">
          Tribal Hearts
        </h1>

        <p className="th-serif mt-4 text-lg italic text-[hsl(var(--th-cream)/0.85)] sm:text-xl">
          Where soul recognises soul.
        </p>

        <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[hsl(var(--th-cream)/0.75)]">
          A sacred fireside garden inside Sow2Grow — open only to Tribe Ambassadors who have
          already chosen growth, and now seek the one their soul recognises.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3">
          <Link to="/tribe-ambassador">
            <GlowButton size="lg">
              <Heart className="h-5 w-5" fill="currentColor" />
              Enter the Sanctuary
            </GlowButton>
          </Link>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--th-gold)/0.7)]">
            Ambassador membership required
          </p>
        </div>

        <div className="mt-16 flex flex-col items-center gap-3">
          <SacredFooterGlyphs />
          <p className="text-[10px] uppercase tracking-[0.28em] text-[hsl(var(--th-gold)/0.55)]">
            Sealed by Sow 2 Grow · No contact ever shared
          </p>
        </div>
      </div>
    </div>
  );
}
