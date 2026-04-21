/**
 * WelcomeAbout — sacred sanctuary welcome (re-skinned to fireside vibe).
 */
import { Heart } from 'lucide-react';
import { TribalHeartsLogo } from './atoms/TribalHeartsLogo';
import { GlowButton } from './atoms/GlowButton';
import { SacredFooterGlyphs } from './atoms/SacredFooterGlyphs';
import { useEffect, useState } from 'react';

interface Props { onEnter: () => void; }

export function WelcomeAbout({ onEnter }: Props) {
  const [embers, setEmbers] = useState<{ left: number; delay: number; size: number; dur: number }[]>([]);

  useEffect(() => {
    setEmbers(
      Array.from({ length: 14 }).map(() => ({
        left: Math.random() * 100,
        delay: Math.random() * 8,
        size: 3 + Math.random() * 5,
        dur: 10 + Math.random() * 8,
      })),
    );
  }, []);

  return (
    <div className="tribal-hearts-sanctuary relative isolate min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Floating embers */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {embers.map((p, i) => (
          <span
            key={i}
            className="absolute bottom-0 block rounded-full"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              background: 'radial-gradient(circle, hsl(41 84% 71%), hsl(22 78% 44% / 0.4) 70%, transparent)',
              boxShadow: '0 0 10px hsl(38 72% 66% / 0.7)',
              animation: `thEmberFloat ${p.dur}s linear ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center px-6 py-14 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--th-gold)/0.4)] bg-[hsl(var(--th-walnut-dark)/0.5)] px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-[hsl(var(--th-gold-bright))] backdrop-blur-md">
          ✦ Ambassador-only · Sacred Fireside ✦
        </div>

        <div className="mb-8 th-ember-pulse">
          <TribalHeartsLogo size={160} />
        </div>

        <h1 className="th-serif text-4xl font-semibold leading-tight sm:text-5xl">
          <span className="text-[hsl(var(--th-cream))]">Welcome to </span>
          <span className="th-gold-text italic">Tribal Hearts</span>
        </h1>

        <div className="mt-8 space-y-4 text-base leading-relaxed text-[hsl(var(--th-cream)/0.85)] sm:text-lg">
          <p>
            A sacred garden within Sow2Grow — a private fireside where only{' '}
            <span className="text-[hsl(var(--th-gold-bright))]">Tribe Ambassadors</span> come to seek the one their soul recognises.
          </p>
          <p className="th-serif italic text-[hsl(var(--th-cream))]">
            Here, hearts meet hearts.<br />
            Here, authenticity is the only language.<br />
            Here, two flames find each other and gently become one.
          </p>
          <p className="text-[hsl(var(--th-cream)/0.75)]">
            This is not another dating app. This is a garden where souls who have already chosen growth
            come to find their soul's flame — and weave their lives into a tribe of their own.
          </p>
        </div>

        <div className="mt-10">
          <GlowButton size="lg" onClick={onEnter}>
            <Heart className="h-5 w-5" fill="currentColor" />
            Enter the Garden
          </GlowButton>
        </div>

        <div className="mt-12 flex flex-col items-center gap-3">
          <SacredFooterGlyphs />
          <p className="text-[10px] uppercase tracking-[0.28em] text-[hsl(var(--th-gold)/0.6)]">
            Find your soul's flame · Grow into your tribe
          </p>
        </div>
      </div>
    </div>
  );
}
