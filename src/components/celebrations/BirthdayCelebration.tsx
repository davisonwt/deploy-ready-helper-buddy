import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Sparkles, Cake, X, ChevronRight } from 'lucide-react';
import { useBirthdaysToday, dayCreatedLabel, type BirthdayMember } from '@/hooks/useBirthdaysToday';
import { cn } from '@/lib/utils';

interface Props {
  onCountChange?: (n: number) => void;
  className?: string;
}

/**
 * BirthdayCelebration — festive top banner for tribe members whose
 * "day of creation" (birthday) is today. Cycles through multiple
 * celebrants every 8s. Free-Will Gift button routes to gifting flow.
 */
export function BirthdayCelebration({ onCountChange, className }: Props) {
  const navigate = useNavigate();
  const { members, loading } = useBirthdaysToday();
  const [idx, setIdx] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    onCountChange?.(dismissed ? 0 : members.length);
  }, [members.length, dismissed, onCountChange]);

  useEffect(() => {
    if (members.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % members.length), 8000);
    return () => clearInterval(t);
  }, [members.length]);

  if (loading || dismissed || members.length === 0) return null;

  const m = members[idx];
  const initial = (m.first_name || m.display_name || '?').charAt(0).toUpperCase();
  const dayBorn = dayCreatedLabel(m.date_of_birth);

  return (
    <div className={cn('relative w-full overflow-hidden', className)}>
      {/* Festive backdrop — amber/cyan glows on midnight */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/15 via-fuchsia-500/10 to-cyan-400/15 pointer-events-none" />
      <div className="absolute -top-8 -left-8 h-32 w-32 rounded-full bg-amber-400/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-cyan-400/30 blur-3xl pointer-events-none" />

      {/* Floating sparkles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            initial={{ opacity: 0, y: 0 }}
            animate={{
              opacity: [0, 1, 0],
              y: [-4, -18, -4],
              x: [0, (i % 2 ? 6 : -6), 0],
            }}
            transition={{ duration: 3 + (i * 0.3), repeat: Infinity, delay: i * 0.4 }}
            style={{ left: `${10 + i * 11}%`, top: `${20 + (i % 3) * 20}%` }}
          >
            <Sparkles className="h-3 w-3 text-amber-300/80" />
          </motion.div>
        ))}
      </div>

      <div className="relative flex items-center gap-3 px-3 py-2.5 border-y border-amber-400/20 backdrop-blur-md">
        {/* Avatar with festive ring */}
        <button
          onClick={() => navigate(`/profile/${m.user_id}`)}
          className="relative shrink-0 group"
          aria-label={`View ${m.display_name}'s profile`}
        >
          <motion.div
            animate={{ rotate: [0, 4, -4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-400 via-fuchsia-400 to-cyan-400 blur-sm opacity-70 group-hover:opacity-100"
          />
          <div className="relative h-12 w-12 rounded-full overflow-hidden ring-2 ring-amber-300/80 bg-slate-900">
            {m.avatar_url ? (
              <img src={m.avatar_url} alt={m.display_name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-amber-200 font-bold text-lg">
                {initial}
              </div>
            )}
          </div>
          <div className="absolute -top-1 -right-1 bg-amber-400 text-slate-900 rounded-full p-0.5 shadow-lg">
            <Cake className="h-3 w-3" />
          </div>
        </button>

        {/* Message */}
        <AnimatePresence mode="wait">
          <motion.div
            key={m.user_id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.4 }}
            className="min-w-0 flex-1"
          >
            <div className="text-[11px] uppercase tracking-wider text-amber-300/90 font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              Tribe celebration · today is {dayBorn} they were created
            </div>
            <div className="text-sm text-white truncate">
              <span className="font-semibold text-amber-100">{m.display_name}</span>
              <span className="text-white/70"> — let's bless them with a free-will gift 🎁</span>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Gift CTA */}
        <button
          onClick={() => navigate(`/free-will-gifting?to=${m.user_id}&occasion=birthday`)}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-900 text-sm font-semibold shadow-lg shadow-amber-500/30 transition"
        >
          <Gift className="h-4 w-4" />
          <span className="hidden sm:inline">Free-Will Gift</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        {/* Pager dots */}
        {members.length > 1 && (
          <div className="hidden md:flex items-center gap-1 pl-1">
            {members.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === idx ? 'w-4 bg-amber-300' : 'w-1.5 bg-white/30'
                )}
                aria-label={`Show celebrant ${i + 1}`}
              />
            ))}
          </div>
        )}

        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 rounded-full hover:bg-white/10 text-white/60 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
