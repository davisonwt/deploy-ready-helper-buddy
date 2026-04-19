import { useTribalHeartsMatches } from '@/hooks/useTribalHeartsMatches';
import { MatchCard } from './MatchCard';
import { Button } from '@/components/ui/button';
import { RefreshCw, Sparkles } from 'lucide-react';
import { AgentNudgeBubble } from './AgentNudgeBubble';
import { heartsAgentLines } from '@/lib/heartsAgentLines';

export function MatchGarden() {
  const { matches, loading, refreshing, refresh, respond } = useTribalHeartsMatches();
  const pending = matches.filter(m => m.status === 'pending');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <AgentNudgeBubble
          agent="gentoo"
          message={
            pending.length > 0
              ? heartsAgentLines.gentoo.matchesFound(pending.length)
              : heartsAgentLines.gentoo.noMatches
          }
        />
      </div>
      <div className="flex justify-end">
        <Button onClick={refresh} disabled={refreshing} size="sm" variant="secondary">
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Searching the garden…' : 'Find new matches'}
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading the garden…</div>
      ) : pending.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 p-8 text-center">
          <Sparkles className="mx-auto mb-2 h-6 w-6 text-primary" />
          <p className="text-sm text-muted-foreground">No matches yet — tap "Find new matches" to bloom some.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {pending.map(m => (
            <MatchCard key={m.id} match={m} onAccept={() => respond(m.id, true)} onPass={() => respond(m.id, false)} />
          ))}
        </div>
      )}
    </div>
  );
}
