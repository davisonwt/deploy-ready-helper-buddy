/**
 * WoodPanel — walnut gradient surface with soft inner glow,
 * heart-watermark optional, used as the base for sanctuary cards.
 */
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  watermark?: boolean;
  glow?: boolean;
}

export function WoodPanel({ children, className, watermark = true, glow = false }: Props) {
  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-2xl border',
        className,
      )}
      style={{
        background: 'var(--th-wood-gradient-soft)',
        borderColor: 'hsl(var(--th-gold) / 0.25)',
        boxShadow: glow
          ? 'var(--th-inner-shadow), var(--th-glow-soft)'
          : 'var(--th-inner-shadow)',
      }}
    >
      {watermark && (
        <svg
          aria-hidden
          className="pointer-events-none absolute -right-6 -bottom-6 h-40 w-40 opacity-[0.05]"
          viewBox="0 0 24 24"
          fill="hsl(var(--th-gold))"
        >
          <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />
        </svg>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
