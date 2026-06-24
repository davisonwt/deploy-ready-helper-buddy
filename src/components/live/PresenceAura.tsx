import React from 'react';

/**
 * PresenceAura — soft pulsing ember ring around an avatar to signal another
 * participant's recency. Honest signal source: recency of last message from
 * that participant (no real presence channel exists yet in this app).
 *
 * Pass `lastSignalAt` as ISO string or Date (e.g. the other participant's
 * most recent message timestamp). Pass `typing` true if/when a typing
 * channel is added later — for now no caller passes it.
 */
export type AuraState = 'active' | 'recent' | 'idle';

export function classifyAura(lastSignalAt: string | Date | null | undefined): AuraState {
  if (!lastSignalAt) return 'idle';
  const t = typeof lastSignalAt === 'string' ? new Date(lastSignalAt).getTime() : lastSignalAt.getTime();
  const ageMs = Date.now() - t;
  if (ageMs <= 2 * 60 * 1000) return 'active';
  if (ageMs <= 15 * 60 * 1000) return 'recent';
  return 'idle';
}

interface PresenceAuraProps {
  children: React.ReactNode;
  state: AuraState;
  /** Reserved for future typing channel — pulses faster/tighter when true. */
  typing?: boolean;
  /** Avatar diameter in px so the aura sizes correctly. */
  size?: number;
  className?: string;
}

export const PresenceAura: React.FC<PresenceAuraProps> = ({
  children,
  state,
  typing = false,
  size = 56,
  className = '',
}) => {
  // Tailwind/JSX can't easily express the breath animation precisely; inline
  // styles keep the keyframe + reduced-motion behavior self-contained.
  const baseOpacity = state === 'active' ? 0.7 : state === 'recent' ? 0.45 : 0;
  const minOpacity = state === 'active' ? 0.4 : state === 'recent' ? 0.2 : 0;
  const animationName = state === 'idle'
    ? 'none'
    : typing
      ? 's2g-presence-breath-fast'
      : 's2g-presence-breath';

  return (
    <span
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {state !== 'idle' && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full pointer-events-none motion-reduce:animate-none"
          style={{
            background: `radial-gradient(circle, rgba(255,138,91,${baseOpacity}) 0%, rgba(255,138,91,${minOpacity}) 55%, rgba(255,138,91,0) 75%)`,
            animation: `${animationName} ${typing ? '1.1s' : '3s'} ease-in-out infinite`,
            // Reduced-motion fallback: hold at baseOpacity, no scale animation.
            transformOrigin: 'center',
          }}
        />
      )}
      <span className="relative z-10 inline-flex items-center justify-center" style={{ width: size, height: size }}>
        {children}
      </span>
      {/* keyframes injected once per render — cheap enough; React dedupes via key */}
      <style>{`
        @keyframes s2g-presence-breath {
          0%, 100% { transform: scale(1); opacity: ${minOpacity}; }
          50%      { transform: scale(1.08); opacity: ${baseOpacity}; }
        }
        @keyframes s2g-presence-breath-fast {
          0%, 100% { transform: scale(1); opacity: ${minOpacity}; }
          50%      { transform: scale(1.04); opacity: ${baseOpacity}; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-presence-aura] { animation: none !important; opacity: ${minOpacity} !important; transform: none !important; }
        }
      `}</style>
    </span>
  );
};

export default PresenceAura;
