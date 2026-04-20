/**
 * DailySparks — top 3-5 matches displayed as a glowing "Today's Sparks" card.
 * Reuses the existing matcher; deterministic per-day slice via createdAt order.
 */
import { useTribalHeartsMatches } from '@/hooks/useTribalHeartsMatches';
import { MatchCard } from './MatchCard';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw } from 'lucide-react';

export function DailySparks() {
  const { matches, loading, refreshing, refresh, respond } = useTribalHeartsMatches();
  const sparks = matches.filter(m => m.status === 'pending').slice(0, 5);

  return (
    <div className="space-y-3">
      <div
        className="relative overflow-hidden rounded-2xl border border-amber-400/30 p-4 shadow-2xl"
        style={{
          background:
            'linear-gradient(135deg, hsl(45 60% 12% / 0.85), hsl(150 40% 10% / 0.85))',
          boxShadow:
            '0 0 30px hsl(45 95% 55% / 0.18), inset 0 0 40px hsl(45 95% 55% / 0.06)',
        }}
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-400/20 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">
              <Sparkles className="h-3 w-3" /> Today's Sparks
            </div>
            <h3 className="mt-1.5 font-serif text-xl font-semibold text-white">From the Garden</h3>
            <p className="text-xs text-white/70">
              Souls our agents felt a quiet resonance with — chosen for you today.
            </p>
          </div>
          <Button onClick={refresh} disabled={refreshing} size="sm" variant="secondary" className="shrink-0">
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? '…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Listening for sparks…</div>
      ) : sparks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No sparks yet — refresh, or browse the garden to send the first heart 🌸
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sparks.map(m => (
            <MatchCard key={m.id} match={m} onAccept={() => respond(m.id, true)} onPass={() => respond(m.id, false)} />
          ))}
        </div>
      )}
    </div>
  );
}
