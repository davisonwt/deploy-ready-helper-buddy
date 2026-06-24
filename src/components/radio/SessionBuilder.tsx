import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Mic,
  Music,
  Megaphone,
  MessageSquare,
  Sparkles,
  Upload,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Square,
  Disc3,
  Play,
  Pause,
  Radio,
  Save,
  CalendarCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

type SlotType = 'live_talk' | 'voice_note' | 'song' | 'advert' | 'qa' | 'custom';

interface Slot {
  id: string;
  session_id: string;
  position: number;
  slot_type: SlotType;
  label: string | null;
  notes: string | null;
  duration_seconds: number;
  music_track_id: string | null;
  asset_url: string | null;
  asset_name: string | null;
  asset_mime: string | null;
}

interface Session {
  id: string;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  status: 'draft' | 'scheduled';
  total_duration_seconds: number;
}

interface MusicTrack {
  id: string;
  title: string;
  artist: string | null;
  duration: number | null;
  file_url: string | null;
}

const TOTAL_TARGET_SECONDS = 2 * 60 * 60; // 7200

const SLOT_META: Record<
  SlotType,
  { label: string; icon: typeof Mic; description: string; color: string }
> = {
  live_talk: {
    label: 'Live Talk',
    icon: Mic,
    description: 'Open mic — you talk live in this slot',
    color: 'text-radio-amber',
  },
  voice_note: {
    label: 'Voice Note',
    icon: Mic,
    description: 'Upload or record a pre-recorded voice message',
    color: 'text-radio-amber',
  },
  song: {
    label: 'Song',
    icon: Music,
    description: 'Pick a track from your music library',
    color: 'text-radio-blue',
  },
  advert: {
    label: 'Advert',
    icon: Megaphone,
    description: 'Upload a sponsor or promo audio clip',
    color: 'text-radio-mist',
  },
  qa: {
    label: 'Q&A',
    icon: MessageSquare,
    description: 'Live questions & answers segment',
    color: 'text-radio-amber',
  },
  custom: {
    label: 'Custom',
    icon: Sparkles,
    description: 'Anything else — upload audio or leave open',
    color: 'text-radio-mist',
  },
};

function fmt(sec: number) {
  if (!sec || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

async function readAudioDuration(file: File | Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.src = url;
    audio.onloadedmetadata = () => {
      const d = isFinite(audio.duration) ? audio.duration : 0;
      URL.revokeObjectURL(url);
      resolve(Math.round(d));
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
  });
}

const SessionBuilder = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingTitle, setSavingTitle] = useState(false);
  const [listenSessionId, setListenSessionId] = useState<string | null>(null);

  const active = sessions.find((s) => s.id === activeId) || null;
  const usedSeconds = useMemo(
    () => slots.reduce((acc, s) => acc + (s.duration_seconds || 0), 0),
    [slots]
  );
  const remaining = Math.max(0, TOTAL_TARGET_SECONDS - usedSeconds);
  const pct = Math.min(100, (usedSeconds / TOTAL_TARGET_SECONDS) * 100);

  // Load sessions
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('radio_prerecorded_sessions')
        .select('*')
        .eq('host_user_id', user.id)
        .order('created_at', { ascending: false });
      setSessions((data as Session[]) || []);
      setLoading(false);
    })();
    (async () => {
      const { data } = await supabase
        .from('dj_music_tracks')
        .select('id,track_title,artist_name,duration_seconds,file_url')
        .order('created_at', { ascending: false })
        .limit(200);
      const mapped: MusicTrack[] = (data || []).map((t: any) => ({
        id: t.id,
        title: t.track_title,
        artist: t.artist_name,
        duration: t.duration_seconds,
        file_url: t.file_url,
      }));
      setTracks(mapped);
    })();
  }, [user]);

  // Load slots when active session changes
  useEffect(() => {
    if (!activeId) {
      setSlots([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('radio_prerecorded_slots')
        .select('*')
        .eq('session_id', activeId)
        .order('position', { ascending: true });
      setSlots((data as Slot[]) || []);
    })();
  }, [activeId]);

  const refreshTotal = async (sessionId: string, newSlots: Slot[]) => {
    const total = newSlots.reduce((a, s) => a + (s.duration_seconds || 0), 0);
    await supabase
      .from('radio_prerecorded_sessions')
      .update({ total_duration_seconds: total })
      .eq('id', sessionId);
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, total_duration_seconds: total } : s))
    );
  };

  const createSession = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('radio_prerecorded_sessions')
      .insert({
        host_user_id: user.id,
        title: 'Untitled 2-hour session',
        status: 'draft',
      })
      .select('*')
      .single();
    if (error || !data) {
      toast({ title: 'Could not create session', description: error?.message, variant: 'destructive' });
      return;
    }
    setSessions((prev) => [data as Session, ...prev]);
    setActiveId(data.id);
  };

  const deleteSession = async (id: string) => {
    if (!confirm('Delete this session and all its slots? This cannot be undone.')) return;
    await supabase.from('radio_prerecorded_sessions').delete().eq('id', id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const updateSessionField = async (patch: Partial<Session>) => {
    if (!active) return;
    setSavingTitle(true);
    await supabase.from('radio_prerecorded_sessions').update(patch).eq('id', active.id);
    setSessions((prev) => prev.map((s) => (s.id === active.id ? { ...s, ...patch } : s)));
    setSavingTitle(false);
  };

  const addSlot = async (slot_type: SlotType) => {
    if (!active) return;
    const position = slots.length;
    const { data, error } = await supabase
      .from('radio_prerecorded_slots')
      .insert({
        session_id: active.id,
        position,
        slot_type,
        duration_seconds: 0,
        label: SLOT_META[slot_type].label,
      })
      .select('*')
      .single();
    if (error || !data) {
      toast({ title: 'Could not add slot', description: error?.message, variant: 'destructive' });
      return;
    }
    const newSlots = [...slots, data as Slot];
    setSlots(newSlots);
  };

  const removeSlot = async (id: string) => {
    const slot = slots.find((s) => s.id === id);
    if (slot?.asset_url && user) {
      // Best-effort: try to remove uploaded file from storage
      try {
        const key = slot.asset_url.split('/radio-session-assets/')[1];
        if (key) await supabase.storage.from('radio-session-assets').remove([key]);
      } catch {}
    }
    await supabase.from('radio_prerecorded_slots').delete().eq('id', id);
    const remaining = slots.filter((s) => s.id !== id).map((s, i) => ({ ...s, position: i }));
    // Re-position in DB
    await Promise.all(
      remaining.map((s) =>
        supabase.from('radio_prerecorded_slots').update({ position: s.position }).eq('id', s.id)
      )
    );
    setSlots(remaining);
    if (active) await refreshTotal(active.id, remaining);
  };

  const moveSlot = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= slots.length) return;
    const copy = [...slots];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    const repositioned = copy.map((s, i) => ({ ...s, position: i }));
    setSlots(repositioned);
    await Promise.all(
      repositioned.map((s) =>
        supabase.from('radio_prerecorded_slots').update({ position: s.position }).eq('id', s.id)
      )
    );
  };

  const patchSlotLocal = (id: string, patch: Partial<Slot>) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const updateSlotDb = async (id: string, patch: Partial<Slot>) => {
    await supabase.from('radio_prerecorded_slots').update(patch).eq('id', id);
  };

  const handleUpload = async (slot: Slot, file: File) => {
    if (!user || !active) return;
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${user.id}/${active.id}/${slot.id}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('radio-session-assets')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      toast({ title: 'Upload failed', description: upErr.message, variant: 'destructive' });
      return;
    }
    const { data: signed } = await supabase.storage
      .from('radio-session-assets')
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    const duration = await readAudioDuration(file);
    const patch: Partial<Slot> = {
      asset_url: signed?.signedUrl || path,
      asset_name: file.name,
      asset_mime: file.type,
      duration_seconds: duration,
    };
    await updateSlotDb(slot.id, patch);
    const updated = slots.map((s) => (s.id === slot.id ? { ...s, ...patch } : s));
    setSlots(updated);
    if (active) await refreshTotal(active.id, updated);
    toast({ title: 'Uploaded', description: `${file.name} (${fmt(duration)})` });
  };

  const handlePickTrack = async (slot: Slot, track: MusicTrack) => {
    const patch: Partial<Slot> = {
      music_track_id: track.id,
      label: `${track.title}${track.artist ? ' — ' + track.artist : ''}`,
      duration_seconds: Math.round(track.duration || 0),
      asset_url: null,
      asset_name: null,
      asset_mime: null,
    };
    await updateSlotDb(slot.id, patch);
    const updated = slots.map((s) => (s.id === slot.id ? { ...s, ...patch } : s));
    setSlots(updated);
    if (active) await refreshTotal(active.id, updated);
  };

  const setLiveDuration = async (slot: Slot, mmss: string) => {
    const [mm, ss] = mmss.split(':').map((x) => parseInt(x, 10) || 0);
    const total = mm * 60 + ss;
    await updateSlotDb(slot.id, { duration_seconds: total });
    const updated = slots.map((s) => (s.id === slot.id ? { ...s, duration_seconds: total } : s));
    setSlots(updated);
    if (active) await refreshTotal(active.id, updated);
  };

  const updateLabel = async (slot: Slot, label: string) => {
    patchSlotLocal(slot.id, { label });
    await updateSlotDb(slot.id, { label });
  };

  const scheduleSession = async () => {
    if (!active) return;
    if (!active.scheduled_at) {
      toast({ title: 'Pick a date first', description: 'Set a scheduled date before going live.', variant: 'destructive' });
      return;
    }
    await updateSessionField({ status: 'scheduled' });
    toast({ title: 'Scheduled', description: 'Your session is now visible to listeners.' });
  };

  if (!user) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      {/* Sessions sidebar */}
      <Card className="radio-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-bitter text-radio-mist text-base">My Sessions</CardTitle>
            <Button size="sm" variant="ghost" onClick={createSession} className="h-7 px-2 text-radio-amber hover:bg-radio-amber/10">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
          {loading && <p className="text-sm text-radio-mist/50">Loading…</p>}
          {!loading && sessions.length === 0 && (
            <p className="text-sm text-radio-mist/60">
              No sessions yet. Hit <span className="text-radio-amber">+</span> to start building a 2-hour show.
            </p>
          )}
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className={`w-full text-left rounded-md px-3 py-2 border transition-colors ${
                activeId === s.id
                  ? 'bg-radio-blue/20 border-radio-amber/50'
                  : 'bg-radio-bg/40 border-radio-blue/20 hover:border-radio-amber/30'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bitter text-sm text-radio-mist truncate">{s.title}</span>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    s.status === 'scheduled'
                      ? 'border-radio-amber/50 text-radio-amber'
                      : 'border-radio-blue/40 text-radio-mist/70'
                  }`}
                >
                  {s.status}
                </Badge>
              </div>
              <div className="text-xs text-radio-mist/60 mt-1">
                {fmt(s.total_duration_seconds)} / 2:00:00
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {/* Active session */}
      <div className="space-y-4">
        {!active ? (
          <Card className="radio-card">
            <CardContent className="py-16 text-center">
              <Disc3 className="h-12 w-12 mx-auto text-radio-amber/70 mb-4" />
              <p className="text-radio-mist/80 font-bitter text-lg mb-4">Build your 2-hour radio session</p>
              <p className="text-radio-mist/60 text-sm max-w-md mx-auto mb-6">
                Mix live talk, pre-recorded voice notes, songs, adverts and Q&A — slot-by-slot. We track your time used and what's left to fill.
              </p>
              <Button onClick={createSession} className="bg-radio-amber text-radio-bg hover:bg-radio-amber/90">
                <Plus className="h-4 w-4 mr-2" /> Create new session
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Session header */}
            <Card className="radio-card">
              <CardContent className="pt-6 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-[240px] space-y-2">
                    <Input
                      value={active.title}
                      onChange={(e) =>
                        setSessions((prev) =>
                          prev.map((s) => (s.id === active.id ? { ...s, title: e.target.value } : s))
                        )
                      }
                      onBlur={(e) => updateSessionField({ title: e.target.value })}
                      placeholder="Session title"
                      className="font-bitter text-xl bg-transparent border-0 border-b border-radio-blue/30 rounded-none px-0 focus-visible:ring-0 focus-visible:border-radio-amber text-radio-mist"
                    />
                    <Textarea
                      value={active.description || ''}
                      onChange={(e) =>
                        setSessions((prev) =>
                          prev.map((s) =>
                            s.id === active.id ? { ...s, description: e.target.value } : s
                          )
                        )
                      }
                      onBlur={(e) => updateSessionField({ description: e.target.value })}
                      placeholder="What's this show about?"
                      className="bg-radio-bg/40 border-radio-blue/30 text-radio-mist text-sm min-h-[60px]"
                    />
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Input
                      type="datetime-local"
                      value={active.scheduled_at ? active.scheduled_at.slice(0, 16) : ''}
                      onChange={(e) =>
                        updateSessionField({
                          scheduled_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                        })
                      }
                      className="bg-radio-bg/60 border-radio-blue/30 text-radio-mist text-sm w-[220px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteSession(active.id)}
                        className="border-destructive/40 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={scheduleSession}
                        disabled={active.status === 'scheduled'}
                        className="bg-radio-amber text-radio-bg hover:bg-radio-amber/90"
                      >
                        <CalendarCheck className="h-4 w-4 mr-1" />
                        {active.status === 'scheduled' ? 'Scheduled' : 'Go Live'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Time meter */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bitter">
                    <span className="text-radio-mist/70">
                      Filled: <span className="text-radio-amber">{fmt(usedSeconds)}</span> of 2:00:00
                    </span>
                    <span
                      className={
                        remaining === 0
                          ? 'text-radio-amber'
                          : usedSeconds > TOTAL_TARGET_SECONDS
                          ? 'text-destructive'
                          : 'text-radio-mist/70'
                      }
                    >
                      {usedSeconds > TOTAL_TARGET_SECONDS
                        ? `Over by ${fmt(usedSeconds - TOTAL_TARGET_SECONDS)}`
                        : `${fmt(remaining)} left to fill`}
                    </span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Add slot */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-radio-mist/70 font-bitter">Add slot:</span>
              {(Object.keys(SLOT_META) as SlotType[]).map((t) => {
                const Icon = SLOT_META[t].icon;
                return (
                  <Button
                    key={t}
                    size="sm"
                    variant="outline"
                    onClick={() => addSlot(t)}
                    className="bg-radio-bg/40 border-radio-blue/30 text-radio-mist hover:border-radio-amber/50 hover:text-radio-amber"
                  >
                    <Icon className={`h-3.5 w-3.5 mr-1.5 ${SLOT_META[t].color}`} />
                    {SLOT_META[t].label}
                  </Button>
                );
              })}
            </div>

            {/* Slot list */}
            <div className="space-y-2">
              {slots.length === 0 && (
                <Card className="radio-card">
                  <CardContent className="py-10 text-center text-sm text-radio-mist/60">
                    No slots yet. Pick a slot type above to start building your 2-hour show.
                  </CardContent>
                </Card>
              )}
              {slots.map((slot, idx) => (
                <SlotRow
                  key={slot.id}
                  slot={slot}
                  index={idx}
                  total={slots.length}
                  tracks={tracks}
                  onMove={moveSlot}
                  onRemove={removeSlot}
                  onUpload={handleUpload}
                  onPickTrack={handlePickTrack}
                  onSetLiveDuration={setLiveDuration}
                  onUpdateLabel={updateLabel}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ---------------- Slot Row ---------------- */

interface SlotRowProps {
  slot: Slot;
  index: number;
  total: number;
  tracks: MusicTrack[];
  onMove: (i: number, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
  onUpload: (slot: Slot, file: File) => Promise<void>;
  onPickTrack: (slot: Slot, t: MusicTrack) => void;
  onSetLiveDuration: (slot: Slot, mmss: string) => void;
  onUpdateLabel: (slot: Slot, label: string) => void;
}

const SlotRow = ({
  slot,
  index,
  total,
  tracks,
  onMove,
  onRemove,
  onUpload,
  onPickTrack,
  onSetLiveDuration,
  onUpdateLabel,
}: SlotRowProps) => {
  const meta = SLOT_META[slot.slot_type];
  const Icon = meta.icon;
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewing, setPreviewing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Recorder state
  const [recording, setRecording] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recElapsed, setRecElapsed] = useState(0);
  const recTimerRef = useRef<number | null>(null);

  const isLive = slot.slot_type === 'live_talk' || slot.slot_type === 'qa';
  const isSong = slot.slot_type === 'song';
  const isUploadable = slot.slot_type === 'voice_note' || slot.slot_type === 'advert' || slot.slot_type === 'custom';

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) onUpload(slot, f);
    },
    [slot, onUpload]
  );

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type });
        await onUpload(slot, file);
      };
      mr.start();
      recRef.current = mr;
      setRecording(true);
      setRecElapsed(0);
      recTimerRef.current = window.setInterval(() => setRecElapsed((x) => x + 1), 1000);
    } catch (err: any) {
      alert('Microphone access denied: ' + err.message);
    }
  };

  const stopRec = () => {
    recRef.current?.stop();
    setRecording(false);
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
  };

  useEffect(() => () => {
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    recRef.current?.stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const togglePreview = () => {
    if (!slot.asset_url) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(slot.asset_url);
      audioRef.current.onended = () => setPreviewing(false);
    }
    if (previewing) {
      audioRef.current.pause();
      setPreviewing(false);
    } else {
      audioRef.current.play();
      setPreviewing(true);
    }
  };

  return (
    <Card
      onDragOver={(e) => {
        if (isUploadable) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={isUploadable ? handleDrop : undefined}
      className={`radio-card transition-colors ${
        dragOver ? 'border-radio-amber bg-radio-amber/5' : ''
      }`}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          {/* Position + reorder */}
          <div className="flex flex-col items-center gap-1 pt-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-radio-mist/60 hover:text-radio-amber"
              onClick={() => onMove(index, -1)}
              disabled={index === 0}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <span className="font-bitter text-xs text-radio-mist/70 w-6 text-center">{index + 1}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-radio-mist/60 hover:text-radio-amber"
              onClick={() => onMove(index, 1)}
              disabled={index === total - 1}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          {/* Icon */}
          <div className="w-10 h-10 rounded-md bg-radio-bg/60 border border-radio-blue/30 flex items-center justify-center shrink-0">
            <Icon className={`h-5 w-5 ${meta.color}`} />
          </div>

          {/* Body */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-radio-blue/40 text-radio-mist/80 text-[10px]">
                {meta.label}
              </Badge>
              <Input
                value={slot.label || ''}
                onChange={(e) =>
                  onUpdateLabel(slot, e.target.value)
                }
                placeholder={meta.label}
                className="h-7 bg-transparent border-0 border-b border-radio-blue/20 rounded-none px-0 focus-visible:ring-0 focus-visible:border-radio-amber text-radio-mist text-sm flex-1 min-w-[160px]"
              />
              <span className="font-bitter text-sm text-radio-amber tabular-nums">
                {fmt(slot.duration_seconds)}
              </span>
            </div>

            {/* Per-type controls */}
            {isLive && (
              <div className="flex items-center gap-2 text-xs text-radio-mist/70">
                <span>You talk live for:</span>
                <Input
                  type="text"
                  placeholder="mm:ss"
                  defaultValue={
                    slot.duration_seconds
                      ? `${Math.floor(slot.duration_seconds / 60)}:${String(slot.duration_seconds % 60).padStart(2, '0')}`
                      : ''
                  }
                  onBlur={(e) => e.target.value && onSetLiveDuration(slot, e.target.value)}
                  className="h-7 w-24 bg-radio-bg/40 border-radio-blue/30 text-radio-mist text-sm"
                />
              </div>
            )}

            {isSong && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-radio-bg/40 border-radio-blue/30 text-radio-mist hover:border-radio-amber/50 hover:text-radio-amber"
                  >
                    <Music className="h-3.5 w-3.5 mr-1.5" />
                    {slot.music_track_id ? 'Change track' : 'Pick from your music library'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-radio-bg border-radio-blue/30 text-radio-mist max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-bitter">Choose a track</DialogTitle>
                  </DialogHeader>
                  <div className="max-h-[60vh] overflow-y-auto space-y-1">
                    {tracks.length === 0 && (
                      <p className="text-sm text-radio-mist/60 py-6 text-center">
                        No tracks in your library yet. Upload music in the Library tab.
                      </p>
                    )}
                    {tracks.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => onPickTrack(slot, t)}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-radio-blue/20 border border-transparent hover:border-radio-amber/40 transition-colors"
                      >
                        <div className="flex justify-between gap-2">
                          <span className="text-sm truncate">{t.title}</span>
                          <span className="text-xs text-radio-amber tabular-nums">
                            {fmt(Math.round(t.duration || 0))}
                          </span>
                        </div>
                        {t.artist && (
                          <div className="text-xs text-radio-mist/60 truncate">{t.artist}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {isUploadable && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onUpload(slot, e.target.files[0])}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  className="bg-radio-bg/40 border-radio-blue/30 text-radio-mist hover:border-radio-amber/50 hover:text-radio-amber"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload audio
                </Button>
                {!recording ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={startRec}
                    className="bg-radio-bg/40 border-radio-blue/30 text-radio-mist hover:border-radio-amber/50 hover:text-radio-amber"
                  >
                    <Mic className="h-3.5 w-3.5 mr-1.5" /> Record voice
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={stopRec}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 animate-pulse"
                  >
                    <Square className="h-3.5 w-3.5 mr-1.5" /> Stop ({fmt(recElapsed)})
                  </Button>
                )}
                <span className="text-xs text-radio-mist/50">
                  or drag &amp; drop an audio file onto this row
                </span>
              </div>
            )}

            {slot.asset_name && (
              <div className="flex items-center gap-2 text-xs text-radio-mist/70">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-radio-amber hover:bg-radio-amber/10"
                  onClick={togglePreview}
                >
                  {previewing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </Button>
                <span className="truncate">{slot.asset_name}</span>
              </div>
            )}
          </div>

          {/* Delete */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onRemove(slot.id)}
            className="h-7 w-7 text-radio-mist/50 hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SessionBuilder;
