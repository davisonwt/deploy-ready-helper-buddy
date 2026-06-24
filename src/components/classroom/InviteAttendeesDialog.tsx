import { useMemo, useState } from 'react';
import { Check, ChevronDown, Loader2, Send, X } from 'lucide-react';
import { useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  trigger: React.ReactNode;
  onSend: (inviteeIds: string[], message: string) => Promise<void> | void;
  excludeUserIds?: string[];
}

interface ProfileRow {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export function InviteAttendeesDialog({ trigger, onSend, excludeUserIds = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const { data } = await supabase
        .from('public_profiles' as any)
        .select('user_id, display_name, username, avatar_url')
        .order('display_name', { ascending: true, nullsFirst: false })
        .limit(500);
      const rows = (data || []).map((p: any) => ({
        user_id: p.user_id,
        display_name: p.display_name || p.username || 'Sower',
        avatar_url: p.avatar_url ?? null,
      })) as ProfileRow[];
      setProfiles(rows.filter((p) => p.user_id && !excludeUserIds.includes(p.user_id)));
    })();
  }, [open, excludeUserIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => p.display_name.toLowerCase().includes(q));
  }, [profiles, search]);

  const submit = async () => {
    if (!selected.length) return;
    setSending(true);
    try {
      await onSend(selected, message.trim());
      setSelected([]);
      setMessage('');
      setOpen(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg bg-[#1a1430] border-[#8B5CF6]/40 text-[#E8D9B5]">
        <DialogHeader>
          <DialogTitle className="font-spectral text-2xl">Invite tribe members</DialogTitle>
          <DialogDescription className="text-[#E8D9B5]/70">
            They'll get the invite in their ChatApp inbox. One click takes them to the room when the session opens.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tribe members…"
            className="bg-[#14101F] border-[#8B5CF6]/30 text-[#E8D9B5]"
          />

          <div className="max-h-[260px] overflow-y-auto rounded-lg border border-[#8B5CF6]/25 bg-[#14101F]">
            {filtered.length === 0 ? (
              <p className="p-3 text-sm text-[#E8D9B5]/40">No tribe members found.</p>
            ) : (
              <ul>
                {filtered.map((p) => {
                  const sel = selected.includes(p.user_id);
                  return (
                    <li key={p.user_id}>
                      <button
                        onClick={() => setSelected((v) => sel ? v.filter((id) => id !== p.user_id) : [...v, p.user_id])}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition ${sel ? 'bg-[#8B5CF6]/20' : 'hover:bg-[#8B5CF6]/10'}`}
                      >
                        <div className="h-7 w-7 rounded-full bg-[#8B5CF6]/30 flex items-center justify-center text-[11px] font-bold overflow-hidden shrink-0">
                          {p.avatar_url ? <img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : p.display_name[0]}
                        </div>
                        <span className="flex-1 text-left text-[#E8D9B5] truncate">{p.display_name}</span>
                        {sel && <Check className="h-4 w-4 text-[#8B5CF6]" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Optional note for the invitation"
            className="bg-[#14101F] border-[#8B5CF6]/30 text-[#E8D9B5] min-h-[60px]"
            maxLength={300}
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-[#E8D9B5]/60">{selected.length} selected</span>
            <Button
              onClick={submit}
              disabled={sending || selected.length === 0}
              className="bg-gradient-to-r from-[#8B5CF6] to-[#F0B23F] text-white font-bold"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send invites
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
