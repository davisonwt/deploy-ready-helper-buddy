import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ChevronDown, ChevronUp, X, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  type RadioSlot, type RundownSegment, SLOT_SECONDS, formatDuration, staffCancelSlot,
} from '@/lib/radio/radioSlotsApi';

const KIND_LABEL: Record<string, string> = {
  opening: 'Opening', talk: 'Talk', song: 'Song', advert: 'Advert', jingle: 'Jingle', handover: 'Handover', show: 'Whole show',
};

function SlotRundown({ slotId }: { slotId: string }) {
  const [segments, setSegments] = useState<RundownSegment[] | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: segError } = await supabase
        .from('radio_rundown_segments')
        .select('*')
        .eq('slot_id', slotId)
        .order('position', { ascending: true });
      if (cancelled) return;
      if (segError) { setError(segError.message); return; }
      const rows = (data ?? []) as RundownSegment[];
      setSegments(rows);
      const urls: Record<string, string> = {};
      for (const seg of rows) {
        if (!seg.audio_path) continue;
        const { data: signed } = await supabase.storage.from('dj-rundown-segments').createSignedUrl(seg.audio_path, 3600);
        if (signed?.signedUrl) urls[seg.id] = signed.signedUrl;
      }
      if (!cancelled) setAudioUrls(urls);
    })();
    return () => { cancelled = true; };
  }, [slotId]);

  if (error) return <div className="text-sm text-destructive">Couldn't load the rundown: {error}</div>;
  if (!segments) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading rundown…</div>;
  if (segments.length === 0) return <div className="text-sm text-muted-foreground">No segments yet. The DJ hasn't built this rundown.</div>;

  const total = segments.reduce((sum, s) => sum + (s.kind === 'song' && !s.track_product_id ? 0 : s.duration_seconds), 0);
  return (
    <div className="space-y-2">
      <div className="text-xs font-mono text-muted-foreground">{formatDuration(total)} / {formatDuration(SLOT_SECONDS)}</div>
      {segments.map((seg) => (
        <div key={seg.id} className="rounded-md border p-2 space-y-1">
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <Badge variant="secondary" className="text-[10px]">{KIND_LABEL[seg.kind] ?? seg.kind}</Badge>
            <span className="font-mono text-xs text-muted-foreground">{formatDuration(seg.duration_seconds)}</span>
            {seg.kind === 'song' && <span className="truncate">{seg.track_title_snapshot || 'Untitled track'}{!seg.track_product_id && ' (removed by sower)'}</span>}
          </div>
          {seg.notes && <div className="text-xs text-muted-foreground">{seg.notes}</div>}
          {audioUrls[seg.id] && <audio controls preload="none" src={audioUrls[seg.id]} className="w-full h-8" />}
        </div>
      ))}
    </div>
  );
}

/**
 * Station staff view of booked Grove Station slots: upcoming and
 * scheduled shows, their rundown with audio preview, and cancel with a
 * reason (the DJ is told in chat by cancel-radio-slot).
 */
export default function RadioSlotsAdminPanel() {
  const { toast } = useToast();
  const [slots, setSlots] = useState<RadioSlot[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - SLOT_SECONDS * 1000).toISOString();
    const { data, error } = await supabase
      .from('radio_slots')
      .select('*')
      .in('status', ['draft', 'scheduled'])
      .gte('starts_at', since)
      .order('starts_at', { ascending: true })
      .limit(200);
    if (error) {
      toast({ title: "Couldn't load radio slots", description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as RadioSlot[];
    setSlots(rows);
    const ids = [...new Set(rows.map((r) => r.dj_user_id))];
    if (ids.length > 0) {
      const { data: profiles } = await supabase.from('profiles_public').select('user_id, display_name, first_name, username').in('user_id', ids);
      const map: Record<string, string> = {};
      for (const p of (profiles ?? []) as Array<{ user_id: string; display_name: string | null; first_name: string | null; username: string | null }>) {
        map[p.user_id] = p.display_name?.trim() || p.first_name?.trim() || p.username?.trim() || 'A member';
      }
      setNames(map);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmCancel = async (slot: RadioSlot) => {
    if (reason.trim().length < 3) {
      toast({ title: 'Add a reason', description: 'The DJ will see this reason in their chat, so say what went wrong.', variant: 'destructive' });
      return;
    }
    setCancelling(true);
    try {
      const result = await staffCancelSlot(slot.id, reason.trim());
      toast({
        title: 'Slot cancelled',
        description: result.notified ? 'The DJ has been told in chat.' : "Cancelled, but the chat notice to the DJ didn't send. Message them directly.",
        variant: result.notified ? undefined : 'destructive',
      });
      setCancelId(null);
      setReason('');
      await load();
    } catch (err: any) {
      toast({ title: "Couldn't cancel that slot", description: err.message, variant: 'destructive' });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-3" data-testid="radio-slots-admin">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">Radio Slots</h2>
          <p className="text-sm text-muted-foreground">Booked Grove Station shows, soonest first. Drafts have not been submitted yet.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : slots.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground text-center">No upcoming slots are booked.</CardContent></Card>
      ) : (
        slots.map((slot) => {
          const start = new Date(slot.starts_at);
          const onAirNow = slot.status === 'scheduled' && Date.now() >= start.getTime() && Date.now() < start.getTime() + SLOT_SECONDS * 1000;
          return (
            <Card key={slot.id} data-slot-id={slot.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{slot.title || 'Untitled show'}</div>
                    <div className="text-xs text-muted-foreground">
                      {start.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      {' · '}{start.toISOString().slice(0, 16).replace('T', ' ')} UTC
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <Badge variant="secondary" className="text-[10px]">{names[slot.dj_user_id] ?? '…'}</Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{slot.status}</Badge>
                      {onAirNow && <Badge className="text-[10px] bg-red-600 text-white">On air</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setOpenId(openId === slot.id ? null : slot.id)}>
                      {openId === slot.id ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />} Rundown
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { setCancelId(slot.id); setReason(''); }}>
                      <X className="h-4 w-4 mr-1" /> Cancel slot
                    </Button>
                  </div>
                </div>

                {cancelId === slot.id && (
                  <div className="rounded-md border border-destructive/40 p-2 space-y-2">
                    <Textarea
                      placeholder="Why is this slot being cancelled? The DJ sees this."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                      aria-label="Cancel reason"
                    />
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="destructive" disabled={cancelling} onClick={() => void confirmCancel(slot)}>
                        {cancelling && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Confirm cancel
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setCancelId(null)}>Keep slot</Button>
                    </div>
                  </div>
                )}

                {openId === slot.id && <SlotRundown slotId={slot.id} />}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
