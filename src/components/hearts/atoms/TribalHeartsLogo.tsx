/**
 * TribalHeartsLogo — official sanctuary mark.
 * Uses the user-supplied "Tribal Hearts" garden photo, masked into a soft
 * circular medallion with a warm golden halo so it sits naturally on the
 * walnut sanctuary background.
 */
import logoSrc from '@/assets/tribal-hearts-logo.jpg';

interface Props {
  size?: number;
  className?: string;
  /** when true, render at native aspect (banner). Default false → circular medallion */
  banner?: boolean;
}

export function TribalHeartsLogo({ size = 120, className, banner = false }: Props) {
  if (banner) {
    return (
      <img
        src={logoSrc}
        alt="Tribal Hearts"
        className={className}
        style={{
          width: '100%',
          height: 'auto',
          borderRadius: 18,
          boxShadow: '0 0 32px hsl(38 72% 66% / 0.35), 0 0 64px hsl(22 78% 44% / 0.18)',
        }}
      />
    );
  }
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: 'relative',
        borderRadius: '50%',
        padding: 4,
        background:
          'radial-gradient(circle at 50% 35%, hsl(41 84% 71% / 0.55), hsl(22 78% 44% / 0.25) 65%, transparent 78%)',
        boxShadow:
          '0 0 28px hsl(38 72% 66% / 0.45), 0 0 60px hsl(22 78% 44% / 0.25), inset 0 0 0 1px hsl(38 72% 66% / 0.4)',
      }}
    >
      <img
        src={logoSrc}
        alt="Tribal Hearts"
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          objectFit: 'cover',
          objectPosition: 'center 38%',
          display: 'block',
        }}
      />
    </div>
  );
}
