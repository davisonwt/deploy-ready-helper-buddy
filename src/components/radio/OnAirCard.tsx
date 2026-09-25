import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const NOW_PLAYING_URL = 'https://zuwkgasbkpjlxzsjzumu.supabase.co/functions/v1/radio-now-playing';
const REFRESH_MS = 30_000;

interface NowPlaying {
  playing: boolean;
  track?: { title: string; sowerName: string } | null;
  segment?: { kind: string } | null;
  slot?: { title: string | null; djName: string } | null;
}

/**
 * What Grove Station is airing right now, from radio-now-playing -- the
 * same resolver radio-stream uses, so a booked show shows as on air here
 * exactly when listeners hear it.
 */
export default function OnAirCard() {
  const [now, setNow] = useState<NowPlaying | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch(NOW_PLAYING_URL, { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as NowPlaying;
        if (!cancelled) { setNow(data); setFailed(false); }
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    void load();
    const t = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  if (failed && !now) {
    return (
      <Card><CardContent className="p-4 text-sm text-muted-foreground">Couldn't reach the station just now. It will retry in 30 seconds.</CardContent></Card>
    );
  }
  if (!now) return null;

  const slot = now.slot ?? null;
  const detail = now.track
    ? `${now.track.title} — ${now.track.sowerName}`
    : now.segment?.kind === 'show' ? 'Pre-recorded show'
    : now.segment ? `${now.segment.kind.charAt(0).toUpperCase()}${now.segment.kind.slice(1)} segment` : null;

  return (
    <Card className={slot ? 'border-2 border-red-500/60' : 'border-2'} data-testid="on-air-card">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Radio className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={slot ? 'bg-red-600 text-white' : ''} variant={slot ? 'default' : 'secondary'}>
              {slot ? 'On air' : now.playing ? 'Autopilot' : 'Off air'}
            </Badge>
            {slot && (
              <span className="font-semibold truncate">{slot.title || 'Pre-recorded show'} · {slot.djName}</span>
            )}
          </div>
          {detail && <div className="text-sm text-muted-foreground truncate mt-1">Now: {detail}</div>}
          {!now.playing && <div className="text-sm text-muted-foreground mt-1">Nothing is playing right now.</div>}
        </div>
      </CardContent>
    </Card>
  );
}
