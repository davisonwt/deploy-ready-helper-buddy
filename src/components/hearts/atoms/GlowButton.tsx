/**
 * GlowButton — the warm pill button used across the sanctuary
 * (Enter, Continue Journey, Send a Message).
 */
import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'h-10 px-5 text-sm',
  md: 'h-12 px-7 text-[15px]',
  lg: 'h-14 px-10 text-base',
};

export function GlowButton({
  children, variant = 'primary', size = 'md', className, ...rest
}: Props) {
  if (variant === 'ghost') {
    return (
      <button
        {...rest}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-full border font-semibold transition-all',
          'border-[hsl(var(--th-gold)/0.45)] bg-[hsl(var(--th-walnut-dark)/0.4)] text-[hsl(var(--th-gold-bright))]',
          'hover:bg-[hsl(var(--th-walnut-dark)/0.7)] hover:border-[hsl(var(--th-gold)/0.8)]',
          'backdrop-blur-sm',
          sizeMap[size],
          className,
        )}
      />
    );
  }
  return (
    <button
      {...rest}
      className={cn(
        'group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-semibold tracking-wide text-[hsl(var(--th-walnut-dark))] transition-all',
        'hover:scale-[1.03] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
        sizeMap[size],
        className,
      )}
      style={{
        background: 'var(--th-gold-gradient)',
        boxShadow: 'var(--th-glow-soft), inset 0 1px 0 hsl(0 0% 100% / 0.35)',
      }}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: 'radial-gradient(circle at 30% 30%, hsl(0 0% 100% / 0.35), transparent 60%)' }}
      />
    </button>
  );
}
