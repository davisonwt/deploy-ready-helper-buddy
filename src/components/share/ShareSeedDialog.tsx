import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Link2, Users, MessagesSquare, Globe2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useReferralCode } from '@/hooks/useReferralCode';
import SignedImg from '@/components/media/SignedImg';

export interface ShareSeedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seedId: string;
  title: string;
  subtitle?: string | null;
  image?: string | null;
  openPath: string;
  /** photo | video | music — used when posting to the tribal feed */
  feedKind?: 'photo' | 'video' | 'music';
}

interface TribeMember {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export default function ShareSeedDialog({
  open, onOpenChange, seedId, title, subtitle, image, openPath, feedKind = 'photo',
}: ShareSeedDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { code: referralCode } = useReferralCode();

  const [members, setMembers] = useState<TribeMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [roomName, setRoomName] = useState('');

  const shareUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' && window.location.origin.includes('localhost')
      ? window.location.origin
      : 'https://sow2growapp.com';
    const url = new URL(openPath, origin);
    if (referralCode) url.searchParams.set('ref', referralCode);
    return url.toString();
  }, [openPath, referralCode]);

  const message = `🌿 "${title}" is alive in my Sow2Grow orchard${subtitle ? ` — ${subtitle}` : ''}.\nStep in: ${shareUrl}`;

  useEffect(() => {
    if (!open || !user?.id) return;
    setRoomName(`🌱 ${title}`.slice(0, 60));
    setLoading(true);
    supabase.rpc('get_my_tribe_members' as any).then(({ data, error }) => {
      if (error) console.warn('[ShareSeedDialog] tribe load failed', error);
      const seen = new Set<string>();
      const list: TribeMember[] = [];
      (data as any[] | null)?.forEach((m) => {
        if (!m?.user_id || m.user_id === user.id || seen.has(m.user_id)) return;
        seen.add(m.user_id);
        list.push({
          user_id: m.user_id,
          display_name: m.display_name || m.username || 'Tribe member',
          username: m.username || null,
          avatar_url: m.avatar_url || null,
        });
      });
      setMembers(list);
      setLoading(false);
    });
  }, [open, user?.id, title]);

  const filtered = members.filter((m) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (m.display_name || '').toLowerCase().includes(q) || (m.username || '').toLowerCase().includes(q);
  });

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);
  const toggle = (id: string) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast({ title: 'Invitation copied', description: 'Your referral code is burned into the link.' });
    } catch {
      toast({ title: 'Could not copy', variant: 'destructive' });
    }
  };

  const nativeShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title, text: message, url: shareUrl });
      else await copyLink();
    } catch { /* dismissed */ }
  };

  const sendToMembers = async () => {
    if (!user?.id || selectedIds.length === 0) return;
    setBusy(true);
    let sent = 0;
    let notifyFailed = 0;
    const sharerName =
      (user.user_metadata as Record<string, string> | undefined)?.display_name
      || user.email?.split('@')[0]
      || 'A tribe member';
    for (const memberId of selectedIds) {
      try {
        const { data: roomId, error } = await supabase.rpc('get_or_create_direct_room', {
          user1_id: user.id,
          user2_id: memberId,
        });
        if (error || !roomId) throw error ?? new Error('no room');
        const { error: msgErr } = await supabase.rpc('send_chat_message', {
          p_room_id: roomId as string,
          p_content: message,
          p_message_type: 'text',
          p_file_url: null,
          p_file_name: null,
          p_file_type: null,
          p_file_size: null,
        } as any);
        if (msgErr) throw msgErr;

        // A chat message alone tells nobody. user_notifications only permits
        // auth.uid() = user_id on INSERT, so a direct insert here is refused
        // with 42501; notify_member() is the SECURITY DEFINER path that
        // writes the same row into the same inbox.
        const { error: noteErr } = await supabase.rpc('notify_member' as any, {
          _recipient: memberId,
          _type: 'seed_share',
          _title: 'A seed was shared with you',
          _message: `${sharerName} shared "${title}" with you.`,
          _action_url: '/chatapp',
        } as any);
        if (noteErr) {
          // The message landed, so this is not a failed share. Say so rather
          // than counting it as a clean success.
          console.warn('[ShareSeedDialog] notification failed for', memberId, noteErr);
          notifyFailed++;
        }

        sent++;
      } catch (e) {
        console.warn('[ShareSeedDialog] invite failed for', memberId, e);
      }
    }
    setBusy(false);
    toast({
      title: sent ? `Seed shared with ${sent} tribe member${sent === 1 ? '' : 's'}` : 'Nothing sent',
      description: sent
        ? (notifyFailed
          ? `It is in their ChatApp inbox. ${notifyFailed} of them could not be notified, so they may not see it until they open ChatApp.`
          : 'They will find it in their ChatApp inbox.')
        : 'Please try again.',
      variant: sent ? undefined : 'destructive',
    });
    if (sent) onOpenChange(false);
  };

  const createRoomAndShare = async () => {
    if (!user?.id) return;
    if (!roomName.trim()) {
      toast({ title: 'Name your chatroom first', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const { data: room, error } = await supabase
        .from('chat_rooms')
        .insert({
          name: roomName.trim(),
          description: `Seed circle for "${title}"`,
          room_type: 'group',
          created_by: user.id,
        } as any)
        .select('id')
        .single();
      if (error || !room) throw error ?? new Error('room failed');

      const participants = [
        { room_id: room.id, user_id: user.id, is_moderator: true },
        ...selectedIds.map((id) => ({ room_id: room.id, user_id: id, is_moderator: false })),
      ];
      const { error: pErr } = await supabase
        .from('chat_participants')
        .upsert(participants as any, { onConflict: 'room_id,user_id' });
      if (pErr) throw pErr;

      await supabase.rpc('send_chat_message', {
        p_room_id: room.id,
        p_content: message,
        p_message_type: 'text',
        p_file_url: null,
        p_file_name: null,
        p_file_type: null,
        p_file_size: null,
      } as any);

      toast({
        title: 'Chatroom opened',
        description: `${selectedIds.length} tribe member${selectedIds.length === 1 ? '' : 's'} added and the seed is shared inside.`,
      });
      onOpenChange(false);
      navigate('/chatapp');
    } catch (e: any) {
      console.error('[ShareSeedDialog] room create failed', e);
      toast({ title: 'Could not open the chatroom', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const shareToFeed = async () => {
    if (!user?.id) return;
    setBusy(true);
    try {
      const { error } = await supabase.from('memry_posts').insert({
        user_id: user.id,
        content_type: feedKind,
        content_category: 'seed_share',
        media_url: image || shareUrl,
        thumbnail_url: image || null,
        caption: message,
      } as any);
      if (error) throw error;
      toast({ title: 'Shared to the tribal feed', description: 'Every tribe member can see this seed now.' });
      onOpenChange(false);
    } catch (e: any) {
      console.error('[ShareSeedDialog] feed share failed', e);
      toast({ title: 'Could not share to the feed', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  // min-h-0 is load-bearing on every flex child in this chain. Without it a
  // flex item refuses to shrink below its content height, the dialog grows
  // past the viewport, and the action button is pushed out of reach with
  // nothing scrollable to get it back.
  const MemberList = (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <Input
        placeholder="Search your tribe…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="shrink-0"
      />
      {/*
        A plain overflow container, NOT Radix ScrollArea. ScrollArea's inner
        viewport is `h-full`, i.e. height:100%, and a percentage height only
        resolves against a parent with a definite height. Here the parent is
        a flex item sized by `flex-1`, whose computed height stays `auto`, so
        the viewport grew to its content (measured live: root bounded at
        284px, viewport 2057px) and 36 of 42 member rows rendered underneath
        the footer button with nothing scrollable. `min-h-0 + flex-1 +
        overflow-y-auto` needs no percentage to resolve and cannot fail that
        way.
      */}
      <div className="min-h-[7rem] flex-1 overflow-y-auto overscroll-contain rounded-md border border-border">
        {loading ? (
          <div className="flex h-full items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading your tribe…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No tribe members yet — invite people from My Tribe first.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((m) => (
              <li key={m.user_id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/50">
                  <Checkbox checked={!!selected[m.user_id]} onCheckedChange={() => toggle(m.user_id)} />
                  {m.avatar_url ? (
                    <SignedImg src={m.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {(m.display_name || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm">{m.display_name}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="shrink-0 text-xs text-muted-foreground">{selectedIds.length} selected</p>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/*
        Height-constrained on purpose. DialogContent carries no max-height of
        its own, so the dialog previously rendered at its natural height (586px
        on the Circle tab) and simply clipped on any shorter viewport, with the
        action button unreachable and nothing scrollable. 85dvh rather than vh
        so mobile browser chrome is accounted for.
      */}
      <DialogContent className="flex max-h-[85dvh] w-[calc(100vw-2rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <DialogHeader className="shrink-0 border-b px-6 pb-4 pt-6">
          <DialogTitle className="truncate">Share “{title}”</DialogTitle>
          <DialogDescription>Invite your tribe to this seed, open a circle around it, or send it to the feed.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="tribe" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-6 mt-4 flex w-auto shrink-0 justify-start overflow-x-auto">
            <TabsTrigger value="tribe"><Users className="mr-1 h-4 w-4" />Tribe</TabsTrigger>
            <TabsTrigger value="room"><MessagesSquare className="mr-1 h-4 w-4" />Circle</TabsTrigger>
            <TabsTrigger value="feed"><Globe2 className="mr-1 h-4 w-4" />Feed</TabsTrigger>
            <TabsTrigger value="link"><Link2 className="mr-1 h-4 w-4" />Link</TabsTrigger>
          </TabsList>

          <TabsContent value="tribe" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
            <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 py-3">
              {MemberList}
            </div>
            <div className="shrink-0 border-t bg-background px-6 py-4">
              <Button className="w-full" disabled={busy || selectedIds.length === 0} onClick={sendToMembers}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Invite {selectedIds.length || ''} to this seed
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="room" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
            <div className="flex min-h-0 flex-1 flex-col gap-3 px-6 py-3">
              <Input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Chatroom name"
                className="shrink-0"
              />
              {MemberList}
            </div>
            <div className="shrink-0 border-t bg-background px-6 py-4">
              <Button className="w-full" disabled={busy} onClick={createRoomAndShare}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Open chatroom & share this seed
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="feed" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
              <p className="text-sm text-muted-foreground">
                Post this seed to the tribal social feed so the whole tribe can see it.
              </p>
            </div>
            <div className="shrink-0 border-t bg-background px-6 py-4">
              <Button className="w-full" disabled={busy} onClick={shareToFeed}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Share to the tribal feed
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="link" className="mt-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
              <div className="break-all rounded-md border border-border bg-muted/40 p-3 text-xs">{shareUrl}</div>
            </div>
            <div className="shrink-0 border-t bg-background px-6 py-4">
              <div className="flex gap-2">
                <Button className="flex-1" variant="secondary" onClick={copyLink}>Copy invitation</Button>
                <Button className="flex-1" onClick={nativeShare}>Share…</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
