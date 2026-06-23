import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Calendar, Check, ChevronDown, DollarSign, Dumbbell, FileUp, Loader2, MessageCircle, Radio, Users, Video, X, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

type LaunchKind = 'one_on_one' | 'community_chat' | 'classroom' | 'skilldrop' | 'training' | 'radio';

const LAUNCH_TYPES: Array<{ id: LaunchKind; label: string; icon: React.ReactNode; table: string; deepLink?: string }> = [
  { id: 'one_on_one', label: '1-on-1 Live', icon: <Video className="h-5 w-5" />, table: 'live_rooms' },
  { id: 'community_chat', label: 'Community Chat', icon: <Users className="h-5 w-5" />, table: 'chat_rooms' },
  { id: 'classroom', label: 'Classroom', icon: <BookOpen className="h-5 w-5" />, table: 'classroom_sessions' },
  { id: 'skilldrop', label: 'SkillDrop', icon: <Zap className="h-5 w-5" />, table: 'skilldrop_sessions' },
  { id: 'training', label: 'Training', icon: <Dumbbell className="h-5 w-5" />, table: 'premium_rooms' },
  { id: 'radio', label: 'Radio', icon: <Radio className="h-5 w-5" />, table: '', deepLink: '/radio' },
];

const defaultDateTime = () => new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16);

export default function CommunicationsHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [kind, setKind] = useState<LaunchKind>('one_on_one');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState(defaultDateTime());
  const [isFree, setIsFree] = useState(true);
  const [amount, setAmount] = useState('5');
  const [files, setFiles] = useState<File[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [invitees, setInvitees] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const active = useMemo(() => LAUNCH_TYPES.find(t => t.id === kind)!, [kind]);

  useEffect(() => {
    let cancelled = false;
    supabase.from('profiles' as any).select('id, user_id, display_name, first_name, last_name, avatar_url').limit(36).then(({ data }) => {
      if (!cancelled) setProfiles((data || []).filter((p: any) => p.user_id && p.user_id !== user?.id));
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const uploadFiles = async () => {
    if (!user || files.length === 0) return [];
    const uploaded: any[] = [];
    for (const file of files) {
      const clean = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const path = `${user.id}/launch-${Date.now()}-${clean}`;
      const { error } = await supabase.storage.from('premium-room').upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('premium-room').getPublicUrl(path);
      uploaded.push({ name: file.name, type: file.type, size: file.size, url: data.publicUrl });
    }
    return uploaded;
  };

  const createLaunch = async () => {
    if (!user) return toast.error('Please login first.');
    if (!title.trim()) return toast.error('Name the live session first.');
    setSaving(true);
    try {
      const uploaded = await uploadFiles();
      const price = isFree ? 0 : Number(amount || 0);
      const when = new Date(scheduledAt).toISOString();
      let actionUrl = '/communications-hub';

      if (kind === 'one_on_one') {
        const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now()}`;
        const cap = Math.min(8, 1 + invitees.length || 2);
        const { data, error } = await supabase.from('live_rooms' as any).insert({ name: title.trim(), slug, description, max_participants: cap, created_by: user.id, is_active: true }).select('id').single();
        if (error) throw error;
        const roomId = (data as any).id as string;
        const participantRows = [
          { room_id: roomId, user_id: user.id, role: 'host', display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Host' },
          ...invitees.map(uid => {
            const p = profiles.find(pp => pp.user_id === uid);
            const name = p?.display_name || `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'Guest';
            return { room_id: roomId, user_id: uid, role: 'invited', display_name: name };
          }),
        ];
        const { error: pErr } = await supabase.from('live_room_participants' as any).insert(participantRows as any);
        if (pErr) throw pErr;
        actionUrl = `/live-rooms?room=${roomId}`;

      } else if (kind === 'community_chat') {
        const { data, error } = await supabase.from('chat_rooms' as any).insert({ name: title.trim(), description, room_type: 'group', created_by: user.id, is_active: true, metadata: { scheduled_at: when, files: uploaded, price } }).select('id').single();
        if (error) throw error;
        actionUrl = `/chatapp?room=${(data as any).id}`;
      } else if (kind === 'classroom') {
        const { data, error } = await supabase.from('classroom_sessions' as any).insert({ title: title.trim(), description, scheduled_at: when, instructor_id: user.id, is_free: isFree, session_fee: price, status: 'scheduled' }).select('id').single();
        if (error) throw error;
        actionUrl = `/orchard-alive?classroom=${(data as any).id}`;
      } else if (kind === 'skilldrop') {
        const { data, error } = await supabase.from('skilldrop_sessions' as any).insert({ title: title.trim(), description, scheduled_at: when, presenter_id: user.id, pricing_type: isFree ? 'free' : 'bestowal', session_fee: price, status: 'scheduled' }).select('id').single();
        if (error) throw error;
        actionUrl = `/orchard-alive?skilldrop=${(data as any).id}`;
      } else if (kind === 'radio') {
        setSaving(false);
        navigate('/radio');
        return;
      } else {
        const { data, error } = await supabase.from('premium_rooms' as any).insert({ creator_id: user.id, title: title.trim(), description, room_type: 'training', is_public: true, price, pricing_type: isFree ? 'free' : 'bestowal', documents: uploaded, artwork: uploaded.filter(f => f.type.startsWith('image/')), music: uploaded.filter(f => f.type.startsWith('audio/')) }).select('id').single();
        if (error) throw error;
        actionUrl = `/premium-room/${(data as any).id}`;
      }

      if (invitees.length) {
        await supabase.from('user_notifications' as any).insert(invitees.map(userId => ({ user_id: userId, type: 'live_invite', title: `${active.label} invite`, message: title.trim(), action_url: actionUrl })) as any).then(() => null);
      }
      toast.success(`${active.label} ready to push live.`);
      setTitle(''); setDescription(''); setFiles([]); setInvitees([]);
    } catch (e: any) {
      toast.error(e?.message || 'Could not create the live session.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen text-slate-100 relative" style={{ background: 'linear-gradient(180deg, #0a0f1a 0%, #060a12 100%)' }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(56,189,248,0.18),transparent_55%),radial-gradient(circle_at_85%_30%,rgba(236,72,153,0.16),transparent_55%),radial-gradient(circle_at_50%_90%,rgba(168,85,247,0.18),transparent_55%)] pointer-events-none" />
      <div className="relative mx-auto max-w-7xl px-4 py-5">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-4 gap-2 text-cyan-300 hover:text-cyan-200 hover:bg-cyan-500/10"><ArrowLeft className="h-4 w-4" /> Go Back</Button>
        <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <div className="rounded-2xl border border-cyan-400/25 bg-[#0f172a]/80 backdrop-blur p-4 shadow-[0_0_40px_rgba(34,211,238,0.10)]">
            <div className="mb-4 flex items-center gap-3"><MessageCircle className="h-7 w-7 text-cyan-300" /><h1 className="text-2xl font-black text-white">ChatApp Go-Live</h1></div>
            <div className="grid gap-3">
              {LAUNCH_TYPES.map((t, idx) => {
                const accents = [
                  { ring: 'ring-cyan-400/40', glow: 'shadow-[0_0_25px_rgba(34,211,238,0.35)]', bg: 'from-cyan-500/15 to-cyan-500/5', icon: 'text-cyan-300', border: 'border-cyan-400/30' },
                  { ring: 'ring-emerald-400/40', glow: 'shadow-[0_0_25px_rgba(16,185,129,0.35)]', bg: 'from-emerald-500/15 to-emerald-500/5', icon: 'text-emerald-300', border: 'border-emerald-400/30' },
                  { ring: 'ring-violet-400/40', glow: 'shadow-[0_0_25px_rgba(139,92,246,0.35)]', bg: 'from-violet-500/15 to-violet-500/5', icon: 'text-violet-300', border: 'border-violet-400/30' },
                  { ring: 'ring-amber-400/40', glow: 'shadow-[0_0_25px_rgba(245,158,11,0.35)]', bg: 'from-amber-500/15 to-amber-500/5', icon: 'text-amber-300', border: 'border-amber-400/30' },
                  { ring: 'ring-rose-400/40', glow: 'shadow-[0_0_25px_rgba(244,114,182,0.35)]', bg: 'from-rose-500/15 to-rose-500/5', icon: 'text-rose-300', border: 'border-rose-400/30' },
                  { ring: 'ring-sky-400/40', glow: 'shadow-[0_0_25px_rgba(56,189,248,0.35)]', bg: 'from-sky-500/15 to-sky-500/5', icon: 'text-sky-300', border: 'border-sky-400/30' },
                ];
                const a = accents[idx % accents.length];
                const isActive = kind === t.id;
                return (
                  <motion.button key={t.id} onClick={() => t.deepLink ? navigate(t.deepLink) : setKind(t.id)} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} className={`flex items-center justify-between rounded-xl border ${a.border} bg-gradient-to-br ${a.bg} backdrop-blur px-4 py-3 text-left font-bold text-white transition-all hover:${a.glow} ${isActive ? `ring-2 ${a.ring} ${a.glow}` : ''}`}>
                    <span className="flex items-center gap-3"><span className={a.icon}>{t.icon}</span>{t.label}</span>
                    {isActive && <Check className={`h-5 w-5 ${a.icon}`} />}
                  </motion.button>
                );
              })}
            </div>
          </div>
          <motion.div key={kind} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-fuchsia-400/25 bg-[#0f172a]/80 backdrop-blur p-5 shadow-[0_0_40px_rgba(217,70,239,0.10)]">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-3 text-3xl font-black text-white">{active.icon}{active.label}</h2><span className="rounded-md bg-cyan-500/15 border border-cyan-400/30 px-3 py-1 text-sm font-bold text-cyan-200">ready to push live</span></div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Session title" />
              <div className="relative"><Calendar className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-10" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} /></div>
              <Textarea className="md:col-span-2" value={description} onChange={e => setDescription(e.target.value)} placeholder="What is happening live?" />
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="mb-2 flex gap-2"><Button type="button" variant={isFree ? 'default' : 'outline'} onClick={() => setIsFree(true)}>Free</Button><Button type="button" variant={!isFree ? 'default' : 'outline'} onClick={() => setIsFree(false)}>Bestowal</Button></div>
                {!isFree && <div className="relative"><DollarSign className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-10" value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="USDC amount" /></div>}
              </div>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-center hover:bg-white/10"><FileUp className="mb-2 h-7 w-7 text-cyan-300" /><span className="font-bold text-white">Upload files, images, videos, audio</span><span className="text-xs text-slate-400">{files.length ? `${files.length} file(s) selected` : 'Choose files'}</span><input className="hidden" type="file" multiple onChange={e => setFiles(Array.from(e.target.files || []))} /></label>
            </div>
            <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 text-sm font-black uppercase tracking-wide text-cyan-200/80">Invite tribe members</div>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="flex w-full items-center justify-between rounded-xl border border-cyan-400/30 bg-[#0f172a]/80 backdrop-blur px-4 py-3 text-left font-bold text-white hover:bg-cyan-500/10 transition">
                    <span>{invitees.length ? `${invitees.length} tribe member${invitees.length > 1 ? 's' : ''} invited` : 'Choose tribe members…'}</span>
                    <ChevronDown className="h-4 w-4 text-cyan-300" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[min(560px,90vw)] max-h-[60vh] overflow-y-auto p-2 bg-[#0f172a]/95 border-cyan-400/30">
                  <div className="grid gap-1">
                    {profiles.map(p => {
                      const selected = invitees.includes(p.user_id);
                      const name = p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sower';
                      return (
                        <button key={p.user_id} type="button" onClick={() => setInvitees(v => selected ? v.filter(id => id !== p.user_id) : [...v, p.user_id])} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition ${selected ? 'bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/40' : 'text-slate-200 hover:bg-white/5'}`}>
                            <span>{name}</span>
                            {selected && <Check className="h-4 w-4 text-cyan-300" />}
                          </button>
                      );
                    })}
                    {!profiles.length && <div className="p-3 text-sm text-slate-400">No tribe members found yet.</div>}
                  </div>
                </PopoverContent>
              </Popover>
              {invitees.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {invitees.map(id => {
                    const p = profiles.find(pp => pp.user_id === id);
                    const name = p?.display_name || `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'Sower';
                    return (
                      <span key={id} className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-1 text-xs font-bold text-cyan-100">
                        {name}
                        <button type="button" onClick={() => setInvitees(v => v.filter(x => x !== id))} className="ml-1 hover:text-white"><X className="h-3 w-3" /></button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <Button onClick={createLaunch} disabled={saving} className="mt-5 h-14 w-full gap-2 text-lg font-black bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white shadow-[0_0_30px_rgba(34,211,238,0.35)]">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />} Create & Invite</Button>
          </motion.div>
        </section>
      </div>
    </main>
  );
}