/**
 * LotusHeartLogo — the sacred mark used on the splash and headers.
 * Heart cradled in lotus petals, golden glow.
 */
interface Props {
  size?: number;
  className?: string;
}

export function LotusHeartLogo({ size = 96, className = '' }: Props) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      aria-label="Tribal Hearts"
      style={{ filter: 'drop-shadow(0 0 16px hsl(var(--th-gold) / 0.55))' }}
    >
      <defs>
        <linearGradient id="lotus-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(41 84% 71%)" />
          <stop offset="60%" stopColor="hsl(38 72% 66%)" />
          <stop offset="100%" stopColor="hsl(22 78% 44%)" />
        </linearGradient>
        <radialGradient id="lotus-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(38 72% 66% / 0.45)" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill="url(#lotus-glow)" />
      {/* lotus petals */}
      <g stroke="url(#lotus-gold)" strokeWidth="1.6" fill="none" opacity="0.95">
        <path d="M60 96 C 30 90 18 70 22 52 C 38 56 52 70 60 96 Z" fill="url(#lotus-gold)" fillOpacity="0.18" />
        <path d="M60 96 C 90 90 102 70 98 52 C 82 56 68 70 60 96 Z" fill="url(#lotus-gold)" fillOpacity="0.18" />
        <path d="M60 96 C 46 84 40 64 46 46 C 56 56 62 76 60 96 Z" fill="url(#lotus-gold)" fillOpacity="0.22" />
        <path d="M60 96 C 74 84 80 64 74 46 C 64 56 58 76 60 96 Z" fill="url(#lotus-gold)" fillOpacity="0.22" />
      </g>
      {/* heart */}
      <path
        d="M60 78 C 42 66 34 54 38 44 C 41 36 50 34 60 44 C 70 34 79 36 82 44 C 86 54 78 66 60 78 Z"
        fill="url(#lotus-gold)"
        stroke="hsl(41 84% 75%)"
        strokeWidth="1"
      />
      {/* small flame inside */}
      <path d="M60 60 C 56 56 56 50 60 46 C 64 50 64 56 60 60 Z" fill="hsl(22 78% 44%)" />
    </svg>
  );
}
