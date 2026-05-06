import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * MidnightShell — unified dark-navy aesthetic matching the main Dashboard.
 * Background: linear-gradient(180deg, #0a0f1a 0%, #060a12 100%)
 * Accent: cyan (#22d3ee) + amber (#f59e0b)
 *
 * Use as the outermost wrapper of any page so the whole app shares one look.
 */
export interface MidnightShellProps {
  children: React.ReactNode
  title?: React.ReactNode
  subtitle?: React.ReactNode
  /** Show a back button in the top-left */
  showBack?: boolean
  /** Override back navigation; default: navigate(-1) */
  onBack?: () => void
  /** Optional right-side header slot (badges, action buttons) */
  rightSlot?: React.ReactNode
  /** Optional icon shown beside the title */
  icon?: React.ReactNode
  /** Container max-width: default 6xl */
  maxWidth?: 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | '7xl' | 'full'
  className?: string
}

export function MidnightShell({
  children,
  title,
  subtitle,
  showBack = true,
  onBack,
  rightSlot,
  icon,
  maxWidth = '6xl',
  className = '',
}: MidnightShellProps) {
  const navigate = useNavigate()
  const widthClass =
    maxWidth === 'full' ? 'w-full' : `max-w-${maxWidth} mx-auto`

  return (
    <div
      className={`min-h-screen text-slate-100 ${className}`}
      style={{
        background:
          'linear-gradient(180deg, #0a0f1a 0%, #060a12 100%)',
      }}
    >
      {/* Subtle ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(34,211,238,0.08), transparent 60%), radial-gradient(ellipse 60% 40% at 90% 100%, rgba(245,158,11,0.06), transparent 60%)',
        }}
      />

      <div className={`relative z-10 px-4 sm:px-6 py-6 ${widthClass}`}>
        <div className="flex items-start justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            {showBack && (
              <button
                onClick={() => (onBack ? onBack() : navigate(-1))}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition"
              >
                <ArrowLeft className="h-4 w-4" />
                Go Back
              </button>
            )}
          </div>
          {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
        </div>

        {(title || subtitle) && (
          <header className="mb-6">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-cyan-400/10 border border-cyan-400/30 text-cyan-300">
                  {icon}
                </div>
              )}
              {title && (
                <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-[0_2px_8px_rgba(34,211,238,0.25)]">
                  {title}
                </h1>
              )}
            </div>
            {subtitle && (
              <p className="mt-2 text-sm sm:text-base text-slate-300/80">
                {subtitle}
              </p>
            )}
          </header>
        )}

        <div className="space-y-6">{children}</div>
      </div>
    </div>
  )
}

/** Glass card — use inside MidnightShell for consistent surfaces */
export function MidnightCard({
  children,
  className = '',
  accent = 'cyan',
}: {
  children: React.ReactNode
  className?: string
  accent?: 'cyan' | 'amber' | 'rose' | 'violet' | 'none'
}) {
  const ring =
    accent === 'cyan'
      ? 'border-cyan-400/20 shadow-[0_0_40px_rgba(34,211,238,0.08)]'
      : accent === 'amber'
      ? 'border-amber-400/25 shadow-[0_0_40px_rgba(245,158,11,0.08)]'
      : accent === 'rose'
      ? 'border-rose-400/25 shadow-[0_0_40px_rgba(244,114,182,0.08)]'
      : accent === 'violet'
      ? 'border-violet-400/25 shadow-[0_0_40px_rgba(139,92,246,0.08)]'
      : 'border-white/10'
  return (
    <div
      className={`rounded-2xl border ${ring} bg-[#0f172a]/80 backdrop-blur p-5 ${className}`}
    >
      {children}
    </div>
  )
}
