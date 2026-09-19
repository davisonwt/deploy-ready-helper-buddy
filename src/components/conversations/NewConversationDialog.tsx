/**
 * One "New chat" button: pick who, start talking.
 *
 * No choice between a direct chat and a group chat -- picking one person or
 * seven is the same gesture, and the row it writes is the same row either
 * way. The old surfaces are untouched; this writes to the same chat_rooms
 * and chat_participants they already use.
 */
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Check, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

/** Seven other people plus you. Past that it stops being a conversation. */
export const MAX_OTHER_PEOPLE = 7;

interface Person {
  userId: string;
  name: string;
  avatarUrl: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  onCreated: (roomId: string) => void;
}

export function NewConversationDialog({ open, onClose, currentUserId, onCreated }: Props) {
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [selected, setSelected] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelected([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('profiles_public')
        .select('user_id, display_name, first_name, last_name, avatar_url')
        .neq('user_id', currentUserId)
        .limit(100);
      if (!alive) return;
      if (error) {
        console.error('[conversations] people lookup failed', error);
        toast.error('Could not load people to chat with. Please try again.');
        setLoading(false);
        return;
      }
      setPeople(
        (data ?? []).map((p) => {
          const row = p as Record<string, unknown>;
          const display = ((row.display_name as string | null) ?? '').trim();
          const full = `${((row.first_name as string | null) ?? '').trim()} ${((row.last_name as string | null) ?? '').trim()}`.trim();
          return {
            userId: row.user_id as string,
            name: display || full || 'Someone',
            avatarUrl: (row.avatar_url as string | null) ?? null,
          };
        }),
      );
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [open, currentUserId]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => p.name.toLowerCase().includes(q));
  }, [people, query]);

  const isSelected = (id: string) => selected.some((s) => s.userId === id);

  const toggle = (person: Person) => {
    setSelected((prev) => {
      if (prev.some((p) => p.userId === person.userId)) {
        return prev.filter((p) => p.userId !== person.userId);
      }
      if (prev.length >= MAX_OTHER_PEOPLE) {
        toast.error(`A conversation holds up to ${MAX_OTHER_PEOPLE} other people. Remove someone to add another.`);
        return prev;
      }
      return [...prev, person];
    });
  };

  const start = async () => {
    if (selected.length === 0) return;
    setCreating(true);
    try {
      // The name is for the list, not a label a member has to invent --
      // their own people, in their own words.
      const name = selected.map((p) => p.name).join(', ');

      const { data: room, error: roomErr } = await supabase
        .from('chat_rooms')
        .insert({
          name,
          room_type: 'group',
          created_by: currentUserId,
          is_active: true,
        } as never)
        .select('id')
        .single();
      if (roomErr) throw roomErr;

      const roomId = (room as { id: string }).id;

      // A trigger on chat_rooms already adds the creator, and
      // chat_participants is unique on (room_id, user_id) -- inserting the
      // creator again fails with 23505 and loses the whole batch. Upsert and
      // ignore the duplicate, so this is correct whether the trigger ran or
      // not rather than depending on it.
      const rows = [
        { room_id: roomId, user_id: currentUserId, is_active: true, is_moderator: true },
        ...selected.map((p) => ({ room_id: roomId, user_id: p.userId, is_active: true, is_moderator: false })),
      ];
      const { error: partErr } = await supabase
        .from('chat_participants')
        .upsert(rows as never, { onConflict: 'room_id,user_id', ignoreDuplicates: true });
      if (partErr) throw partErr;

      onCreated(roomId);
      onClose();
    } catch (err) {
      console.error('[conversations] create failed', err);
      toast.error(
        err instanceof Error
          ? `Could not start the conversation: ${err.message}`
          : 'Could not start the conversation. Please try again.',
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !creating && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New chat</DialogTitle>
          <DialogDescription>
            Pick who you want to talk to. One person or up to {MAX_OTHER_PEOPLE}.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people"
            className="pl-9"
            disabled={creating}
          />
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((p) => (
              <button
                key={p.userId}
                type="button"
                onClick={() => toggle(p)}
                className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20"
              >
                {p.name} ×
              </button>
            ))}
          </div>
        )}

        <div className="max-h-[45vh] overflow-y-auto -mx-2 px-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : visible.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {query.trim() ? `Nobody matches "${query.trim()}".` : 'There is nobody to chat with yet.'}
            </p>
          ) : (
            <ul className="space-y-1">
              {visible.map((p) => (
                <li key={p.userId}>
                  <button
                    type="button"
                    onClick={() => toggle(p)}
                    disabled={creating}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted/60 disabled:opacity-50"
                  >
                    <Avatar className="h-9 w-9">
                      {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt="" />}
                      <AvatarFallback>{p.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate text-sm">{p.name}</span>
                    {isSelected(p.userId) && <Check className="h-4 w-4 text-primary" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Button className="w-full gap-2" disabled={selected.length === 0 || creating} onClick={start}>
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
          {selected.length === 0
            ? 'Pick someone'
            : `Start talking with ${selected.length === 1 ? selected[0].name : `${selected.length} people`}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
