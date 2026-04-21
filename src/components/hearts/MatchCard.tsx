/**
 * MatchCard — soulful match card for Daily Sparks & Match Garden.
 * Round gold-rimmed portrait, wood card, glowing CTAs (matches reference design).
 */
import { useEffect, useState } from 'react';
import { Heart, MapPin, ShieldCheck, Leaf, User, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import type { HeartsMatch } from '@/hooks/useTribalHeartsMatches';

const BUCKET = 'tribal-hearts-media';

interface Props {
  match: HeartsMatch;
  onAccept: () => void;
  onPass: () => void;
}

export function MatchCard({ match, onAccept, onPass }: Props) {
  const p = match.partner as any;
  const sharedValues = (match.match_reasons.find((r: any) => r.kind === 'values')?.items ?? []).slice(0, 3);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [audio] = useState(() => typeof Audio !== 'undefined' ? new Audio() : null);

  useEffect(() => {
    let cancelled = false;
    const cover = p?.photos?.[0];
    if (cover) {
      supabase.storage.from(BUCKET).createSignedUrl(cover, 3600).then(({ data }) => {
        if (!cancelled) setPhotoUrl(data?.signedUrl ?? null);
      });
    }
    return () => { cancelled = true; };
  }, [p?.photos]);

  async function toggleVoice(e: React.MouseEvent) {
    e.stopPropagation();
    if (!p?.voice_note_url || !audio) return;
    if (playing) { audio.pause(); setPlaying(false); return; }
    let url = voiceUrl;
    if (!url) {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(p.voice_note_url, 3600);
      url = data?.signedUrl ?? null;
      setVoiceUrl(url);
    }
    if (!url) return;
    audio.src = url;
    audio.onended = () => setPlaying(false);
    audio.play();
    setPlaying(true);
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 text-center transition hover:scale-[1.01]"
      style={{
        background: 'var(--th-wood-gradient-soft)',
        border: '1px solid hsl(var(--th-gold) / 0.35)',
        boxShadow: 'var(--th-inner-shadow), 0 10px 28px hsl(0 0% 0% / 0.45), 0 0 26px hsl(var(--th-ember) / 0.15)',
      }}
    >
      {/* Embossed heart watermarks */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]"
           style={{
             backgroundImage:
               "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23E8B86B' stroke-width='1.2'><path d='M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z'/></svg>\")",
             backgroundSize: '60px 60px',
           }} />

      {/* Round gold-rimmed portrait */}
      <div className="relative mx-auto mb-4 h-28 w-28">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'var(--th-gold-gradient)',
            filter: 'blur(8px)',
            opacity: 0.55,
          }}
        />
        <div
          className="relative h-28 w-28 overflow-hidden rounded-full"
          style={{
            border: '3px solid hsl(var(--th-gold-bright))',
            boxShadow: '0 0 24px hsl(var(--th-gold) / 0.55), inset 0 0 12px hsl(var(--th-walnut-dark) / 0.5)',
          }}
        >
          {photoUrl ? (
            <img src={photoUrl} alt={p?.display_first_name ?? 'Match'} className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ background: 'radial-gradient(circle, hsl(var(--th-walnut-mid)), hsl(var(--th-walnut-dark)))' }}
            >
              <User className="h-10 w-10 text-[hsl(var(--th-gold)/0.5)]" />
            </div>
          )}
        </div>
        {p?.voice_note_url && (
          <button
            onClick={toggleVoice}
            aria-label="Play voice note"
            className="absolute -bottom-1 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 transition hover:scale-110"
            style={{
              background: 'hsl(var(--th-walnut-dark))',
              borderColor: 'hsl(var(--th-gold-bright))',
              boxShadow: '0 0 12px hsl(var(--th-gold) / 0.55)',
              color: 'hsl(var(--th-gold-bright))',
            }}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* Name + verified */}
      <div className="relative flex items-center justify-center gap-1.5">
        <h3 className="th-serif text-lg font-semibold uppercase tracking-[0.14em] text-[hsl(var(--th-cream))]">
          {p?.display_first_name ?? 'A kindred soul'}
        </h3>
        {p?.photo_verified && (
          <ShieldCheck className="h-4 w-4 text-[hsl(var(--th-gold-bright))]" />
        )}
      </div>

      {/* Location + compatibility */}
      <div className="relative mt-1 flex items-center justify-center gap-3 text-[11px] text-[hsl(var(--th-cream)/0.7)]">
        {(p?.location_country || p?.location_region) && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {[p?.location_region, p?.location_country].filter(Boolean).join(', ')}
          </span>
        )}
        <span className="th-gold-text font-semibold">
          {Math.round(match.compatibility_score)}% resonance
        </span>
      </div>

      {/* Bio */}
      {p?.bio && (
        <p className="relative mt-3 line-clamp-3 text-sm leading-relaxed text-[hsl(var(--th-cream)/0.85)]">
          {p.bio}
        </p>
      )}

      {/* Shared values */}
      {sharedValues.length > 0 && (
        <div className="relative mt-2 flex flex-wrap justify-center gap-1">
          {sharedValues.map((v: string) => (
            <Badge
              key={v}
              variant="outline"
              className="border-[hsl(var(--th-gold)/0.4)] bg-[hsl(var(--th-walnut-dark)/0.5)] text-[10px] text-[hsl(var(--th-gold-bright))]"
            >
              {v}
            </Badge>
          ))}
        </div>
      )}

      {/* CTAs — like + send a message style */}
      <div className="relative mt-4 flex items-center justify-center gap-2">
        <Button
          onClick={onAccept}
          size="sm"
          className="flex-1 rounded-full font-semibold text-[hsl(var(--th-walnut-dark))] shadow-md hover:scale-[1.02]"
          style={{
            background: 'var(--th-gold-gradient)',
            boxShadow: 'var(--th-glow-soft)',
          }}
        >
          <Heart className="mr-1.5 h-4 w-4" fill="currentColor" /> Send heart
        </Button>
        <Button
          onClick={onPass}
          size="sm"
          variant="outline"
          className="rounded-full border-[hsl(var(--th-gold)/0.4)] bg-[hsl(var(--th-walnut-dark)/0.4)] text-[hsl(var(--th-cream)/0.8)] hover:bg-[hsl(var(--th-walnut-dark)/0.6)] hover:text-[hsl(var(--th-gold-bright))]"
        >
          <Leaf className="mr-1 h-3.5 w-3.5" /> Pass
        </Button>
      </div>
    </div>
  );
}
