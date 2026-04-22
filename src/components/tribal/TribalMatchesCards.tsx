import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Handshake, Sparkles, X, Check, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useTribalMatches } from '@/hooks/useTribalMatches';
import { DashboardTheme } from '@/utils/dashboardThemes';

interface Props {
  theme?: DashboardTheme;
  /** When true, also asks Debian to dispatch DMs to matched members on accept-refresh. */
  dispatchDm?: boolean;
}

/**
 * TribalMatchesCards — soft, warm horizontal stack of companion-suggested
 * collaborations between the current member and other Sow2Grow tribe members.
 * Lives inside My Garden and is also reachable from the Orchard Companions hub.
 */
export const TribalMatchesCards: React.FC<Props> = ({ theme, dispatchDm = true }) => {
  const { matches, loading, refreshing, refresh, respond } = useTribalMatches();

  const headerColor = theme?.textPrimary ?? 'hsl(var(--foreground))';
  const subColor = theme?.textSecondary ?? 'hsl(var(--muted-foreground))';

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-1.5" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)/0.18), hsl(var(--primary)/0.08))' }}>
            <Handshake className="h-4 w-4" style={{ color: 'hsl(var(--primary))' }} />
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: headerColor }}>Tribal Collabs</h3>
            <p className="text-[10px]" style={{ color: subColor }}>Warm matches Gentoo found for you</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => refresh(dispatchDm)}
          disabled={refreshing}
          className="h-7 gap-1 text-[11px]"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Listening…' : 'Find more'}
        </Button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-xs" style={{ color: subColor }}>
          Listening to the tribe…
        </div>
      ) : matches.length === 0 ? (
        <button
          onClick={() => refresh(dispatchDm)}
          className="group w-full rounded-2xl border border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-5 text-left transition-all hover:border-primary/60 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/15 p-2">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: headerColor }}>
                No collabs yet — tap to let Gentoo scan the tribe
              </p>
              <p className="text-[11px]" style={{ color: subColor }}>
                We&apos;ll suggest seeds that grow beautifully alongside yours.
              </p>
            </div>
          </div>
        </button>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
          <AnimatePresence>
            {matches.map((m) => (
              <motion.article
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="snap-start shrink-0 w-[280px] rounded-2xl border border-border/60 bg-card/95 p-4 shadow-sm backdrop-blur-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                      <AvatarImage src={m.partner_avatar ?? undefined} />
                      <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
                        {(m.partner_name ?? 'T').slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-semibold leading-tight">{m.partner_name ?? 'Tribe member'}</p>
                      <Badge variant="secondary" className="mt-0.5 h-4 px-1.5 text-[9px]">
                        {m.match_type === 'bundle' ? '🌿 Bundle' : m.match_type === 'co_promotion' ? '📣 Co-promo' : '🤝 Collab'}
                      </Badge>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold tabular-nums text-primary/70">
                    {Math.round(m.confidence_score * 100)}%
                  </span>
                </div>

                <p className="text-[12px] leading-relaxed text-foreground/85 mb-2 line-clamp-3">
                  🌱 {m.match_reason}
                </p>
                {m.suggested_action && (
                  <p className="text-[10px] leading-snug text-muted-foreground italic mb-3 line-clamp-2">
                    {m.suggested_action}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => respond(m.id, true)}
                    className="flex-1 h-8 gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Check className="h-3 w-3" />
                    <span className="text-[11px]">Accept</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => respond(m.id, false)}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    aria-label="Decline match"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}

      {matches.length > 0 && (
        <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground italic">
          <Users className="h-3 w-3" />
          Accept to let Debian send a warm intro to your tribe sibling.
        </p>
      )}
    </section>
  );
};
