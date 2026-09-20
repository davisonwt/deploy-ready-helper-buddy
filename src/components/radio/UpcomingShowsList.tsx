import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CalendarClock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UpcomingShow {
  id: string;
  starts_at: string;
  mode: string;
  title: string | null;
  ad_price: number | null;
  djName: string;
}

/**
 * Grove Station stall interior's "Shows" hotspot destination -- no tab
 * listed upcoming scheduled shows yet (Phase 1's booking calendar shows
 * every 2h boundary, booked or not, which is a different job). This is
 * just the booked ones, soonest first.
 */
export default function UpcomingShowsList() {
  const [shows, setShows] = useState<UpcomingShow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: slots } = await supabase
        .from('radio_slots')
        .select('id, starts_at, mode, title, ad_price, dj_user_id')
        .eq('status', 'scheduled')
        .gt('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(10);
      const rows = (slots ?? []) as any[];
      if (rows.length === 0) {
        if (!cancelled) { setShows([]); setLoading(false); }
        return;
      }
      const userIds = [...new Set(rows.map((r) => r.dj_user_id))];
      const { data: profiles } = await supabase.from('profiles_public').select('user_id, display_name, first_name, username').in('user_id', userIds);
      const nameByUser = new Map((profiles ?? []).map((p: any) => [p.user_id, p.display_name?.trim() || p.first_name?.trim() || p.username?.trim() || 'A member']));
      if (!cancelled) {
        setShows(rows.map((r) => ({
          id: r.id, starts_at: r.starts_at, mode: r.mode, title: r.title, ad_price: r.ad_price,
          djName: nameByUser.get(r.dj_user_id) ?? 'A member',
        })));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5" />
          Upcoming Shows
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : shows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing booked yet -- check the Schedule tab to book a slot.</p>
        ) : (
          <div className="space-y-2">
            {shows.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">{s.title || (s.mode === 'live' ? 'Live show' : 'Pre-recorded show')} — {s.djName}</div>
                  <div className="text-xs text-muted-foreground">{new Date(s.starts_at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
                </div>
                {s.ad_price != null && (
                  <Badge variant="outline" className="text-[10px] shrink-0 border-amber-500/50 text-amber-600 dark:text-amber-300">
                    Advertise — ${s.ad_price.toFixed(2)}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
