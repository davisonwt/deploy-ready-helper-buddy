import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowUp, ArrowDown, Trash2, Loader2, Music, Mic, FileText, Image as ImageIcon, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  type RadioSlot, type RundownSegment, type SegmentKind, type SongOption,
  SLOT_SECONDS, fetchSlotWithSegments, addSongSegment, addAudioSegment,
  updateSegmentAttachments, deleteSegment, reorderSegments, uploadSegmentAudio,
  uploadSegmentFile, searchSongPool, submitSlot, formatDuration,
} from '@/lib/radio/radioSlotsApi';

interface Props {
  slotId: string;
  djUserId: string;
  onBack: () => void;
}

const NON_SONG_KINDS: Exclude<SegmentKind, 'song'>[] = ['opening', 'talk', 'advert', 'jingle', 'handover'];
const KIND_LABEL: Record<SegmentKind, string> = {
  opening: 'Opening', talk: 'Talk', song: 'Song', advert: 'Advert', jingle: 'Jingle', handover: 'Handover',
};

export default function RundownBuilder({ slotId, djUserId, onBack }: Props) {
  const { toast } = useToast();
  const [slot, setSlot] = useState<RadioSlot | null>(null);
  const [segments, setSegments] = useState<RundownSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [addKind, setAddKind] = useState<SegmentKind>('song');
  const [songQuery, setSongQuery] = useState('');
  const [songResults, setSongResults] = useState<SongOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [pendingNotes, setPendingNotes] = useState('');
  const audioInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { slot: s, segments: segs } = await fetchSlotWithSegments(slotId);
      setSlot(s);
      setSegments(segs);
    } catch (err: any) {
      toast({ title: "Couldn't load this slot", description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [slotId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (addKind !== 'song') return;
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const results = await searchSongPool(songQuery);
        if (!cancelled) setSongResults(results.slice(0, 40));
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [songQuery, addKind]);

  const totalSeconds = useMemo(() => segments.reduce((sum, s) => sum + s.duration_seconds, 0), [segments]);
  const overshoot = totalSeconds > SLOT_SECONDS;
  // Rundown lock (2026-09-20): editable only while 'draft' -- matches the
  // RLS policy exactly (radio_rundown_segments_draft_lock migration), so
  // this is UI-convenience only, not the real gate. 'submitted' was never
  // an actual reachable status (submit-radio-slot goes straight to
  // 'scheduled' on success) so dropping it changes nothing observable.
  const isEditable = slot?.status === 'draft';

  const nextPosition = segments.length;

  const handleAddSong = async (track: SongOption) => {
    try {
      const seg = await addSongSegment(slotId, nextPosition, track);
      setSegments((prev) => [...prev, seg]);
      toast({ title: `Added "${track.title}"` });
    } catch (err: any) {
      toast({ title: "Couldn't add that song", description: err.message, variant: 'destructive' });
    }
  };

  const handleAudioFileChosen = async (file: File) => {
    setUploadingAudio(true);
    try {
      const { path, durationSeconds } = await uploadSegmentAudio(djUserId, slotId, file);
      const seg = await addAudioSegment(slotId, nextPosition, addKind as Exclude<SegmentKind, 'song'>, path, durationSeconds, pendingNotes.trim() || null);
      setSegments((prev) => [...prev, seg]);
      setPendingNotes('');
      toast({ title: `Added ${KIND_LABEL[addKind]} segment`, description: `${Math.round(durationSeconds)}s, probed from the real file.` });
    } catch (err: any) {
      toast({ title: "Couldn't add that segment", description: err.message, variant: 'destructive' });
    } finally {
      setUploadingAudio(false);
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
  };

  const handleAttachExtra = async (segment: RundownSegment, file: File, field: 'doc_path' | 'image_path') => {
    try {
      const allowed = field === 'doc_path' ? ['pdf', 'txt'] : ['jpg', 'jpeg', 'png', 'webp'];
      const path = await uploadSegmentFile(djUserId, slotId, file, allowed);
      await updateSegmentAttachments(segment.id, { [field]: path } as any);
      setSegments((prev) => prev.map((s) => (s.id === segment.id ? { ...s, [field]: path } : s)));
    } catch (err: any) {
      toast({ title: "Couldn't attach that file", description: err.message, variant: 'destructive' });
    }
  };

  const handleRemove = async (segment: RundownSegment) => {
    try {
      await deleteSegment(segment.id);
      const remaining = segments.filter((s) => s.id !== segment.id);
      await reorderSegments(remaining.map((s) => s.id));
      setSegments(remaining.map((s, i) => ({ ...s, position: i })));
    } catch (err: any) {
      toast({ title: "Couldn't remove that segment", description: err.message, variant: 'destructive' });
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= segments.length) return;
    const next = [...segments];
    [next[index], next[target]] = [next[target], next[index]];
    setSegments(next);
    await reorderSegments(next.map((s) => s.id));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const result = await submitSlot(slotId);
      toast({ title: 'Rundown submitted', description: `Total ${formatDuration(result.totalSeconds)} — scheduled to air.` });
      await load();
    } catch (err: any) {
      toast({ title: "Couldn't submit", description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!slot) return null;

  const startsAtMs = new Date(slot.starts_at).getTime();
  const isCurrentlyLive = slot.status === 'scheduled' && Date.now() >= startsAtMs && Date.now() < startsAtMs + SLOT_SECONDS * 1000;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4 mr-1" /> Back to schedule</Button>
        <Badge variant="outline" className="capitalize">{slot.status}</Badge>
        <Badge variant="outline" className="capitalize">{slot.mode}</Badge>
      </div>

      {slot.mode === 'live' && (
        <Card className="border-amber-400/50 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-3 text-sm">
            Live broadcast coming soon — until then, this show airs your uploaded audio automatically, exactly like a pre-recorded one.
            {isCurrentlyLive && (
              <div className="mt-2 font-mono text-xs">
                Elapsed {formatDuration(Math.floor((Date.now() - startsAtMs) / 1000))} · Remaining {formatDuration(Math.max(0, SLOT_SECONDS - Math.floor((Date.now() - startsAtMs) / 1000)))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className={`flex items-center justify-between rounded-lg border p-3 ${overshoot ? 'border-destructive bg-destructive/5' : 'border-border'}`}>
        <div className="text-sm font-semibold font-mono">{formatDuration(totalSeconds)} / {formatDuration(SLOT_SECONDS)}</div>
        {overshoot && <div className="text-xs text-destructive">Over by {formatDuration(totalSeconds - SLOT_SECONDS)} — trim before submitting.</div>}
      </div>

      <div className="space-y-2">
        {segments.map((seg, i) => (
          <Card key={seg.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="flex flex-col">
                <Button size="icon" variant="ghost" className="h-5 w-5" disabled={i === 0 || !isEditable} onClick={() => move(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-5 w-5" disabled={i === segments.length - 1 || !isEditable} onClick={() => move(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge variant="secondary" className="text-[10px] capitalize">{KIND_LABEL[seg.kind]}</Badge>
                  <span className="text-xs text-muted-foreground font-mono">{Math.round(seg.duration_seconds)}s</span>
                </div>
                {seg.notes && <div className="text-xs text-muted-foreground truncate">{seg.notes}</div>}
                {isEditable && seg.kind !== 'song' && (
                  <div className="flex gap-2 mt-1">
                    <label className="text-xs text-primary cursor-pointer inline-flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" /> {seg.image_path ? 'Image added' : 'Add image'}
                      <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAttachExtra(seg, f, 'image_path'); }} />
                    </label>
                    <label className="text-xs text-primary cursor-pointer inline-flex items-center gap-1">
                      <FileText className="h-3 w-3" /> {seg.doc_path ? 'Doc added' : 'Add doc'}
                      <input type="file" accept=".pdf,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAttachExtra(seg, f, 'doc_path'); }} />
                    </label>
                  </div>
                )}
              </div>
              {isEditable && (
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleRemove(seg)}><Trash2 className="h-4 w-4" /></Button>
              )}
            </CardContent>
          </Card>
        ))}
        {segments.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">No segments yet.</div>}
      </div>

      {isEditable && (
        <Card>
          <CardContent className="p-3 space-y-3">
            <div className="text-sm font-semibold">Add a segment</div>
            <div className="flex flex-wrap gap-1.5">
              {(['song', ...NON_SONG_KINDS] as SegmentKind[]).map((k) => (
                <Button key={k} size="sm" variant={addKind === k ? 'default' : 'outline'} onClick={() => setAddKind(k)}>
                  {k === 'song' ? <Music className="h-3.5 w-3.5 mr-1" /> : <Mic className="h-3.5 w-3.5 mr-1" />} {KIND_LABEL[k]}
                </Button>
              ))}
            </div>

            {addKind === 'song' ? (
              <div className="space-y-2">
                <Input placeholder="Search by track or sower name…" value={songQuery} onChange={(e) => setSongQuery(e.target.value)} />
                <div className="max-h-56 overflow-y-auto space-y-1">
                  {searching && <div className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Searching…</div>}
                  {!searching && songResults.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleAddSong(t)}
                      className="w-full text-left flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-sm hover:bg-muted/50"
                    >
                      <span className="truncate">{t.title} <span className="text-muted-foreground">— {t.sowerName}</span></span>
                      <span className="text-xs text-muted-foreground font-mono shrink-0">{Math.round(t.durationSeconds)}s</span>
                    </button>
                  ))}
                  {!searching && songResults.length === 0 && <div className="text-xs text-muted-foreground">No tracks match.</div>}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea placeholder="Notes (optional)" value={pendingNotes} onChange={(e) => setPendingNotes(e.target.value)} rows={2} />
                <label className="inline-flex items-center gap-2 text-sm text-primary cursor-pointer">
                  {uploadingAudio ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                  {uploadingAudio ? 'Uploading & probing duration…' : 'Choose WAV or MP3'}
                  <input ref={audioInputRef} type="file" accept=".wav,.mp3" className="hidden" disabled={uploadingAudio}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAudioFileChosen(f); }} />
                </label>
                <p className="text-xs text-muted-foreground">Duration is read from the real file — WAV or MP3 only.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isEditable && (
        <Button className="w-full" size="lg" disabled={submitting || segments.length === 0} onClick={handleSubmit}>
          {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
          Submit rundown
        </Button>
      )}
    </div>
  );
}
