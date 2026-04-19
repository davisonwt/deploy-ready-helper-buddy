import { Heart, Sparkles } from 'lucide-react';

export function HeartsHeader() {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-border/30 p-5 shadow-lg"
      style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.85), hsl(330 70% 65% / 0.85))' }}
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-8 -left-6 h-32 w-32 rounded-full bg-white/10 blur-3xl" />
      <div className="relative flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
          <Heart className="h-6 w-6 text-white" fill="currentColor" />
        </div>
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/80">
            <Sparkles className="h-3 w-3" /> Ambassador-only
          </div>
          <h1 className="text-2xl font-bold leading-tight text-white">Tribal Hearts Garden</h1>
          <p className="text-sm text-white/85">Meet someone who shares your values — safely, inside our tribe.</p>
        </div>
      </div>
    </div>
  );
}
