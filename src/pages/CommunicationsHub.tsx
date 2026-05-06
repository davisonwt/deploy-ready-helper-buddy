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

const LAUNCH_TYPES: Array<{ id: LaunchKind; label: string; icon: React.ReactNode; table: string }> = [
  { id: 'one_on_one', label: '1-on-1 Live', icon: <Video className="h-5 w-5" />, table: 'live_rooms' },
  { id: 'community_chat', label: 'Community Chat', icon: <Users className="h-5 w-5" />, table: 'chat_rooms' },
  { id: 'classroom', label: 'Classroom', icon: <BookOpen className="h-5 w-5" />, table: 'classroom_sessions' },
  { id: 'skilldrop', label: 'SkillDrop', icon: <Zap className="h-5 w-5" />, table: 'skilldrop_sessions' },
  { id: 'training', label: 'Training', icon: <Dumbbell className="h-5 w-5" />, table: 'premium_rooms' },
  { id: 'radio', label: 'Radio', icon: <Radio className="h-5 w-5" />, table: 'radio_broadcasts' },
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
        const { data, error } = await supabase.from('live_rooms' as any).insert({ name: title.trim(), slug, description, max_participants: 2, created_by: user.id, is_active: true }).select('id').single();
        if (error) throw error;
        actionUrl = `/live-rooms?room=${(data as any).id}`;
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
        const { data, error } = await supabase.from('radio_broadcasts' as any).insert({ title: title.trim(), description, scheduled_at: when, broadcaster_id: user.id, status: 'scheduled', thumbnail_url: uploaded.find(f => f.type.startsWith('image/'))?.url || null }).select('id').single();
        if (error) throw error;
        actionUrl = `/grove-station?radio=${(data as any).id}`;
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
          <div className="rounded-lg border border-cyan-400/30 bg-gradient-to-br from-slate-900/90 via-indigo-950/70 to-slate-900/90 backdrop-blur p-4 shadow-[0_0_50px_rgba(56,189,248,0.18)]">
            <div className="mb-4 flex items-center gap-3"><MessageCircle className="h-7 w-7 text-primary" /><h1 className="text-2xl font-black">ChatApp Go-Live</h1></div>
            <div className="grid gap-2">
              {LAUNCH_TYPES.map(t => <button key={t.id} onClick={() => setKind(t.id)} className={`flex items-center justify-between rounded-md border px-4 py-3 text-left font-bold transition ${kind === t.id ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-secondary hover:bg-accent'}`}><span className="flex items-center gap-3">{t.icon}{t.label}</span>{kind === t.id && <Check className="h-4 w-4" />}</button>)}
            </div>
          </div>
          <motion.div key={kind} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-fuchsia-400/30 bg-gradient-to-br from-slate-900/90 via-violet-950/70 to-slate-900/90 backdrop-blur p-5 shadow-[0_0_50px_rgba(217,70,239,0.18)]">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-3 text-3xl font-black">{active.icon}{active.label}</h2><span className="rounded-md bg-primary/15 px-3 py-1 text-sm font-bold text-primary">ready to push live</span></div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Session title" />
              <div className="relative"><Calendar className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-10" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} /></div>
              <Textarea className="md:col-span-2" value={description} onChange={e => setDescription(e.target.value)} placeholder="What is happening live?" />
              <div className="rounded-md border border-border bg-background/50 p-3">
                <div className="mb-2 flex gap-2"><Button type="button" variant={isFree ? 'default' : 'outline'} onClick={() => setIsFree(true)}>Free</Button><Button type="button" variant={!isFree ? 'default' : 'outline'} onClick={() => setIsFree(false)}>Bestowal</Button></div>
                {!isFree && <div className="relative"><DollarSign className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-10" value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="USDC amount" /></div>}
              </div>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-background/50 p-4 text-center hover:bg-accent/20"><FileUp className="mb-2 h-7 w-7 text-primary" /><span className="font-bold">Upload files, images, videos, audio</span><span className="text-xs text-muted-foreground">{files.length ? `${files.length} file(s) selected` : 'Choose files'}</span><input className="hidden" type="file" multiple onChange={e => setFiles(Array.from(e.target.files || []))} /></label>
            </div>
            <div className="mt-5 rounded-md border border-border bg-background/50 p-3"><div className="mb-3 text-sm font-black uppercase tracking-wide text-muted-foreground">Invite tribe members</div><div className="flex flex-wrap gap-2">{profiles.map(p => { const selected = invitees.includes(p.user_id); return <button key={p.user_id} onClick={() => setInvitees(v => selected ? v.filter(id => id !== p.user_id) : [...v, p.user_id])} className={`rounded-md border px-3 py-2 text-sm font-bold ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-secondary'}`}>{p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sower'}</button>; })}</div></div>
            <Button onClick={createLaunch} disabled={saving} className="mt-5 h-14 w-full gap-2 text-lg font-black">{saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />} Create & Invite</Button>
          </motion.div>
        </section>
      </div>
    </main>
  );
}