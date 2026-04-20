import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * FormShell — the cinematic, premium chrome for any form on Sow2Grow.
 *
 * Layers (bottom → top):
 *  1. Aurora wash background (gold + coral + teal radial gradients)
 *  2. Floating soft particles
 *  3. Optional back link
 *  4. Hero block (icon, gradient title, subtitle, benefit chips)
 *  5. Card with grain + premium border glow
 *
 * All forms can wrap their existing content in <FormShell ...>{children}</FormShell>
 * to inherit the same energy without rewriting business logic.
 */
export interface BenefitChip {
  icon?: LucideIcon;
  label: string;
}

interface FormShellProps {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: LucideIcon;
  benefits?: BenefitChip[];
  backTo?: string;
  backLabel?: string;
  /** Render extra content directly under the hero, above the card (e.g. hero video). */
  heroSlot?: React.ReactNode;
  /** Max width of the inner column. */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Optional footer slot inside the card (links, microcopy). */
  footer?: React.ReactNode;
  className?: string;
  cardClassName?: string;
  children: React.ReactNode;
}

const sizeMap = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
};

export const FormShell: React.FC<FormShellProps> = ({
  eyebrow = 'sow2grow • 364yhvh community farm',
  title,
  subtitle,
  icon: Icon = Sparkles,
  benefits,
  backTo,
  backLabel = 'Back',
  heroSlot,
  size = 'md',
  footer,
  className,
  cardClassName,
  children,
}) => {
  return (
    <div
      className={cn(
        'relative min-h-screen w-full overflow-hidden bg-background text-foreground',
        'aurora-wash',
        className,
      )}
    >
      {/* Cinematic floating particles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[8%] top-[12%] h-32 w-32 rounded-full bg-amber-300/10 blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute right-[10%] top-[18%] h-24 w-24 rounded-full bg-primary/10 blur-2xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1.5s' }} />
        <div className="absolute bottom-[18%] left-[20%] h-40 w-40 rounded-full bg-coral-500/10 blur-3xl animate-pulse" style={{ animationDuration: '7s', animationDelay: '2.5s' }} />
        <div className="absolute right-[18%] bottom-[14%] h-20 w-20 rounded-full bg-amber-500/10 blur-2xl animate-pulse" style={{ animationDuration: '4s', animationDelay: '3s' }} />
      </div>

      <div className={cn('relative z-10 mx-auto flex w-full flex-col items-center px-4 py-8 sm:py-12', sizeMap[size])}>
        {backTo && (
          <Link
            to={backTo}
            className="group mb-6 inline-flex items-center gap-2 self-start rounded-full border border-foreground/10 bg-card/60 px-4 py-2 text-sm font-medium text-foreground/80 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:border-amber-500/40 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            {backLabel}
          </Link>
        )}

        {/* Hero block */}
        <div className="mb-6 w-full text-center animate-fade-in">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/20 via-coral-500/15 to-primary/20 shadow-[0_8px_30px_-12px_hsl(var(--amber-500)/0.5)]">
            <Icon className="h-7 w-7 text-amber-300" />
          </div>

          {eyebrow && (
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/80">
              {eyebrow}
            </p>
          )}

          <h1 className="font-display text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            {typeof title === 'string' ? <span className="text-gold-gradient">{title}</span> : title}
          </h1>

          {subtitle && (
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {subtitle}
            </p>
          )}

          {benefits && benefits.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {benefits.map((b, i) => {
                const ChipIcon = b.icon;
                return (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-card/70 px-3 py-1.5 text-xs font-medium text-foreground/85 backdrop-blur-md transition-all duration-300 hover:border-amber-400/40 hover:text-foreground animate-fade-in"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    {ChipIcon && <ChipIcon className="h-3.5 w-3.5 text-amber-300" />}
                    {b.label}
                  </span>
                );
              })}
            </div>
          )}

          <div className="gold-rule mx-auto mt-5 w-24" />
        </div>

        {heroSlot && <div className="mb-6 w-full">{heroSlot}</div>}

        {/* Premium card wrapper */}
        <div
          className={cn(
            'premium-card grain-overlay w-full p-6 sm:p-8 animate-scale-in',
            cardClassName,
          )}
        >
          {children}
          {footer && <div className="mt-6 border-t border-foreground/10 pt-4">{footer}</div>}
        </div>

        <p className="mt-6 text-center text-[11px] italic text-muted-foreground/70">
          "Give, and it will be given to you" — Luke 6:38
        </p>
      </div>
    </div>
  );
};

export default FormShell;
