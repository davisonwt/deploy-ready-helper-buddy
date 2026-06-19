/**
 * BeadPopup — Sacred Day Detail Modal
 *
 * Opens when a bead in any month strand (or the dashboard week strip) is clicked.
 * Shows feast days, omer count, sabbath, weekday, and existing journal summary,
 * plus an inline DIARY editor where the user can plan that day:
 *  • Quick notes
 *  • Garden plan / tasks (checkable)
 *  • Photos, voice notes, videos
 *  • Reminders / alarms (via Notification API)
 *
 * Diary data is stored per-YHWH-day in localStorage so it survives offline.
 * The long-form Journal (Supabase) is still surfaced read-only at the top.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X, FileText, Image as ImageIcon, Heart, Sparkles, Calendar, Star,
  Mic, Video, Bell, Sprout, Plus, Trash2, Check, BookOpen, Save, ArrowLeft,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { calculateCreatorDate } from '@/utils/dashboardCalendar';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';

interface BeadPopupProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  day: number;
}

// ---------- Sacred metadata helpers ----------

const DAYS_PER_MONTH = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
const OMER_START_DOY = 26; // matches useSacredNow

function dayOfYearFor(month: number, day: number): number {
  let total = 0;
  for (let m = 1; m < month; m++) total += DAYS_PER_MONTH[m - 1];
  return total + day;
}

function computeOmer(month: number, day: number): number | null {
  const doy = dayOfYearFor(month, day);
  const o = doy - OMER_START_DOY + 1;
  return o >= 1 && o <= 50 ? o : null;
}

function getFeastDayName(month: number, day: number): string | null {
  if (month === 1) {
    if (day === 1) return 'Aviv 1 — New Year';
    if (day === 10) return 'Pick Lamb';
    if (day === 14) return 'Slaughter Lamb (Evening)';
    if (day >= 15 && day <= 21) return 'Feast of Unleavened Bread';
  }
  if (month === 2) {
    if (day === 10) return 'Pick Lamb (Pesach Sheni window)';
    if (day === 14) return 'Pesach Sheni';
  }
  if (month === 3) {
    if (day === 15) return "Shavu'ot";
    if (day === 31) return 'Intercalary Day';
  }
  if (month === 5 && day === 3) return 'Feast of New Wine';
  if (month === 6) {
    if (day === 22) return 'Feast of New Oil';
    if (day >= 23 && day <= 27) return 'Wood Gathering Days';
    if (day === 31) return 'Intercalary Day';
  }
  if (month === 7) {
    if (day === 1) return 'Yowm Teruah';
    if (day >= 9 && day <= 10) return 'Yowm Kippur';
    if (day >= 15 && day <= 22) return 'Sukkot';
  }
  return null;
}

function getSacredHistory(month: number, day: number): string | null {
  if (month === 1 && day === 1) return 'Spring begins. Sun rises in the 4th Portal. Tam\'ayen leads the 1st Month (Enoch 82:15). Noah\'s Memorial Festival #1 of 4.';
  if (month === 1 && day === 14) return 'Pesach lamb slaughtered at evening (Exodus 12).';
  if (month === 1 && day === 15) return 'Feast of Unleavened Bread begins — Israel comes out of Egypt.';
  if (month === 3 && day === 15) return "Shavu'ot — giving of Torah at Sinai; first wheat harvest.";
  if (month === 7 && day === 1) return 'Yowm Teruah — Day of Trumpets / Shouting.';
  if (month === 7 && day === 10) return 'Yowm Kippur — Day of Atonement; high Sabbath.';
  if (month === 7 && day === 15) return 'Sukkot begins — Feast of Tabernacles.';
  return null;
}

function getGardenTip(month: number): string {
  const tips: Record<number, string> = {
    1: 'Aviv: prepare beds, sow early greens.',
    2: 'Iyar: thin seedlings, mulch deeply.',
    3: 'Sivan: harvest first wheat at Shavu\'ot.',
    4: 'Tammuz: water before sunrise.',
    5: 'Av: prune for airflow.',
    6: 'Elul: clear weeds for autumn feasts.',
    7: 'Tishrei: gather the harvest.',
    8: 'Cheshvan: plant garlic and onions.',
    9: 'Kislev: rest and plan next year\'s plot.',
    10: 'Tevet: prune dormant fruit trees.',
    11: 'Shevat: bless the trees — Tu BiShvat.',
    12: 'Adar: prepare beds, test and amend soil.',
  };
  return tips[month] ?? 'Tend the garden you\'ve been given.';
}

// ---------- Diary storage ----------

interface DiaryReminder { id: string; at: string; text: string; fired?: boolean; }
interface DiaryTask { id: string; text: string; done: boolean; category?: 'garden' | 'prayer' | 'work' | 'family'; }
interface DiaryMedia { id: string; data: string; name?: string; }
interface DiaryDay {
  notes: string;
  tasks: DiaryTask[];
  reminders: DiaryReminder[];
  photos: DiaryMedia[];
  voiceNotes: DiaryMedia[];
  videos: DiaryMedia[];
  updatedAt: string;
}

const emptyDiary = (): DiaryDay => ({
  notes: '', tasks: [], reminders: [], photos: [], voiceNotes: [], videos: [], updatedAt: new Date().toISOString(),
});

function diaryKey(year: number, month: number, day: number) {
  return `s2g.diary.${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function loadDiary(year: number, month: number, day: number): DiaryDay {
  try {
    const raw = localStorage.getItem(diaryKey(year, month, day));
    return raw ? { ...emptyDiary(), ...JSON.parse(raw) } : emptyDiary();
  } catch {
    return emptyDiary();
  }
}

function saveDiary(year: number, month: number, day: number, diary: DiaryDay) {
  diary.updatedAt = new Date().toISOString();
  localStorage.setItem(diaryKey(year, month, day), JSON.stringify(diary));
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ---------- Component ----------

export function BeadPopup({ isOpen, onClose, year, month, day }: BeadPopupProps) {
  const { user } = useAuth();

  const [journalEntry, setJournalEntry] = useState<any>(null);
  const [yhwhDate, setYhwhDate] = useState<ReturnType<typeof calculateCreatorDate> | null>(null);
  const [diary, setDiary] = useState<DiaryDay>(() => loadDiary(year, month, day));
  const [tab, setTab] = useState<'sacred' | 'diary' | 'media' | 'reminders'>('sacred');
  const [newTask, setNewTask] = useState('');
  const [newTaskCat, setNewTaskCat] = useState<DiaryTask['category']>('garden');
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('');
  const photoInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Sacred day scripture + moon phase from DB
  const [scripture, setScripture] = useState<{ note: string | null; song: string | null; portal: string | null } | null>(null);
  const [moon, setMoon] = useState<{ phase: string; illumination_pct: number } | null>(null);

  // Reload diary when target day changes
  useEffect(() => {
    if (isOpen) setDiary(loadDiary(year, month, day));
  }, [isOpen, year, month, day]);

  // Sacred date info
  useEffect(() => {
    if (isOpen && year && month && day) {
      const greg = getGregorianDateForYhwh(year, month, day);
      setYhwhDate(calculateCreatorDate(greg));
    }
  }, [isOpen, year, month, day]);

  // Load journal entry summary
  useEffect(() => {
    if (!isOpen || !user || !yhwhDate) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('journal_entries')
          .select('content')
          .eq('user_id', user.id)
          .eq('yhwh_year', yhwhDate.year)
          .eq('yhwh_month', yhwhDate.month)
          .eq('yhwh_day', yhwhDate.day)
          .maybeSingle();
        if (data?.content) setJournalEntry(data.content);
      } catch (e) { console.error('journal load failed', e); }
    })();
  }, [isOpen, user, yhwhDate]);

  // Schedule reminders via Notifications API
  useEffect(() => {
    if (!isOpen) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    const timers: number[] = [];
    diary.reminders.forEach(r => {
      if (r.fired) return;
      const t = new Date(r.at).getTime() - Date.now();
      if (t > 0 && t < 24 * 3600 * 1000) {
        const id = window.setTimeout(() => {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🌱 Sow2Grow reminder', { body: r.text });
          } else {
            alert(`🌱 Reminder: ${r.text}`);
          }
          const next = { ...diary, reminders: diary.reminders.map(x => x.id === r.id ? { ...x, fired: true } : x) };
          setDiary(next); saveDiary(year, month, day, next);
        }, t);
        timers.push(id);
      }
    });
    return () => timers.forEach(window.clearTimeout);
  }, [isOpen, diary.reminders, year, month, day]);

  // Helpers
  const persist = (next: DiaryDay) => { setDiary(next); saveDiary(year, month, day, next); };

  const addTask = () => {
    if (!newTask.trim()) return;
    persist({ ...diary, tasks: [...diary.tasks, { id: crypto.randomUUID(), text: newTask.trim(), done: false, category: newTaskCat }] });
    setNewTask('');
  };
  const toggleTask = (id: string) => persist({ ...diary, tasks: diary.tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) });
  const removeTask = (id: string) => persist({ ...diary, tasks: diary.tasks.filter(t => t.id !== id) });

  const addReminder = () => {
    if (!newReminderText.trim() || !newReminderTime) return;
    const today = new Date();
    const [hh, mm] = newReminderTime.split(':').map(Number);
    const at = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hh, mm).toISOString();
    persist({ ...diary, reminders: [...diary.reminders, { id: crypto.randomUUID(), at, text: newReminderText.trim() }] });
    setNewReminderText(''); setNewReminderTime('');
  };
  const removeReminder = (id: string) => persist({ ...diary, reminders: diary.reminders.filter(r => r.id !== id) });

  const handlePhotos = async (files: FileList | null) => {
    if (!files) return;
    const added: DiaryMedia[] = [];
    for (const f of Array.from(files)) added.push({ id: crypto.randomUUID(), data: await fileToDataUrl(f), name: f.name });
    persist({ ...diary, photos: [...diary.photos, ...added] });
  };
  const handleVideos = async (files: FileList | null) => {
    if (!files) return;
    const added: DiaryMedia[] = [];
    for (const f of Array.from(files)) added.push({ id: crypto.randomUUID(), data: await fileToDataUrl(f), name: f.name });
    persist({ ...diary, videos: [...diary.videos, ...added] });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      rec.ondataavailable = e => { if (e.data.size) recordedChunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const data = await fileToDataUrl(new File([blob], 'voice.webm', { type: 'audio/webm' }));
        persist({ ...diary, voiceNotes: [...diary.voiceNotes, { id: crypto.randomUUID(), data, name: `voice-${Date.now()}.webm` }] });
        stream.getTracks().forEach(t => t.stop());
      };
      mediaRecorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch (e) {
      alert('Microphone access denied or unavailable.');
    }
  };
  const stopRecording = () => { mediaRecorderRef.current?.stop(); setRecording(false); };

  const removeMedia = (kind: 'photos' | 'voiceNotes' | 'videos', id: string) =>
    persist({ ...diary, [kind]: diary[kind].filter(m => m.id !== id) } as DiaryDay);

  // Sacred metadata
  const isShabbat = yhwhDate?.weekDay === 7;
  const feastName = getFeastDayName(month, day);
  const omer = computeOmer(month, day);
  const history = getSacredHistory(month, day);
  const gardenTip = getGardenTip(month);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-gradient-to-br from-purple-950 via-indigo-900 to-teal-900 rounded-3xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}
        <div className="p-5 border-b border-purple-500/30 flex-shrink-0">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            size="sm"
            className="mb-4 gap-2 border-border/60 bg-background/20 text-primary-foreground hover:bg-accent/30"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Diary Dates
          </Button>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                {year} / {String(month).padStart(2, '0')} / {String(day).padStart(2, '0')}
              </h2>
              <div className="flex flex-wrap gap-2">
                {isShabbat && <Badge className="bg-yellow-500 text-black"><Star className="w-3 h-3 mr-1" />Shabbat</Badge>}
                {feastName && <Badge className="bg-blue-500 text-white"><Calendar className="w-3 h-3 mr-1" />{feastName}</Badge>}
                {omer && <Badge className="bg-amber-600 text-white"><Sprout className="w-3 h-3 mr-1" />Omer {omer}/50</Badge>}
                {yhwhDate && <Badge variant="outline" className="text-gray-200 border-gray-400">Day {yhwhDate.weekDay === 7 ? 'Shabbat' : yhwhDate.weekDay} of Week</Badge>}
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:text-red-400 p-2"><X className="w-5 h-5" /></button>
          </div>

          {/* Tab strip */}
          <div className="flex gap-1 mt-4 bg-black/30 rounded-lg p-1">
            {[
              { id: 'sacred', label: 'Sacred', icon: Sparkles },
              { id: 'diary', label: 'Diary', icon: BookOpen },
              { id: 'media', label: 'Media', icon: ImageIcon },
              { id: 'reminders', label: 'Reminders', icon: Bell },
            ].map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id as any)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-sm font-semibold transition ${
                    tab === t.id ? 'bg-amber-500 text-black' : 'text-purple-200 hover:bg-purple-800/40'
                  }`}>
                  <Icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === 'sacred' && (
            <div className="space-y-3">
              {history && (
                <div className="bg-amber-900/30 border border-amber-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2 text-amber-300 font-semibold"><Sparkles className="w-4 h-4" /> Sacred History</div>
                  <p className="text-amber-100/90 text-sm leading-relaxed">{history}</p>
                </div>
              )}
              <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2 text-emerald-300 font-semibold"><Sprout className="w-4 h-4" /> Garden Tip</div>
                <p className="text-emerald-100/90 text-sm leading-relaxed">{gardenTip}</p>
                <Button size="sm" variant="outline" className="mt-3 border-emerald-400 text-emerald-200" onClick={() => setTab('diary')}>
                  <Plus className="w-3 h-3 mr-1" /> Plan a garden task
                </Button>
              </div>
              {journalEntry && (
                <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2 text-white font-semibold"><FileText className="w-4 h-4" /> Journal entry exists</div>
                  <p className="text-gray-300 text-xs">There is a long-form journal entry for this day. Open the Diary &amp; Journal page to view it.</p>
                </div>
              )}
            </div>
          )}

          {tab === 'diary' && (
            <div className="space-y-4">
              <div>
                <label className="text-purple-200 text-sm font-semibold mb-1 block">Quick note for the day</label>
                <Textarea value={diary.notes} onChange={e => persist({ ...diary, notes: e.target.value })}
                  placeholder="What's on your heart for this day?" className="bg-black/40 border-purple-500/30 text-white min-h-[90px]" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-purple-200 text-sm font-semibold flex items-center gap-2"><Check className="w-4 h-4" /> Plan &amp; Tasks</label>
                </div>
                <div className="flex gap-2 mb-2">
                  <select value={newTaskCat} onChange={e => setNewTaskCat(e.target.value as any)}
                    className="bg-black/40 border border-purple-500/30 text-white rounded px-2 text-xs">
                    <option value="garden">🌱 Garden</option>
                    <option value="prayer">🙏 Prayer</option>
                    <option value="work">💼 Work</option>
                    <option value="family">👨‍👩‍👧 Family</option>
                  </select>
                  <Input value={newTask} onChange={e => setNewTask(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTask()}
                    placeholder="Add a task…" className="bg-black/40 border-purple-500/30 text-white" />
                  <Button size="sm" onClick={addTask}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="space-y-1.5">
                  {diary.tasks.map(t => (
                    <div key={t.id} className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                      <button onClick={() => toggleTask(t.id)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${t.done ? 'bg-emerald-500 border-emerald-400' : 'border-purple-400'}`}>
                        {t.done && <Check className="w-3 h-3 text-white" />}
                      </button>
                      <span className={`flex-1 text-sm ${t.done ? 'line-through text-gray-400' : 'text-white'}`}>
                        {t.category === 'garden' && '🌱 '}
                        {t.category === 'prayer' && '🙏 '}
                        {t.category === 'work' && '💼 '}
                        {t.category === 'family' && '👨‍👩‍👧 '}
                        {t.text}
                      </span>
                      <button onClick={() => removeTask(t.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                  {diary.tasks.length === 0 && <p className="text-purple-300/60 text-xs italic">No tasks yet — plan something for this day.</p>}
                </div>
              </div>

              <div className="flex justify-end">
                <Button size="sm" onClick={() => saveDiary(year, month, day, diary)}>
                  <Save className="w-4 h-4 mr-1" /> Saved automatically
                </Button>
              </div>
            </div>
          )}

          {tab === 'media' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <Button size="sm" variant="outline" className="border-purple-400 text-purple-100" onClick={() => photoInput.current?.click()}>
                  <ImageIcon className="w-4 h-4 mr-1" /> Photo
                </Button>
                <Button size="sm" variant="outline" className={`border-pink-400 ${recording ? 'bg-red-600 text-white animate-pulse' : 'text-pink-100'}`} onClick={recording ? stopRecording : startRecording}>
                  <Mic className="w-4 h-4 mr-1" /> {recording ? 'Stop' : 'Voice'}
                </Button>
                <Button size="sm" variant="outline" className="border-blue-400 text-blue-100" onClick={() => videoInput.current?.click()}>
                  <Video className="w-4 h-4 mr-1" /> Video
                </Button>
              </div>
              <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={e => handlePhotos(e.target.files)} />
              <input ref={videoInput} type="file" accept="video/*" multiple hidden onChange={e => handleVideos(e.target.files)} />

              {diary.photos.length > 0 && (
                <div>
                  <p className="text-purple-200 text-xs mb-2">Photos ({diary.photos.length})</p>
                  <div className="grid grid-cols-3 gap-2">
                    {diary.photos.map(p => (
                      <div key={p.id} className="relative group">
                        <img src={p.data} alt="" className="w-full h-24 object-cover rounded-lg" />
                        <button onClick={() => removeMedia('photos', p.id)} className="absolute top-1 right-1 bg-red-600/80 rounded-full p-1 opacity-0 group-hover:opacity-100">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diary.voiceNotes.length > 0 && (
                <div>
                  <p className="text-purple-200 text-xs mb-2">Voice notes ({diary.voiceNotes.length})</p>
                  <div className="space-y-2">
                    {diary.voiceNotes.map(v => (
                      <div key={v.id} className="flex items-center gap-2 bg-black/30 rounded-lg p-2">
                        <audio controls src={v.data} className="flex-1 h-8" />
                        <button onClick={() => removeMedia('voiceNotes', v.id)} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diary.videos.length > 0 && (
                <div>
                  <p className="text-purple-200 text-xs mb-2">Videos ({diary.videos.length})</p>
                  <div className="space-y-2">
                    {diary.videos.map(v => (
                      <div key={v.id} className="relative">
                        <video controls src={v.data} className="w-full max-h-48 rounded-lg bg-black" />
                        <button onClick={() => removeMedia('videos', v.id)} className="absolute top-1 right-1 bg-red-600/80 rounded-full p-1">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {diary.photos.length === 0 && diary.voiceNotes.length === 0 && diary.videos.length === 0 && (
                <p className="text-purple-300/60 text-xs italic text-center py-6">No media for this day yet.</p>
              )}
            </div>
          )}

          {tab === 'reminders' && (
            <div className="space-y-3">
              <p className="text-xs text-purple-200/80">Reminders fire as browser notifications while this tab is open. Same-day only.</p>
              <div className="flex gap-2">
                <Input type="time" value={newReminderTime} onChange={e => setNewReminderTime(e.target.value)} className="bg-black/40 border-purple-500/30 text-white w-28" />
                <Input value={newReminderText} onChange={e => setNewReminderText(e.target.value)} placeholder="Remind me to…" className="bg-black/40 border-purple-500/30 text-white" />
                <Button size="sm" onClick={addReminder}><Bell className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-1.5">
                {diary.reminders.map(r => {
                  const t = new Date(r.at);
                  return (
                    <div key={r.id} className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                      <Bell className={`w-4 h-4 ${r.fired ? 'text-gray-500' : 'text-amber-300'}`} />
                      <span className="text-xs text-purple-200 w-14">{t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className={`flex-1 text-sm ${r.fired ? 'line-through text-gray-400' : 'text-white'}`}>{r.text}</span>
                      <button onClick={() => removeReminder(r.id)} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  );
                })}
                {diary.reminders.length === 0 && <p className="text-purple-300/60 text-xs italic text-center py-4">No reminders set.</p>}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border/40 bg-background/20 p-4">
          <Button type="button" onClick={onClose} className="w-full gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Diary Dates
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// Convert YHWH date back to Gregorian (matches calculateCreatorDate epoch).
function getGregorianDateForYhwh(yhwhYear: number, yhwhMonth: number, yhwhDay: number): Date {
  const monthDays = [30, 30, 31, 30, 30, 31, 30, 30, 31, 30, 30, 31];
  const EPOCH = new Date(2025, 2, 20);
  let days = (yhwhYear - 6028) * 364;
  for (let i = 0; i < yhwhMonth - 1; i++) days += monthDays[i];
  days += yhwhDay - 1;
  const g = new Date(EPOCH);
  g.setDate(g.getDate() + days);
  return g;
}
