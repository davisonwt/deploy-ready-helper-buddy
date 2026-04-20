/**
 * HeartsProfileSheet — full profile drawer with photo carousel, voice note,
 * write-up, values & interests. Opens when a discovery card is tapped.
 */
import { useEffect, useState } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Heart, MapPin, Pause, Play, ShieldCheck, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { calcAge, type HeartsBrowseProfile } from '@/hooks/useHeartsDiscovery';

const BUCKET = 'tribal-hearts-media';

interface Props {
  profile: HeartsBrowseProfile | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSendHeart: (p: HeartsBrowseProfile) => void;
}

export function HeartsProfileSheet({ profile, open, onOpenChange, onSendHeart }: Props) {
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [audio] = useState(() => typeof Audio !== 'undefined' ? new Audio() : null);

  useEffect(() => {
    setIdx(0);
    setPlaying(false);
    audio?.pause();
    if (!profile) { setPhotoUrls([]); setVoiceUrl(null); return; }
    let cancelled = false;
    (async () => {
      const urls: string[] = [];
      for (const p of profile.photos ?? []) {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(p, 3600);
        if (data?.signedUrl) urls.push(data.signedUrl);
      }
      if (!cancelled) setPhotoUrls(urls);
      if (profile.voice_note_url) {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(profile.voice_note_url, 3600);
        if (!cancelled) setVoiceUrl(data?.signedUrl ?? null);
      } else if (!cancelled) setVoiceUrl(null);
    })();
    return () => { cancelled = true; audio?.pause(); };
  }, [profile, audio]);

  function toggleVoice() {
    if (!voiceUrl || !audio) return;
    if (playing) { audio.pause(); setPlaying(false); return; }
    audio.src = voiceUrl;
    audio.onended = () => setPlaying(false);
    audio.play();
    setPlaying(true);
  }

  if (!profile) return null;
  const age = calcAge(profile.birthdate);
  const intentLabel =
    profile.seeking_intent === 'friendship' ? 'Friendship'
      : profile.seeking_intent === 'courtship' ? 'Courtship'
      : 'Meaningful connection';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] overflow-y-auto rounded-t-3xl border-emerald-500/20 p-0">
        {/* Photo carousel */}
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
          {photoUrls.length ? (
            <img src={photoUrls[idx]} alt={profile.display_first_name ?? ''} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(150 30% 15%), hsl(45 30% 12%))' }}>
              <User className="h-16 w-16 text-white/30" />
            </div>
          )}
          {photoUrls.length > 1 && (
            <>
              <button
                onClick={() => setIdx(i => (i - 1 + photoUrls.length) % photoUrls.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white backdrop-blur"
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIdx(i => (i + 1) % photoUrls.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white backdrop-blur"
                aria-label="Next photo"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                {photoUrls.map((_, i) => (
                  <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === idx ? 'bg-white' : 'bg-white/40'}`} />
                ))}
              </div>
            </>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 pt-10">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-white drop-shadow-lg">
                {profile.display_first_name ?? 'A kindred soul'}{age ? `, ${age}` : ''}
              </h2>
              {profile.photo_verified && <ShieldCheck className="h-5 w-5 text-emerald-300" />}
            </div>
            {(profile.location_country || profile.location_region) && (
              <div className="mt-0.5 flex items-center gap-1 text-sm text-white/85">
                <MapPin className="h-3.5 w-3.5" />
                {[profile.location_region, profile.location_country].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-amber-400/30 bg-amber-400/5 text-amber-200">
              Seeking · {intentLabel}
            </Badge>
            {voiceUrl && (
              <Button onClick={toggleVoice} size="sm" variant="secondary" className="rounded-full">
                {playing ? <Pause className="mr-1 h-3.5 w-3.5" /> : <Play className="mr-1 h-3.5 w-3.5" />}
                Voice note ({profile.voice_note_duration_sec ?? 0}s)
              </Button>
            )}
          </div>

          {profile.bio && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Their story
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">{profile.bio}</p>
            </div>
          )}

          {profile.values_list?.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Values</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {profile.values_list.map(v => <Badge key={v} variant="secondary" className="text-[11px]">{v}</Badge>)}
              </div>
            </div>
          )}

          {profile.interests?.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Interests</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {profile.interests.map(v => <Badge key={v} variant="outline" className="text-[11px]">{v}</Badge>)}
              </div>
            </div>
          )}

          <Button
            onClick={() => onSendHeart(profile)}
            className="h-14 w-full rounded-full text-base font-semibold text-white shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #E8537A, #D97706)',
              boxShadow: '0 0 25px hsl(340 70% 55% / 0.45)',
            }}
          >
            <Heart className="mr-2 h-5 w-5" fill="currentColor" /> Send a heart 💗
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Chat unlocks privately the moment your hearts find each other.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
