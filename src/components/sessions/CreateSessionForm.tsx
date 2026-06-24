import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Camera, Check, ChevronDown, DollarSign, FileUp, Loader2, Shield, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

type Kind = 'classroom' | 'skilldrop';
type AttendanceMode = 'relaxed' | 'standard' | 'strict';

const defaultDateTime = () => new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 16);

const MODE_OPTIONS: { value: AttendanceMode; label: string; desc: string }[] = [
  { value: 'relaxed', label: 'Relaxed', desc: 'Heartbeat only. Marks "Away" silently — no prompts.' },
  { value: 'standard', label: 'Standard', desc: 'Heartbeat + random "Tap I\'m here" check-ins.' },
  { value: 'strict', label: 'Strict', desc: 'Camera required + heartbeat + check-ins. Auto-removed if camera off.' },
];

/**
 * Shared create-session form for Classroom & SkillDrop.
 * Ports the exact creation logic that previously lived in CommunicationsHub
 * (chat_room + participants seeding + session row insert), then navigates
 * to the session detail page on success.
 */
export default function CreateSessionForm({ kind, onCreated }: { kind: Kind; onCreated?: () => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState(defaultDateTime());
  const [isFree, setIsFree] = useState(true);
  const [amount, setAmount] = useState('5');
  const [attendanceMode, setAttendanceMode] = useState<AttendanceMode>('standard');
  const [requireCamera, setRequireCamera] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [invitees, setInvitees] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('public_profiles' as any)
      .select('user_id, display_name, username, avatar_url')
      .order('display_name', { ascending: true, nullsFirst: false })
      .limit(500)
      .then(({ data }) => {
        if (!cancelled) setProfiles(
          (data || [])
            .filter((p: any) => p.user_id && p.user_id !== user?.id)
            .map((p: any) => ({
              user_id: p.user_id,
              display_name: p.display_name || p.username || 'Sower',
              avatar_url: p.avatar_url,
            }))
        );
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

  const create = async () => {
    if (!user) return toast.error('Please login first.');
    if (!title.trim()) return toast.error('Name the session first.');
    setSaving(true);
    try {
      const uploaded = await uploadFiles();
      const price = isFree ? 0 : Number(amount || 0);
      const when = new Date(scheduledAt).toISOString();

      // 1. Linked private chat room.
      const roomName = `${kind === 'classroom' ? 'Classroom' : 'SkillDrop'}: ${title.trim()}`;
      const { data: roomData, error: roomErr } = await supabase
        .from('chat_rooms' as any)
        .insert({
          name: roomName,
          description,
          room_type: 'group',
          created_by: user.id,
          is_active: true,
          metadata: { session_kind: kind, scheduled_at: when, files: uploaded, price },
        })
        .select('id')
        .single();
      if (roomErr) throw roomErr;
      const chatRoomId = (roomData as any).id as string;

      // 2. Seed creator + invitees as participants (creator is moderator).
      const participantRows = Array.from(new Set([user.id, ...invitees])).map(uid => ({
        room_id: chatRoomId,
        user_id: uid,
        is_moderator: uid === user.id,
        is_active: true,
      }));
      const { error: cpErr } = await supabase
        .from('chat_participants' as any)
        .upsert(participantRows as any, { onConflict: 'room_id,user_id', ignoreDuplicates: false });
      if (cpErr) throw cpErr;

      // 3. Session row.
      let actionUrl = '';
      let createdSessionId: string | null = null;
      if (kind === 'classroom') {
        const { data, error } = await supabase
          .from('classroom_sessions' as any)
          .insert({
            title: title.trim(),
            description,
            scheduled_at: when,
            instructor_id: user.id,
            is_free: isFree,
            session_fee: price,
            status: 'scheduled',
            chat_room_id: chatRoomId,
            attendance_mode: attendanceMode,
            require_camera: requireCamera || attendanceMode === 'strict',
          })
          .select('id')
          .single();
        if (error) throw error;
        createdSessionId = (data as any).id as string;
        actionUrl = `/classroom/${createdSessionId}`;
      } else {
        const { data, error } = await supabase
          .from('skilldrop_sessions' as any)
          .insert({ title: title.trim(), description, scheduled_at: when, presenter_id: user.id, pricing_type: isFree ? 'free' : 'bestowal', session_fee: price, status: 'scheduled', chat_room_id: chatRoomId })
          .select('id')
          .single();
        if (error) throw error;
        actionUrl = `/skilldrop/${(data as any).id}`;
      }

      // 4. Seed classroom_invites + user_notifications for invited tribe members
      if (invitees.length) {
        if (kind === 'classroom' && createdSessionId) {
          await supabase
            .from('classroom_invites' as any)
            .upsert(
              invitees.map((uid) => ({
                session_id: createdSessionId,
                inviter_id: user.id,
                invitee_id: uid,
                message: description || null,
              })) as any,
              { onConflict: 'session_id,invitee_id', ignoreDuplicates: true },
            );
        }
        await supabase
          .from('user_notifications' as any)
          .insert(invitees.map(userId => ({
            user_id: userId,
            type: kind === 'classroom' ? 'classroom_invite' : 'live_invite',
            title: `${kind === 'classroom' ? 'Classroom' : 'SkillDrop'} invite`,
            message: title.trim(),
            action_url: actionUrl,
          })) as any)
          .then(() => null);
      }

      toast.success(`${kind === 'classroom' ? 'Classroom' : 'SkillDrop'} session created.`);
      onCreated?.();
      navigate(actionUrl);
    } catch (e: any) {
      toast.error(e?.message || 'Could not create the session.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="grid gap-4 md:grid-cols-2">
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Session title" />
        <div className="relative">
          <Calendar className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-10" type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
        </div>
        <Textarea className="md:col-span-2" value={description} onChange={e => setDescription(e.target.value)} placeholder="What is happening live?" />
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="mb-2 flex gap-2">
            <Button type="button" variant={isFree ? 'default' : 'outline'} onClick={() => setIsFree(true)}>Free</Button>
            <Button type="button" variant={!isFree ? 'default' : 'outline'} onClick={() => setIsFree(false)}>Bestowal</Button>
          </div>
          {!isFree && (
            <div className="relative">
              <DollarSign className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-10" value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="USDC amount" />
            </div>
          )}
        </div>
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-center hover:bg-white/10">
          <FileUp className="mb-2 h-7 w-7 text-cyan-300" />
          <span className="font-bold text-white">Upload files, images, videos, audio</span>
          <span className="text-xs text-slate-400">{files.length ? `${files.length} file(s) selected` : 'Choose files'}</span>
          <input className="hidden" type="file" multiple onChange={e => setFiles(Array.from(e.target.files || []))} />
        </label>
      </div>

      {kind === 'classroom' && (
        <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="mb-2 text-sm font-black uppercase tracking-wide text-cyan-200/80 flex items-center gap-2">
            <Shield className="h-4 w-4 text-cyan-300" /> Attendance policy
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {MODE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setAttendanceMode(opt.value); if (opt.value === 'strict') setRequireCamera(true); }}
                className={`rounded-lg border p-2.5 text-left transition ${
                  attendanceMode === opt.value
                    ? 'border-cyan-400/70 bg-cyan-500/15 text-white'
                    : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                }`}
              >
                <div className="font-bold uppercase tracking-wider text-xs">{opt.label}</div>
                <div className="mt-1 text-[11px] opacity-80">{opt.desc}</div>
              </button>
            ))}
          </div>
          {attendanceMode !== 'strict' && (
            <label className="mt-3 flex items-center gap-2 cursor-pointer text-sm text-slate-200">
              <input
                type="checkbox"
                checked={requireCamera}
                onChange={(e) => setRequireCamera(e.target.checked)}
                className="h-4 w-4 accent-cyan-400"
              />
              <Camera className="h-4 w-4 text-cyan-300" /> Require attendees to keep cameras on
            </label>
          )}
        </div>
      )}

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
                  <button
                    key={p.user_id}
                    type="button"
                    onClick={() => setInvitees(v => selected ? v.filter(id => id !== p.user_id) : [...v, p.user_id])}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition ${selected ? 'bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/40' : 'text-slate-200 hover:bg-white/5'}`}
                  >
                    <span>{name}</span>
                    {selected && <Check className="h-4 w-4 text-cyan-300" />}
                  </button>
                );
              })}
              {!profiles.length && <div className="p-3 text-sm text-slate-400">No tribe members found yet.</div>}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Button onClick={create} disabled={saving} className="mt-5 h-14 w-full gap-2 text-lg font-black bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white shadow-[0_0_30px_rgba(34,211,238,0.35)]">
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />} Create & Invite
      </Button>
    </div>
  );
}
