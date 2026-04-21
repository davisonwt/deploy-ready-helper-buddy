/**
 * HeartsHeader — sanctuary banner (wood + gold lotus, replaces meadow image).
 */
import { Heart, Shield } from 'lucide-react';
import { LotusHeartLogo } from './atoms/LotusHeartLogo';

export function HeartsHeader() {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border"
      style={{
        background: 'var(--th-wood-gradient)',
        borderColor: 'hsl(var(--th-gold) / 0.3)',
        boxShadow: 'var(--th-inner-shadow), var(--th-glow-soft)',
      }}
    >
      {/* Ember glow orbs */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full"
           style={{ background: 'radial-gradient(circle, hsl(var(--th-ember) / 0.35), transparent 70%)' }} />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-56 w-56 rounded-full"
           style={{ background: 'radial-gradient(circle, hsl(var(--th-gold) / 0.22), transparent 70%)' }} />

      <div className="relative flex flex-col items-center px-6 py-10 text-center sm:flex-row sm:items-center sm:gap-6 sm:py-8 sm:text-left">
        <div className="th-ember-pulse rounded-full p-1">
          <LotusHeartLogo size={84} />
        </div>
        <div className="mt-4 sm:mt-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--th-gold)/0.4)] bg-[hsl(var(--th-walnut-dark)/0.5)] px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--th-gold-bright))] backdrop-blur-md">
            ✦ Sacred Fireside · Ambassador-only
          </div>
          <h1 className="th-serif mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
            <span className="text-[hsl(var(--th-cream))]">Where soul meets </span>
            <span className="th-gold-text italic">soul.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[hsl(var(--th-cream)/0.78)] sm:text-[15px]">
            A quiet, firelit garden where twin flames find each other — protected always
            by our in-house ChatApp. No contact ever leaves the sanctuary.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px] text-[hsl(var(--th-cream)/0.85)] sm:justify-start">
            <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--th-gold)/0.25)] bg-[hsl(var(--th-walnut-dark)/0.4)] px-2.5 py-1 backdrop-blur-md">
              <Heart className="h-3 w-3 text-[hsl(var(--th-gold-bright))]" fill="currentColor" /> Hetero · 18+
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--th-gold)/0.25)] bg-[hsl(var(--th-walnut-dark)/0.4)] px-2.5 py-1 backdrop-blur-md">
              <Shield className="h-3 w-3 text-[hsl(var(--th-gold-bright))]" /> AI-monitored safety
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--th-gold)/0.25)] bg-[hsl(var(--th-walnut-dark)/0.4)] px-2.5 py-1 backdrop-blur-md">
              🌱 Stays inside Sow2Grow
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
