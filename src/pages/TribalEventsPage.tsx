/**
 * TribalEventsPage — calendar + list view of all upcoming community events.
 * Members can RSVP, jump to a Jitsi room (when assigned), or download an .ics
 * file to add the event to their personal calendar.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Plus, Check, X, Download, Users, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface EventRow {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  host_id: string;
  circle_id: string | null;
  starts_at: string;
  duration_minutes: number;
  capacity: number | null;
  jitsi_room_id: string | null;
  is_auto_generated: boolean;
  status: string;
  rsvp_count?: number;
  user_rsvp?: 'attending' | 'maybe' | 'declined' | null;
}

const TYPE_LABEL: Record<string, { emoji: string; label: string }> = {
  virtual_market: { emoji: '🛒', label: 'Virtual Market' },
  seed_swap: { emoji: '🌱', label: 'Seed Swap' },
  harvest_celebration: { emoji: '🎉', label: 'Harvest' },
  prayer_circle: { emoji: '🙏', label: 'Prayer Circle' },
  mentorship_session: { emoji: '🧑‍🏫', label: 'Mentorship' },
  custom: { emoji: '✨', label: 'Custom' },
};

function buildIcs(e: EventRow): string {
  const dt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const start = new Date(e.starts_at);
  const end = new Date(start.getTime() + e.duration_minutes * 60_000);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Sow2Grow//TribalEvents//EN',
    'BEGIN:VEVENT',
    `UID:${e.id}@sow2growapp.com`,
    `DTSTAMP:${dt(new Date())}`,
    `DTSTART:${dt(start)}`,
    `DTEND:${dt(end)}`,
    `SUMMARY:${e.title}`,
    `DESCRIPTION:${(e.description ?? '').replace(/\n/g, '\\n')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export default function TribalEventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: ev, error } = await supabase
      .from('tribal_events')
      .select('*')
      .in('status', ['scheduled', 'live'])
      .gte('starts_at', new Date(Date.now() - 3600_000).toISOString())
      .order('starts_at', { ascending: true })
      .limit(50);

    if (error) {
      toast.error('Could not load events');
      setLoading(false);
      return;
    }

    const ids = (ev ?? []).map((e) => e.id);
    let counts = new Map<string, number>();
    let mine = new Map<string, EventRow['user_rsvp']>();
    if (ids.length) {
      const { data: rsvps } = await supabase
        .from('tribal_event_rsvps')
        .select('event_id, user_id, status')
        .in('event_id', ids);
      (rsvps ?? []).forEach((r: any) => {
        if (r.status === 'attending') counts.set(r.event_id, (counts.get(r.event_id) ?? 0) + 1);
        if (r.user_id === user?.id) mine.set(r.event_id, r.status);
      });
    }

    setEvents(
      (ev ?? []).map((e: any) => ({
        ...e,
        rsvp_count: counts.get(e.id) ?? 0,
        user_rsvp: mine.get(e.id) ?? null,
      }))
    );
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const rsvp = async (event: EventRow, status: 'attending' | 'maybe' | 'declined') => {
    if (!user?.id) {
      toast.error('Please sign in first');
      return;
    }
    const { error } = await supabase
      .from('tribal_event_rsvps')
      .upsert({ event_id: event.id, user_id: user.id, status }, { onConflict: 'event_id,user_id' });
    if (error) {
      toast.error('Could not save RSVP');
      return;
    }
    toast.success(status === 'attending' ? "You're in! 🌿" : status === 'maybe' ? 'Marked as maybe' : 'Declined');
    load();
  };

  const downloadIcs = (e: EventRow) => {
    const blob = new Blob([buildIcs(e)], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${e.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const grouped = useMemo(() => {
    const byDay = new Map<string, EventRow[]>();
    events.forEach((e) => {
      const key = format(new Date(e.starts_at), 'EEEE, MMM d');
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(e);
    });
    return Array.from(byDay.entries());
  }, [events]);

  return (
    <div className="container mx-auto max-w-3xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <Link to="/create-orchard">
          <Button size="sm" variant="outline" className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Host event
          </Button>
        </Link>
      </div>

      <header className="rounded-2xl bg-gradient-to-br from-violet-500/10 via-primary/5 to-emerald-500/10 p-4 border border-border/60">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="h-5 w-5 text-violet-600" />
          <h1 className="text-xl font-bold">Tribal Events</h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Live markets, seed swaps, prayer circles, and mentorship sessions across the tribes.
        </p>
      </header>

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Loading events…</div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <Sparkles className="h-6 w-6 text-violet-500 mx-auto mb-2" />
          <p className="text-sm font-semibold mb-1">No events scheduled yet</p>
          <p className="text-xs text-muted-foreground">
            Debian auto-creates weekly markets and seed swaps for every active tribe.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, list]) => (
            <section key={day}>
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                {day}
              </h2>
              <div className="space-y-2">
                {list.map((e) => {
                  const t = TYPE_LABEL[e.event_type] ?? TYPE_LABEL.custom;
                  return (
                    <motion.article
                      key={e.id}
                      layout
                      className="rounded-2xl border border-border/60 bg-card p-3 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{t.emoji}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold truncate">{e.title}</h3>
                            <Badge variant="secondary" className="text-[9px] py-0">{t.label}</Badge>
                            {e.is_auto_generated && (
                              <Badge variant="outline" className="text-[9px] py-0">auto</Badge>
                            )}
                          </div>
                          {e.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{e.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                            <span>{format(new Date(e.starts_at), 'HH:mm')} · {e.duration_minutes}m</span>
                            <span className="flex items-center gap-0.5">
                              <Users className="h-3 w-3" /> {e.rsvp_count ?? 0}
                              {e.capacity ? ` / ${e.capacity}` : ''}
                            </span>
                          </div>

                          <div className="flex gap-1.5 mt-2 flex-wrap">
                            <Button
                              size="sm"
                              variant={e.user_rsvp === 'attending' ? 'default' : 'outline'}
                              className="h-7 text-[11px] gap-1"
                              onClick={() => rsvp(e, 'attending')}
                            >
                              <Check className="h-3 w-3" /> Going
                            </Button>
                            <Button
                              size="sm"
                              variant={e.user_rsvp === 'maybe' ? 'default' : 'outline'}
                              className="h-7 text-[11px]"
                              onClick={() => rsvp(e, 'maybe')}
                            >
                              Maybe
                            </Button>
                            <Button
                              size="sm"
                              variant={e.user_rsvp === 'declined' ? 'destructive' : 'ghost'}
                              className="h-7 text-[11px] gap-1"
                              onClick={() => rsvp(e, 'declined')}
                            >
                              <X className="h-3 w-3" /> Pass
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[11px] gap-1 ml-auto"
                              onClick={() => downloadIcs(e)}
                            >
                              <Download className="h-3 w-3" /> .ics
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
