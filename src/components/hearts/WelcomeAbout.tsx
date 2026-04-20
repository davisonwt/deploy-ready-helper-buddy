/**
 * WelcomeAbout — sacred full-screen welcome shown the first time an
 * Ambassador enters Tribal Hearts (and any time via the About button).
 */
import { Button } from '@/components/ui/button';
import { Heart, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  onEnter: () => void;
}

export function WelcomeAbout({ onEnter }: Props) {
  const [petals, setPetals] = useState<{ left: number; delay: number; size: number; dur: number }[]>([]);

  useEffect(() => {
    const arr = Array.from({ length: 18 }).map(() => ({
      left: Math.random() * 100,
      delay: Math.random() * 6,
      size: 6 + Math.random() * 10,
      dur: 9 + Math.random() * 7,
    }));
    setPetals(arr);
  }, []);

  return (
    <div className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sacred gradient base */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse at top, hsl(150 40% 12%) 0%, hsl(220 30% 6%) 60%, hsl(0 0% 3%) 100%)',
        }}
      />
      {/* Golden glow orbs */}
      <div className="pointer-events-none absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-10 h-40 w-40 rounded-full bg-rose-400/10 blur-3xl animate-pulse" />

      {/* Floating petals */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {petals.map((p, i) => (
          <span
            key={i}
            className="absolute -top-6 block rounded-full"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              background:
                'radial-gradient(circle at 30% 30%, hsl(45 95% 75% / 0.9), hsl(340 70% 60% / 0.4) 70%, transparent)',
              boxShadow: '0 0 12px hsl(45 95% 70% / 0.5)',
              animation: `heartsFall ${p.dur}s linear ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes heartsFall {
          0%   { transform: translateY(-10vh) rotate(0deg);   opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
        @keyframes heartsGlow {
          0%, 100% { filter: drop-shadow(0 0 12px hsl(45 95% 65% / 0.5)); }
          50%      { filter: drop-shadow(0 0 28px hsl(45 95% 65% / 0.9)); }
        }
      `}</style>

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col items-center justify-center px-5 py-12 text-center">
        <div
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.22em] text-amber-200 backdrop-blur-md"
        >
          <Sparkles className="h-3 w-3" /> Ambassador-only · Sacred Inner Garden
        </div>

        <div
          className="mb-8 flex h-24 w-24 items-center justify-center rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(150 60% 35% / 0.6), hsl(45 95% 55% / 0.3) 60%, transparent)',
            animation: 'heartsGlow 3.5s ease-in-out infinite',
          }}
        >
          <Heart className="h-12 w-12 text-rose-200" fill="currentColor" />
        </div>

        <h1 className="font-serif text-4xl font-semibold leading-tight text-white sm:text-5xl">
          Welcome to{' '}
          <span
            className="italic"
            style={{
              backgroundImage: 'linear-gradient(135deg, #FBBF24, #F472B6, #34D399)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Tribal Hearts
          </span>
        </h1>

        <div className="mt-8 space-y-4 text-base leading-relaxed text-white/85 sm:text-lg">
          <p>
            Tribal Hearts is a sacred garden within Sow2Grow — a private space where only{' '}
            <span className="text-amber-200">Tribe Ambassadors</span> come to seek the one their soul recognises.
          </p>
          <p className="font-serif italic text-white">
            Here, hearts meet hearts.
            <br />
            Here, authenticity is the only language.
            <br />
            Here, two flames find each other and gently become one — weaving their lives, their people, and their purpose into a tribe of their own.
          </p>
          <p>
            This is not another dating app.
            <br />
            <span className="text-emerald-200">
              This is a garden where souls who have already chosen growth come to find their soul's flame —
              and together become part of each other's tribe.
            </span>
          </p>
          <p className="font-serif italic text-white/90">
            Speak from the heart.
            <br />
            Listen with care.
            <br />
            And watch something sacred take root.
          </p>
        </div>

        <Button
          onClick={onEnter}
          className="mt-10 h-14 rounded-full px-10 text-base font-semibold text-white shadow-2xl transition hover:scale-[1.03]"
          style={{
            background: 'linear-gradient(135deg, #059669 0%, #D97706 100%)',
            boxShadow: '0 0 30px hsl(45 95% 55% / 0.45), 0 0 60px hsl(150 60% 40% / 0.35)',
          }}
        >
          <Heart className="mr-2 h-5 w-5" fill="currentColor" />
          Enter the Garden
        </Button>

        <p className="mt-8 text-[11px] uppercase tracking-[0.22em] text-white/40">
          Find Your souls flame · Grow Together into your tribe
        </p>
      </div>
    </div>
  );
}
