import React, { useEffect, useState } from 'react';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TribalHeart } from './BondingAnimation';

interface MatchRow {
  matchId: string;
  partnerId: string;
  partnerName: string;
  partnerPhoto: string | null;
}

interface Props {
  onOpenChat: (partnerId: string, partnerName: string) => void;
  onBack: () => void;
}

export const MatchesList: React.FC<Props> = ({ onOpenChat, onBack }) => {
  const { user } = useAuth() as any;
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      setLoading(true);
      const { data: matchRows } = await supabase
        .from('tribal_hearts_matches')
        .select('id, member_a_id, member_b_id')
        .eq('status', 'mutual')
        .or(`member_a_id.eq.${user.id},member_b_id.eq.${user.id}`);

      const rows = (matchRows ?? []) as any[];
      const partnerIds = rows.map((m) => (m.member_a_id === user.id ? m.member_b_id : m.member_a_id));

      let byId = new Map<string, any>();
      if (partnerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('tribal_hearts_profiles')
          .select('user_id, display_first_name, photos')
          .in('user_id', partnerIds);
        byId = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
      }

      setMatches(
        rows.map((m) => {
          const partnerId = m.member_a_id === user.id ? m.member_b_id : m.member_a_id;
          const p = byId.get(partnerId);
          return {
            matchId: m.id,
            partnerId,
            partnerName: p?.display_first_name || 'A match',
            partnerPhoto: p?.photos?.[0] || null,
          };
        }),
      );
      setLoading(false);
    })();
  }, [user?.id]);

  return (
    <div
      className="min-h-screen"
      style={{ background: 'radial-gradient(ellipse at top, hsl(20 30% 12%) 0%, hsl(20 35% 7%) 60%, hsl(0 0% 4%) 100%)' }}
    >
      <header className="flex items-center gap-3 px-4 py-4">
        <button onClick={onBack} className="p-2 -ml-2" style={{ color: 'hsl(38 50% 75%)' }} aria-label="Back">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-serif italic" style={{ color: 'hsl(38 95% 85%)' }}>Your Matches</h1>
      </header>

      <main className="px-4 pb-8 max-w-md mx-auto">
        {loading ? (
          <div className="text-center text-sm py-12" style={{ color: 'hsl(38 30% 60%)' }}>Loading…</div>
        ) : matches.length === 0 ? (
          <div className="text-center text-sm py-12 italic" style={{ color: 'hsl(38 30% 60%)' }}>
            No matches yet — keep browsing and sending Sparks.
          </div>
        ) : (
          <ul className="space-y-2">
            {matches.map((m) => (
              <li key={m.matchId}>
                <button
                  onClick={() => onOpenChat(m.partnerId, m.partnerName)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all hover:scale-[1.01]"
                  style={{ background: 'hsl(20 25% 12%)', border: '1px solid hsl(25 30% 22%)' }}
                >
                  <div
                    className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                    style={{ background: 'hsl(20 25% 16%)' }}
                  >
                    {m.partnerPhoto ? (
                      <img src={m.partnerPhoto} alt={m.partnerName} className="w-full h-full object-cover" />
                    ) : (
                      <TribalHeart size={22} color="warm" />
                    )}
                  </div>
                  <span className="flex-1 font-medium" style={{ color: 'hsl(38 90% 88%)' }}>{m.partnerName}</span>
                  <MessageCircle size={18} style={{ color: 'hsl(38 40% 60%)' }} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
};
