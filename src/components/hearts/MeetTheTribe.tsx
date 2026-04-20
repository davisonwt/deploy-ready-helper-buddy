/**
 * MeetTheTribe — gender-separated discovery garden.
 * Title flips to "Meet the Brothers" (women see) or "Meet the Sisters" (men see).
 */
import { useState } from 'react';
import { useHeartsDiscovery, type HeartsBrowseProfile } from '@/hooks/useHeartsDiscovery';
import { useTribalHeartsProfile } from '@/hooks/useTribalHeartsProfile';
import { HeartsBrowseCard } from './HeartsBrowseCard';
import { HeartsProfileSheet } from './HeartsProfileSheet';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function MeetTheTribe() {
  const { user } = useAuth();
  const { profile } = useTribalHeartsProfile();
  const { profiles, loading } = useHeartsDiscovery();
  const [openProfile, setOpenProfile] = useState<HeartsBrowseProfile | null>(null);

  const title = profile?.gender === 'male' ? 'Meet the Sisters' : 'Meet the Brothers';
  const sub = profile?.gender === 'male'
    ? 'Sisters who have already chosen growth — opening their hearts in the garden.'
    : 'Brothers who have already chosen growth — opening their hearts in the garden.';

  async function sendHeartFromSheet(p: HeartsBrowseProfile) {
    if (!user?.id) return;
    const { data: myProf } = await supabase
      .from('tribal_hearts_profiles').select('gender').eq('user_id', user.id).maybeSingle();
    if (!myProf) { toast.error('Complete your profile first 🌱'); return; }
    const myIsMale = myProf.gender === 'male';
    const a = myIsMale ? user.id : p.user_id;
    const b = myIsMale ? p.user_id : user.id;
    const { data: existing } = await supabase
      .from('tribal_hearts_matches').select('id,a_response,b_response,member_a_id').eq('member_a_id', a).eq('member_b_id', b).maybeSingle();
    if (existing) {
      const isA = existing.member_a_id === user.id;
      const field = isA ? 'a_response' : 'b_response';
      const { data: upd } = await supabase
        .from('tribal_hearts_matches').update({ [field]: 'accepted' }).eq('id', existing.id).select('*').single();
      if (upd?.status === 'mutual') {
        await supabase.functions.invoke('tribal-hearts-icebreaker', { body: { match_id: upd.id } });
        toast.success("🌸 It's mutual! Your safe ChatApp room is ready.");
      } else {
        toast.success('Heart sent 💗');
      }
    } else {
      const meIsA = a === user.id;
      await supabase.from('tribal_hearts_matches').insert({
        member_a_id: a, member_b_id: b,
        compatibility_score: 50, match_reasons: [],
        a_response: meIsA ? 'accepted' : 'pending',
        b_response: meIsA ? 'pending' : 'accepted',
      } as any);
      toast.success('Heart sent 💗', { description: 'Chat unlocks when they heart you back.' });
    }
    setOpenProfile(null);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-emerald-500/15 p-4 text-center"
        style={{ background: 'linear-gradient(135deg, hsl(150 40% 12% / 0.5), hsl(45 40% 10% / 0.4))' }}>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200">
          <Sparkles className="h-3 w-3" /> The Garden
        </div>
        <h2 className="mt-2 font-serif text-2xl font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Opening the garden gate…
        </div>
      ) : profiles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/50 p-10 text-center">
          <Sparkles className="mx-auto mb-2 h-6 w-6 text-amber-400" />
          <p className="text-sm text-muted-foreground">
            The garden is quiet today — fresh souls bloom every day. Check back soon. 🌱
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {profiles.map(p => (
            <HeartsBrowseCard key={p.user_id} profile={p} onOpen={setOpenProfile} />
          ))}
        </div>
      )}

      <HeartsProfileSheet
        profile={openProfile}
        open={!!openProfile}
        onOpenChange={(o) => !o && setOpenProfile(null)}
        onSendHeart={sendHeartFromSheet}
      />
    </div>
  );
}
