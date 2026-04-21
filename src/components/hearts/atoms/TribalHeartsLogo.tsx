/**
 * TribalHeartsLogo — official sanctuary mark.
 * - Default: transparent emblem (lotus-heart sigil) with a warm halo.
 * - banner: transparent "Tribal Hearts" wordmark for headers/landing.
 */
import emblemSrc from '@/assets/tribal-hearts-logo.png';
import wordmarkSrc from '@/assets/tribal-hearts-wordmark.png';

interface Props {
  size?: number;
  className?: string;
  /** when true, render the wordmark (Tribal Hearts text) instead of the emblem */
  banner?: boolean;
}

export function TribalHeartsLogo({ size = 120, className, banner = false }: Props) {
  if (banner) {
    return (
      <img
        src={wordmarkSrc}
        alt="Tribal Hearts"
        className={className}
        style={{
          width: '100%',
          height: 'auto',
          maxWidth: size * 3,
          display: 'block',
          filter:
            'drop-shadow(0 0 18px hsl(38 72% 66% / 0.45)) drop-shadow(0 0 40px hsl(22 78% 44% / 0.25))',
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
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 50%, hsl(41 84% 71% / 0.45), hsl(22 78% 44% / 0.18) 55%, transparent 72%)',
          filter: 'blur(2px)',
        }}
      />
      <img
        src={emblemSrc}
        alt="Tribal Hearts"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: 'drop-shadow(0 0 14px hsl(38 72% 66% / 0.55))',
        }}
      />
    </div>
  );
}
