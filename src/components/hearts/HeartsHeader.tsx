import { Heart, Sparkles, Shield } from 'lucide-react';
import heroImg from '@/assets/hearts-hero.jpg';

export function HeartsHeader() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/30 shadow-2xl">
      {/* Cinematic background */}
      <img
        src={heroImg}
        alt="Two souls walking together through a sunrise meadow of wildflowers"
        width={1920}
        height={1088}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Layered glow + readability gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      <div
        className="absolute inset-0 mix-blend-soft-light opacity-80"
        style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.55), hsl(330 80% 65% / 0.45) 50%, transparent 80%)' }}
      />
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-3xl animate-pulse" />
      <div className="absolute -bottom-12 -left-10 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />

      {/* Content */}
      <div className="relative px-6 pb-7 pt-32 sm:pb-9 sm:pt-44">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/95 backdrop-blur-md">
          <Sparkles className="h-3 w-3" /> Ambassador-only · Sacred space
        </div>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-white drop-shadow-lg sm:text-4xl">
          Where soul meets <span className="italic text-primary-foreground/95">soul</span>.
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/90 drop-shadow sm:text-base">
          A quiet, cinematic garden inside Sow2Grow where twin flames find each other —
          guided gently by our Linux-family agents, protected always by our in-house ChatApp.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-white/90">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-md">
            <Heart className="h-3 w-3" fill="currentColor" /> Hetero-only · 18+
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-md">
            <Shield className="h-3 w-3" /> AI-monitored safety
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-md">
            🌱 Stays inside Sow2Grow
          </span>
        </div>
      </div>
    </div>
  );
}
