import { Heart, MapPin, ShieldCheck, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { HeartsMatch } from '@/hooks/useTribalHeartsMatches';

interface Props {
  match: HeartsMatch;
  onAccept: () => void;
  onPass: () => void;
}

export function MatchCard({ match, onAccept, onPass }: Props) {
  const p = match.partner;
  const sharedValues = (match.match_reasons.find((r: any) => r.kind === 'values')?.items ?? []).slice(0, 3);
  return (
    <div className="rounded-2xl border border-border/40 bg-card/90 p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-pink-400/30">
          <Heart className="h-6 w-6 text-primary" fill="currentColor" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="truncate font-semibold text-foreground">{p?.display_first_name ?? 'A kindred soul'}</div>
            {p?.photo_verified && (
              <Badge variant="secondary" className="gap-1 text-[10px]"><ShieldCheck className="h-3 w-3" /> verified</Badge>
            )}
          </div>
          {(p?.location_country || p?.location_region) && (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {[p?.location_region, p?.location_country].filter(Boolean).join(', ')}
            </div>
          )}
          <div className="mt-1 text-[11px] text-muted-foreground">Compatibility {Math.round(match.compatibility_score)}%</div>
        </div>
      </div>
      {p?.bio && <p className="mt-3 line-clamp-3 text-sm text-foreground/90">{p.bio}</p>}
      {sharedValues.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {sharedValues.map((v: string) => (
            <Badge key={v} variant="outline" className="text-[10px]">{v}</Badge>
          ))}
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <Button onClick={onAccept} className="flex-1" size="sm">
          <Heart className="mr-1 h-4 w-4" fill="currentColor" /> Accept 🌸
        </Button>
        <Button onClick={onPass} variant="outline" size="sm" className="flex-1">
          <Leaf className="mr-1 h-4 w-4" /> Pass 🍃
        </Button>
      </div>
    </div>
  );
}
