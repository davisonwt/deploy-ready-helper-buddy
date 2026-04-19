import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CouncilSeat {
  id: string;
  user_id: string;
  seat_type: 'auto' | 'curated';
  seated_at: string;
  term_ends_at: string | null;
  is_active: boolean;
  notes: string | null;
}

export interface CouncilSeatWithProfile extends CouncilSeat {
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
    user_id: string;
  } | null;
}

export function useElderCouncil() {
  const { user } = useAuth();
  const [seats, setSeats] = useState<CouncilSeatWithProfile[]>([]);
  const [mySeat, setMySeat] = useState<CouncilSeat | null>(null);
  const [pendingTemplates, setPendingTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: seatData } = await supabase
      .from('elder_council_seats')
      .select('*')
      .eq('is_active', true)
      .order('seated_at', { ascending: true });

    const userIds = (seatData || []).map(s => s.user_id);
    let profilesMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles_public')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);
      (profs || []).forEach((p: any) => { profilesMap[p.user_id] = p; });
    }

    const enriched: CouncilSeatWithProfile[] = (seatData || []).map((s: any) => ({
      ...s,
      profile: profilesMap[s.user_id] || null,
    }));
    setSeats(enriched);

    const mine = enriched.find(s => s.user_id === user?.id) || null;
    setMySeat(mine);

    if (mine) {
      const { data: pending } = await supabase
        .from('agent_templates')
        .select('*')
        .eq('status', 'pending_review')
        .order('created_at', { ascending: true });
      setPendingTemplates(pending || []);
    } else {
      setPendingTemplates([]);
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const reviewTemplate = async (templateId: string, decision: 'approve' | 'reject', notes?: string) => {
    if (!mySeat || !user?.id) return { error: 'Not a council member' };
    const newStatus = decision === 'approve' ? 'approved' : 'rejected';

    const { error: tplError } = await supabase
      .from('agent_templates')
      .update({ status: newStatus })
      .eq('id', templateId);
    if (tplError) return { error: tplError };

    await supabase.from('agent_template_reviews').insert({
      template_id: templateId,
      reviewer_id: user.id,
      decision,
      notes: notes || null,
    });

    await supabase.from('council_decisions').insert({
      seat_id: mySeat.id,
      user_id: user.id,
      decision_type: 'template_review',
      entity_id: templateId,
      entity_type: 'agent_template',
      vote: decision === 'approve' ? 'approve' : 'reject',
      notes: notes || null,
    });

    await refresh();
    return { error: null };
  };

  const blessOrchard = async (orchardId: string, message?: string) => {
    if (!mySeat || !user?.id) return { error: 'Not a council member' };
    const { error } = await supabase.from('orchard_blessings').insert({
      orchard_id: orchardId,
      granted_by_seat_id: mySeat.id,
      granted_by_user_id: user.id,
      message: message || null,
    });
    if (!error) {
      await supabase.from('council_decisions').insert({
        seat_id: mySeat.id,
        user_id: user.id,
        decision_type: 'blessing',
        entity_id: orchardId,
        entity_type: 'orchard',
        vote: 'approve',
        notes: message || null,
      });
    }
    return { error };
  };

  return { seats, mySeat, pendingTemplates, loading, refresh, reviewTemplate, blessOrchard, isCouncilMember: !!mySeat };
}
