/**
 * GoldFrame — golden ring with ember glow, wraps portraits / icons / buttons.
 * Use shape="circle" for portraits, "pill" for buttons, "square" for tiles.
 */
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  shape?: 'circle' | 'pill' | 'square';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  pulse?: boolean;
}

const sizeMap = {
  sm: 'p-[2px]',
  md: 'p-[3px]',
  lg: 'p-[4px]',
  xl: 'p-[5px]',
};

export function GoldFrame({ children, shape = 'circle', size = 'md', className, pulse = false }: Props) {
  const radius =
    shape === 'circle' ? 'rounded-full'
      : shape === 'pill' ? 'rounded-full'
        : 'rounded-2xl';

  return (
    <div
      className={cn(radius, sizeMap[size], pulse && 'th-ember-pulse', className)}
      style={{
        background: 'var(--th-gold-gradient)',
        boxShadow: pulse ? undefined : 'var(--th-glow-soft)',
      }}
    >
      <div className={cn('overflow-hidden bg-[hsl(var(--th-walnut-dark))]', radius)}>
        {children}
      </div>
    </div>
  );
}
