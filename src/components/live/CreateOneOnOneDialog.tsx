import { useEffect, useState } from 'react';
import { Check, ChevronDown, Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (roomId: string) => void;
}

/**
 * Create a 1-on-1 Live room — ported verbatim from CommunicationsHub's
 * one_on_one branch (live_rooms insert + live_room_participants seeding).
 */
export default function CreateOneOnOneDialog({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [invitees, setInvitees] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    supabase
      .from('public_profiles' as any)
      .select('user_id, display_name, username, avatar_url')
      .order('display_name', { ascending: true, nullsFirst: false })
      .limit(500)
      .then(({ data }) => {
        if (!cancelled) {
          setProfiles(
            (data || [])
              .filter((p: any) => p.user_id && p.user_id !== user?.id)
              .map((p: any) => ({
                user_id: p.user_id,
                display_name: p.display_name || p.username || 'Sower',
                avatar_url: p.avatar_url,
              }))
          );
        }
      });
    return () => { cancelled = true; };
  }, [open, user?.id]);

  const create = async () => {
    if (!user) return toast.error('Please login first.');
    if (invitees.length === 0) return toast.error('Pick a tribe member to invite.');
    setSaving(true);
    try {
      const displayTitle = name.trim() || 'Private 1-on-1';
      const slug = `${displayTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now()}`;
      const cap = Math.min(8, 1 + invitees.length || 2);
      const { data, error } = await supabase
        .from('live_rooms' as any)
        .insert({ name: displayTitle, slug, description: '', max_participants: cap, created_by: user.id, is_active: true })
        .select('id')
        .single();
      if (error) throw error;
      const roomId = (data as any).id as string;

      const participantRows = [
        { room_id: roomId, user_id: user.id, role: 'host', display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'Host' },
        ...invitees.map(uid => {
          const p = profiles.find(pp => pp.user_id === uid);
          const memberName = p?.display_name || 'Guest';
          return { room_id: roomId, user_id: uid, role: 'invited', display_name: memberName };
        }),
      ];
      const { error: pErr } = await supabase.from('live_room_participants' as any).insert(participantRows as any);
      if (pErr) throw pErr;

      // Notify invitees (best-effort).
      await supabase
        .from('user_notifications' as any)
        .insert(invitees.map(userId => ({
          user_id: userId,
          type: 'live_invite',
          title: '1-on-1 Live invite',
          message: displayTitle,
          action_url: `/live-rooms?room=${roomId}`,
        })) as any)
        .then(() => null);

      toast.success('Room ready.');
      setName('');
      setInvitees([]);
      onCreated(roomId);
    } catch (e: any) {
      toast.error(e?.message || 'Could not create the room.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#123330] border-[#1FB6A8]/25 text-[#EAF4F2]">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
            New 1-on-1 room
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-[#7E9498] mb-1.5">Room name (optional)</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Private 1-on-1"
              className="bg-[#0B1420] border-[#1FB6A8]/20 text-[#EAF4F2] placeholder:text-[#7E9498]/60"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-[#7E9498] mb-1.5">Invite a tribe member</label>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-md border border-[#1FB6A8]/25 bg-[#0B1420] px-3 py-2.5 text-left text-sm font-medium hover:border-[#1FB6A8]/50 transition"
                >
                  <span>
                    {invitees.length
                      ? `${invitees.length} tribe member${invitees.length > 1 ? 's' : ''} invited`
                      : 'Choose…'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-[#1FB6A8]" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[min(420px,90vw)] max-h-[50vh] overflow-y-auto p-2 bg-[#0B1420] border-[#1FB6A8]/25">
                <div className="grid gap-1">
                  {profiles.map(p => {
                    const selected = invitees.includes(p.user_id);
                    const memberName = p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sower';
                    return (
                      <button
                        key={p.user_id}
                        type="button"
                        onClick={() => setInvitees(v => selected ? v.filter(id => id !== p.user_id) : [...v, p.user_id])}
                        className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition ${selected ? 'bg-[#1FB6A8]/20 text-[#EAF4F2] ring-1 ring-[#1FB6A8]/40' : 'text-[#EAF4F2]/85 hover:bg-white/5'}`}
                      >
                        <span>{memberName}</span>
                        {selected && <Check className="h-4 w-4 text-[#1FB6A8]" />}
                      </button>
                    );
                  })}
                  {!profiles.length && <div className="p-3 text-sm text-[#7E9498]">No tribe members found yet.</div>}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <Button
            onClick={create}
            disabled={saving}
            className="w-full h-12 bg-[#1FB6A8] text-[#0B1420] hover:bg-[#1FB6A8]/90 font-semibold gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create room
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
