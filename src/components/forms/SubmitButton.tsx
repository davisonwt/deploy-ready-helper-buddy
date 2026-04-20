import React from 'react';
import { Loader2, Sparkles, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingLabel?: string;
  icon?: LucideIcon;
  fullWidth?: boolean;
  size?: 'md' | 'lg';
}

/**
 * SubmitButton — cinematic primary CTA with animated gradient sheen,
 * sparkle icon, and a graceful loading state.
 *
 * Use anywhere a form needs a "wow" finish: registrations, uploads, sign-ins.
 */
export const SubmitButton: React.FC<SubmitButtonProps> = ({
  loading = false,
  loadingLabel = 'Working magic…',
  icon: Icon = Sparkles,
  fullWidth = true,
  size = 'lg',
  className,
  children,
  disabled,
  ...rest
}) => {
  return (
    <button
      type="submit"
      disabled={disabled || loading}
      className={cn(
        'group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-2xl font-semibold tracking-wide text-white shadow-[0_12px_40px_-12px_hsl(var(--amber-500)/0.55)] transition-all duration-300',
        'bg-gradient-to-r from-amber-500 via-coral-500 to-primary',
        'hover:scale-[1.02] hover:shadow-[0_18px_48px_-12px_hsl(var(--amber-500)/0.7)]',
        'active:scale-[0.99]',
        'disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100',
        size === 'lg' ? 'h-14 px-8 text-base' : 'h-12 px-6 text-sm',
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {/* Animated sheen */}
      <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          <Icon className="h-5 w-5 transition-transform duration-300 group-hover:rotate-12" />
          <span>{children}</span>
        </>
      )}
    </button>
  );
};

export default SubmitButton;
