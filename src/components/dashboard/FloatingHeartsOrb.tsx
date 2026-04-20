/**
 * FloatingHeartsOrb — Ambassador-only glowing entry point on the dashboard.
 * Tagline: "Find Your Tribe • Grow Together".
 */
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useTribalHeartsAccess } from '@/hooks/useTribalHeartsAccess';

export function FloatingHeartsOrb() {
  const navigate = useNavigate();
  const { hasAccess, loading } = useTribalHeartsAccess();
  if (loading || !hasAccess) return null;

  return (
    <button
      onClick={() => navigate('/tribal-hearts')}
      className="group fixed right-4 top-40 z-40"
      aria-label="Enter Tribal Hearts"
    >
      <div
        className="relative flex h-14 w-14 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, #059669 0%, #E8537A 50%, #D97706 100%)',
          boxShadow:
            '0 0 22px hsl(340 70% 60% / 0.55), 0 0 44px hsl(45 95% 55% / 0.35), 0 0 70px hsl(150 60% 45% / 0.25)',
        }}
      >
        <Heart className="h-6 w-6 text-white drop-shadow" fill="currentColor" />
        <span
          className="absolute inset-0 animate-ping rounded-full opacity-30"
          style={{ background: 'linear-gradient(135deg, #E8537A, #D97706)' }}
        />
      </div>
      <div className="pointer-events-none absolute right-0 top-full mt-2 whitespace-nowrap rounded-lg border border-white/10 bg-black/90 px-3 py-1.5 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
        <div className="font-semibold">Tribal Hearts</div>
        <div className="text-white/70">Find Your Tribe • Grow Together</div>
      </div>
    </button>
  );
}
