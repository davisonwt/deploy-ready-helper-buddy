/**
 * EventsPulseCard — compact "My Garden" widget showing the next upcoming
 * tribal events the member can RSVP to. Pulls from public.tribal_events
 * via the get_upcoming_tribal_events RPC.
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { DashboardTheme } from '@/utils/dashboardThemes';
import { format } from 'date-fns';

interface EventRow {
  id: string;
  title: string;
  event_type: string;
  starts_at: string;
  duration_minutes: number;
  capacity: number | null;
}

interface Props { theme?: DashboardTheme }

const TYPE_EMOJI: Record<string, string> = {
  virtual_market: '🛒',
  seed_swap: '🌱',
  harvest_celebration: '🎉',
  prayer_circle: '🙏',
  mentorship_session: '🧑‍🏫',
  custom: '✨',
};

export const EventsPulseCard: React.FC<Props> = () => {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_upcoming_tribal_events', { _limit: 3 });
    if (!error && data) setRows(data as EventRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="rounded-2xl border border-border/60 bg-card/95 p-4 shadow-sm">
      <header className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg p-1.5 bg-violet-500/15">
            <Calendar className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold leading-tight">Tribal Events ✨</h3>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Markets, swaps & circles
            </p>
          </div>
        </div>
        <Link to="/tribal-events" className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5">
          All <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      {loading ? (
        <p className="text-[11px] text-muted-foreground italic">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-violet-500/30 bg-violet-500/5 p-3 text-center">
          <Sparkles className="h-4 w-4 text-violet-600 mx-auto mb-1" />
          <p className="text-[11px] font-semibold">No events yet</p>
          <p className="text-[10px] text-muted-foreground">Debian schedules them weekly.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((e) => (
            <li key={e.id}>
              <Link
                to={`/tribal-events?event=${e.id}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60 transition"
              >
                <span className="text-base shrink-0">{TYPE_EMOJI[e.event_type] ?? '✨'}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold truncate leading-tight">{e.title}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {format(new Date(e.starts_at), 'EEE MMM d · HH:mm')} · {e.duration_minutes}m
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
