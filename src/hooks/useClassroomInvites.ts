import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ClassroomInvite {
  id: string;
  session_id: string;
  inviter_id: string;
  invitee_id: string;
  status: 'invited' | 'accepted' | 'declined';
  message: string | null;
  invited_at: string;
  responded_at: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}

interface Args {
  sessionId: string;
  isHost: boolean;
}

export function useClassroomInvites({ sessionId, isHost }: Args) {
  const { toast } = useToast();
  const [invites, setInvites] = useState<ClassroomInvite[]>([]);

  const hydrate = useCallback(async () => {
    const { data } = await supabase
      .from('classroom_invites')
      .select('*')
      .eq('session_id', sessionId);
    const rows = (data || []) as any[];
    const ids = Array.from(new Set(rows.map((r) => r.invitee_id)));
    let profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
    if (ids.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name, avatar_url')
        .in('user_id', ids);
      (profs || []).forEach((p: any) => {
        profileMap.set(p.user_id, {
          display_name: p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Sower',
          avatar_url: p.avatar_url,
        });
      });
    }
    setInvites(rows.map((r) => ({ ...r, ...(profileMap.get(r.invitee_id) ?? {}) })));
  }, [sessionId]);

  useEffect(() => { if (sessionId) void hydrate(); }, [sessionId, hydrate]);

  useEffect(() => {
    if (!sessionId) return;
    const ch = supabase
      .channel(`classroom-invites-${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classroom_invites', filter: `session_id=eq.${sessionId}` },
        () => { void hydrate(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sessionId, hydrate]);

  const sendInvites = useCallback(async (inviterId: string, inviteeIds: string[], message?: string) => {
    if (!isHost || !inviteeIds.length) return;
    const rows = inviteeIds.map((uid) => ({
      session_id: sessionId,
      inviter_id: inviterId,
      invitee_id: uid,
      message: message ?? null,
    }));
    const { error } = await supabase
      .from('classroom_invites')
      .upsert(rows as any, { onConflict: 'session_id,invitee_id', ignoreDuplicates: true });
    if (error) {
      toast({ title: 'Could not send invites', description: error.message, variant: 'destructive' });
      return;
    }
    // Also drop notifications so they see it in their inbox
    await supabase.from('user_notifications').insert(inviteeIds.map((uid) => ({
      user_id: uid,
      type: 'classroom_invite',
      title: 'Classroom invitation',
      message: message ?? 'You have been invited to a live classroom session.',
      action_url: `/classroom/${sessionId}`,
    })) as any);
    toast({ title: `Sent ${inviteeIds.length} invite${inviteeIds.length > 1 ? 's' : ''}` });
  }, [isHost, sessionId, toast]);

  const respondToInvite = useCallback(async (inviteId: string, status: 'accepted' | 'declined') => {
    const { error } = await supabase
      .from('classroom_invites')
      .update({ status, responded_at: new Date().toISOString() } as any)
      .eq('id', inviteId);
    if (error) toast({ title: 'Could not update RSVP', description: error.message, variant: 'destructive' });
  }, [toast]);

  return { invites, sendInvites, respondToInvite, refresh: hydrate };
}
