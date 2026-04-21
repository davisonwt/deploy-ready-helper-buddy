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
      <SheetContent
        side="bottom"
        className="tribal-hearts-sanctuary h-[92vh] overflow-y-auto rounded-t-3xl p-0"
        style={{
          background: 'var(--th-wood-gradient)',
          borderColor: 'hsl(var(--th-gold) / 0.4)',
          boxShadow: 'var(--th-glow-strong)',
        }}
      >
        {/* Photo carousel in golden frame */}
        <div className="relative aspect-[4/5] w-full overflow-hidden">
          {photoUrls.length ? (
            <img src={photoUrls[idx]} alt={profile.display_first_name ?? ''} className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ background: 'radial-gradient(circle, hsl(var(--th-walnut-mid)), hsl(var(--th-walnut-dark)))' }}
            >
              <User className="h-16 w-16 text-[hsl(var(--th-gold)/0.4)]" />
            </div>
          )}
          {photoUrls.length > 1 && (
            <>
              <button
                onClick={() => setIdx(i => (i - 1 + photoUrls.length) % photoUrls.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-[hsl(var(--th-gold)/0.4)] bg-[hsl(var(--th-walnut-dark)/0.7)] p-2 text-[hsl(var(--th-gold-bright))] backdrop-blur"
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIdx(i => (i + 1) % photoUrls.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-[hsl(var(--th-gold)/0.4)] bg-[hsl(var(--th-walnut-dark)/0.7)] p-2 text-[hsl(var(--th-gold-bright))] backdrop-blur"
                aria-label="Next photo"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                {photoUrls.map((_, i) => (
                  <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === idx ? 'bg-[hsl(var(--th-gold-bright))]' : 'bg-[hsl(var(--th-gold)/0.35)]'}`} />
                ))}
              </div>
            </>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[hsl(var(--th-walnut-dark))] via-[hsl(var(--th-walnut-dark)/0.5)] to-transparent p-4 pt-10">
            <div className="flex items-center gap-2">
              <h2 className="th-serif text-3xl font-semibold th-gold-text drop-shadow-lg">
                {profile.display_first_name ?? 'A kindred soul'}{age ? `, ${age}` : ''}
              </h2>
              {profile.photo_verified && <ShieldCheck className="h-5 w-5 text-[hsl(var(--th-gold-bright))]" />}
            </div>
            {(profile.location_country || profile.location_region) && (
              <div className="mt-0.5 flex items-center gap-1 text-sm text-[hsl(var(--th-cream)/0.85)]">
                <MapPin className="h-3.5 w-3.5" />
                {[profile.location_region, profile.location_country].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-[hsl(var(--th-gold)/0.4)] bg-[hsl(var(--th-walnut-dark)/0.5)] text-[hsl(var(--th-gold-bright))]">
              Seeking · {intentLabel}
            </Badge>
            {voiceUrl && (
              <Button
                onClick={toggleVoice}
                size="sm"
                className="rounded-full border border-[hsl(var(--th-gold)/0.4)] bg-[hsl(var(--th-walnut-dark)/0.5)] text-[hsl(var(--th-gold-bright))] hover:bg-[hsl(var(--th-walnut-dark))]"
              >
                {playing ? <Pause className="mr-1 h-3.5 w-3.5" /> : <Play className="mr-1 h-3.5 w-3.5" />}
                Voice note ({profile.voice_note_duration_sec ?? 0}s)
              </Button>
            )}
          </div>

          {profile.bio && (
            <div>
              <div className="th-serif text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--th-gold)/0.85)]">
                Their story
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-[hsl(var(--th-cream)/0.92)]">{profile.bio}</p>
            </div>
          )}

          {profile.values_list?.length > 0 && (
            <div>
              <div className="th-serif text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--th-gold)/0.85)]">Values</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {profile.values_list.map(v => (
                  <Badge key={v} className="border-0 bg-[hsl(var(--th-walnut-light))] text-[11px] text-[hsl(var(--th-cream))]">{v}</Badge>
                ))}
              </div>
            </div>
          )}

          {profile.interests?.length > 0 && (
            <div>
              <div className="th-serif text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--th-gold)/0.85)]">Interests</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {profile.interests.map(v => (
                  <Badge key={v} variant="outline" className="border-[hsl(var(--th-gold)/0.35)] text-[11px] text-[hsl(var(--th-cream))]">{v}</Badge>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={() => onSendHeart(profile)}
            className="h-14 w-full rounded-full text-base font-semibold text-[hsl(var(--th-walnut-dark))] shadow-2xl hover:scale-[1.02]"
            style={{
              background: 'var(--th-gold-gradient)',
              boxShadow: 'var(--th-glow-strong)',
            }}
          >
            <Heart className="mr-2 h-5 w-5" fill="currentColor" /> Send a heart 💗
          </Button>
          <p className="text-center text-xs text-[hsl(var(--th-gold)/0.7)]">
            🔒 Secured via Sow 2 Grow — chat unlocks privately when both hearts bloom. No contact ever shared.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
