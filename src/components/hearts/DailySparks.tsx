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
        className="relative overflow-hidden rounded-2xl border p-5 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--th-walnut) / 0.9), hsl(var(--th-walnut-dark) / 0.95))',
          borderColor: 'hsl(var(--th-gold) / 0.32)',
          boxShadow: 'inset 0 1px 0 hsl(var(--th-gold) / 0.14), var(--th-glow-soft)',
        }}
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full"
             style={{ background: 'radial-gradient(circle, hsl(var(--th-ember) / 0.3), transparent 70%)' }} />
        <div className="pointer-events-none absolute -bottom-12 -left-10 h-36 w-36 rounded-full"
             style={{ background: 'radial-gradient(circle, hsl(var(--th-gold) / 0.18), transparent 70%)' }} />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--th-gold)/0.4)] bg-[hsl(var(--th-walnut-dark)/0.55)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[hsl(var(--th-gold-bright))]">
              <Sparkles className="h-3 w-3" /> Today's Sparks
            </div>
            <h3 className="th-serif mt-2 text-2xl font-semibold leading-tight">
              <span className="th-gold-text">From the Garden</span>
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[hsl(var(--th-cream)/0.72)]">
              Souls our agents felt a quiet resonance with — chosen for you today.
            </p>
          </div>
          <Button
            onClick={refresh}
            disabled={refreshing}
            size="sm"
            className="shrink-0 border text-[hsl(var(--th-gold-bright))]"
            style={{
              background: 'hsl(var(--th-walnut-dark) / 0.7)',
              borderColor: 'hsl(var(--th-gold) / 0.4)',
            }}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? '…' : 'Refresh'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-[hsl(var(--th-cream)/0.7)]">Listening for sparks…</div>
      ) : sparks.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed p-6 text-center"
          style={{
            borderColor: 'hsl(var(--th-gold) / 0.3)',
            background: 'hsl(var(--th-walnut-dark) / 0.35)',
          }}
        >
          <p className="text-sm text-[hsl(var(--th-cream)/0.75)]">
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
