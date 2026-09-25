import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  type RadioSlot, upcomingBoundaries, fetchUpcomingSlots, bookSlot, cancelSlot,
} from '@/lib/radio/radioSlotsApi';

interface Props {
  djUserId: string;
  onOpenRundown: (slotId: string) => void;
  /** gosat/admin can cancel ANY slot at ANY time (RLS: a second, role-gated
   * UPDATE policy scoped to status='cancelled' only) -- the guarded 24h
   * notice is a DJ-facing rule, not a "no one can ever pull a bad show"
   * rule. */
  isGosatOrAdmin?: boolean;
}

export default function SlotBookingCalendar({ djUserId, onOpenRundown, isGosatOrAdmin }: Props) {
  const { toast } = useToast();
  const [slots, setSlots] = useState<RadioSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<string | null>(null); // starts_at ISO currently being booked
  const [title, setTitle] = useState('');
  const [djNames, setDjNames] = useState<Record<string, string>>({});

  const boundaries = useMemo(() => upcomingBoundaries(14), []);

  const load = async () => {
    setLoading(true);
    try {
      const from = boundaries[0].toISOString();
      const to = boundaries[boundaries.length - 1].toISOString();
      const rows = await fetchUpcomingSlots(from, to);
      setSlots(rows);
      const userIds = [...new Set(rows.map((r) => r.dj_user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles_public').select('user_id, display_name, first_name, username').in('user_id', userIds);
        const map: Record<string, string> = {};
        for (const p of profiles ?? []) {
          map[(p as any).user_id] = (p as any).display_name?.trim() || (p as any).first_name?.trim() || (p as any).username?.trim() || 'A member';
        }
        setDjNames(map);
      }
    } catch (err: any) {
      toast({ title: "Couldn't load the schedule", description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const slotByIso = useMemo(() => {
    const map = new Map<string, RadioSlot>();
    for (const s of slots) map.set(new Date(s.starts_at).toISOString(), s);
    return map;
  }, [slots]);

  const handleBook = async (startsAt: Date) => {
    try {
      const created = await bookSlot(djUserId, startsAt, title.trim() || null);
      toast({ title: 'Slot booked', description: 'Now build your rundown.' });
      setBooking(null);
      setTitle('');
      await load();
      onOpenRundown(created.id);
    } catch (err: any) {
      toast({ title: "Couldn't book that slot", description: err.message, variant: 'destructive' });
    }
  };

  const handleCancel = async (slot: RadioSlot) => {
    try {
      await cancelSlot(slot.id);
      toast({ title: 'Slot cancelled' });
      await load();
    } catch (err: any) {
      toast({ title: "Couldn't cancel", description: err.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const canCancel = (s: RadioSlot) => new Date(s.starts_at).getTime() > Date.now() + 24 * 3600 * 1000;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" /> Times shown in your local timezone, with UTC alongside.
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[70vh] overflow-y-auto pr-1">
        {boundaries.map((b) => {
          const iso = b.toISOString();
          const existing = slotByIso.get(iso);
          const isPast = b.getTime() < Date.now();
          const isMine = existing?.dj_user_id === djUserId;
          const localLabel = b.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
          const utcLabel = b.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';

          return (
            <Card key={iso} className={existing ? (isMine ? 'border-primary' : 'border-muted') : 'border-dashed'}>
              <CardContent className="p-3 space-y-2">
                <div>
                  <div className="text-sm font-semibold">{localLabel}</div>
                  <div className="text-xs text-muted-foreground">{utcLabel}</div>
                </div>
                {existing ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm truncate">{existing.title || (existing.mode === 'live' ? 'Live show' : 'Pre-recorded show')}</div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">{djNames[existing.dj_user_id] ?? '…'}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{existing.mode}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{existing.status}</Badge>
                        {existing.ad_price != null && (
                          <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600 dark:text-amber-300">
                            Advertise in this show — ${existing.ad_price.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {(isMine || isGosatOrAdmin) && existing.status !== 'cancelled' && (
                      <div className="flex flex-col gap-1 shrink-0">
                        {isMine && <Button size="sm" variant="outline" onClick={() => onOpenRundown(existing.id)}>Rundown</Button>}
                        {(canCancel(existing) || isGosatOrAdmin) && (
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleCancel(existing)}>
                            <X className="h-3.5 w-3.5 mr-1" />
                            {isGosatOrAdmin && !isMine ? 'Cancel (gosat)' : 'Cancel'}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ) : isPast ? (
                  <div className="text-xs text-muted-foreground italic">Past</div>
                ) : booking === iso ? (
                  <div className="space-y-2">
                    <Input placeholder="Show title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} className="h-8 text-sm" />
                    <p className="text-xs text-muted-foreground">Pre-recorded show, 2 hours. Live hosting is coming soon.</p>
                    <div className="flex gap-1.5">
                      <Button size="sm" className="flex-1" onClick={() => handleBook(b)}>Confirm booking</Button>
                      <Button size="sm" variant="ghost" onClick={() => setBooking(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => { setBooking(iso); setTitle(''); }}>Book this slot</Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
