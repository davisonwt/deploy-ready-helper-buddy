/**
 * HeartsBrowseCard — a soulful card in the Brothers/Sisters discovery garden.
 * One-tap "Send a heart" creates a pending match; mutual hearts unlock chat.
 */
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, MapPin, ShieldCheck, Play, Pause, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { calcAge, type HeartsBrowseProfile } from '@/hooks/useHeartsDiscovery';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const BUCKET = 'tribal-hearts-media';

interface Props {
  profile: HeartsBrowseProfile;
  onOpen: (p: HeartsBrowseProfile) => void;
}

export function HeartsBrowseCard({ profile, onOpen }: Props) {
  const { user } = useAuth();
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [audio] = useState(() => typeof Audio !== 'undefined' ? new Audio() : null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (profile.photos?.[0]) {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(profile.photos[0], 3600);
        if (!cancelled) setCoverUrl(data?.signedUrl ?? null);
      }
    })();
    return () => { cancelled = true; };
  }, [profile.photos]);

  async function toggleVoice(e: React.MouseEvent) {
    e.stopPropagation();
    if (!profile.voice_note_url || !audio) return;
    if (playing) { audio.pause(); setPlaying(false); return; }
    let url = voiceUrl;
    if (!url) {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(profile.voice_note_url, 3600);
      url = data?.signedUrl ?? null;
      setVoiceUrl(url);
    }
    if (!url) return;
    audio.src = url;
    audio.onended = () => setPlaying(false);
    audio.play();
    setPlaying(true);
  }

  async function sendHeart(e: React.MouseEvent) {
    e.stopPropagation();
    if (!user?.id || sending) return;
    setSending(true);
    try {
      // Hetero match must be (male = a, female = b). Determine via my profile gender.
      const { data: myProf } = await supabase
        .from('tribal_hearts_profiles')
        .select('gender')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!myProf) { toast.error('Complete your profile first 🌱'); return; }
      const myIsMale = myProf.gender === 'male';
      const a = myIsMale ? user.id : profile.user_id;
      const b = myIsMale ? profile.user_id : user.id;

      // Try to find existing match
      const { data: existing } = await supabase
        .from('tribal_hearts_matches')
        .select('id,member_a_id,member_b_id,a_response,b_response,status')
        .eq('member_a_id', a)
        .eq('member_b_id', b)
        .maybeSingle();

      if (existing) {
        const isA = existing.member_a_id === user.id;
        const field = isA ? 'a_response' : 'b_response';
        if ((isA ? existing.a_response : existing.b_response) === 'accepted') {
          toast('You already sent a heart 💗', { description: 'Waiting for them to bloom too.' });
          return;
        }
        const { data: updated } = await supabase
          .from('tribal_hearts_matches')
          .update({ [field]: 'accepted' })
          .eq('id', existing.id)
          .select('*')
          .single();
        if (updated?.status === 'mutual') {
          await supabase.functions.invoke('tribal-hearts-icebreaker', { body: { match_id: updated.id } });
          toast.success("🌸 It's mutual! Your safe ChatApp room is ready.");
          return;
        }
        toast.success('Heart sent 💗');
        return;
      }

      // Create new pending match — me = accepted, other = pending
      const meIsA = a === user.id;
      const insertPayload = {
        member_a_id: a,
        member_b_id: b,
        compatibility_score: 50,
        match_reasons: [],
        a_response: meIsA ? 'accepted' : 'pending',
        b_response: meIsA ? 'pending' : 'accepted',
      };
      const { error } = await supabase.from('tribal_hearts_matches').insert(insertPayload as any);
      if (error) { toast.error(error.message); return; }
      toast.success('Heart sent 💗', { description: 'Chat unlocks when they heart you back.' });
    } finally { setSending(false); }
  }

  const age = calcAge(profile.birthdate);
  const intentLabel =
    profile.seeking_intent === 'friendship' ? 'Friendship'
      : profile.seeking_intent === 'courtship' ? 'Courtship'
      : 'Meaningful connection';

  return (
    <Card
      onClick={() => onOpen(profile)}
      className="group relative cursor-pointer overflow-hidden border-emerald-500/15 bg-gradient-to-br from-card via-card/95 to-emerald-500/5 shadow-lg transition hover:shadow-2xl hover:shadow-amber-400/10"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
        {coverUrl ? (
          <img src={coverUrl} alt={profile.display_first_name ?? 'Tribe member'} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ background: 'linear-gradient(135deg, hsl(150 30% 15%), hsl(45 30% 12%))' }}
          >
            <User className="h-12 w-12 text-white/30" />
          </div>
        )}
        {/* Bottom gradient + name */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3">
          <div className="flex items-center gap-2">
            <div className="truncate text-base font-semibold text-white drop-shadow">
              {profile.display_first_name ?? 'A kindred soul'}{age ? `, ${age}` : ''}
            </div>
            {profile.photo_verified && (
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
            )}
          </div>
          {(profile.location_country || profile.location_region) && (
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-white/80">
              <MapPin className="h-3 w-3" />
              {[profile.location_region, profile.location_country].filter(Boolean).join(', ')}
            </div>
          )}
        </div>
        {/* Voice note pill */}
        {profile.voice_note_url && (
          <button
            onClick={toggleVoice}
            className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-md hover:bg-black/80"
          >
            {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            voice
          </button>
        )}
      </div>

      <div className="space-y-2 p-3">
        <Badge variant="outline" className="border-amber-400/30 bg-amber-400/5 text-[10px] text-amber-200">
          Seeking · {intentLabel}
        </Badge>
        {profile.bio && (
          <p className="line-clamp-2 text-[13px] leading-snug text-foreground/85">{profile.bio}</p>
        )}
        <Button
          onClick={sendHeart}
          disabled={sending}
          size="sm"
          className="mt-1 w-full rounded-full text-white shadow-md"
          style={{ background: 'linear-gradient(135deg, #E8537A, #D97706)' }}
        >
          <Heart className="mr-1 h-4 w-4" fill="currentColor" /> Send a heart
        </Button>
      </div>
    </Card>
  );
}
