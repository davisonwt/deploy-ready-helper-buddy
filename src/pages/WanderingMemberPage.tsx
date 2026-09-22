import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, MapPin, Quote } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import SignedImg from '@/components/media/SignedImg';
import StallJoinSheet from '@/components/stalls/StallJoinSheet';
import StallChatSheet from '@/components/stalls/StallChatSheet';
import { getPreset } from '@/lib/store/presets';
import NotFound from '@/pages/NotFound';

interface Testimonial {
  name?: string | null;
  town?: string | null;
  quote?: string | null;
}

interface WanderingRow {
  id: string;
  user_id: string;
  role: string;
  display_name: string | null;
  base_town: string | null;
  tagline: string | null;
  photo_url: string | null;
  gallery_urls: string[] | null;
  testimonials: Testimonial[] | null;
  status: string;
}

/**
 * /wandering/:role/:id -- one Wandering member's public page.
 *
 * The missing half of this app's own pattern: an individual thing is
 * public (/stall/:username, /store/:slug, /seed/pillow/:id) while the
 * aggregate that lists them is members-only (/stalls-feed,
 * /wandering-directory). A Wandering member had no public page at all, so
 * the only thing they could share was a gated directory -- and the door
 * share built exactly this URL shape, which had never been a route and
 * 404'd for everyone.
 *
 * Read-only and unauthenticated by design. RLS already publishes active
 * rows ("Everyone can read active wandering_roles"), so no policy changes
 * were needed; an inactive row simply returns nothing here.
 *
 * Anything that is not a live, active row renders the app's own NotFound
 * rather than an error state -- and NotFound carries the Join CTA when the
 * visitor arrived on a referral link, so even a stale share still converts.
 */
export default function WanderingMemberPage() {
  const { role, id } = useParams<{ role: string; id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // undefined = still loading, null = nothing to show
  const [row, setRow] = useState<WanderingRow | null | undefined>(undefined);
  const [showJoin, setShowJoin] = useState(false);
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (!id) { setRow(null); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from('wandering_roles')
        .select('id, user_id, role, display_name, base_town, tagline, photo_url, gallery_urls, testimonials, status')
        .eq('id', id)
        .eq('status', 'active')
        .maybeSingle();
      if (alive) setRow((data as unknown as WanderingRow | null) ?? null);
    })();
    return () => { alive = false; };
  }, [id]);

  /**
   * The same contact path the stall interior uses -- get_or_create_direct_room
   * then StallChatSheet -- rather than a second messaging surface. A
   * logged-out viewer gets the standard StallJoinSheet nudge, exactly as
   * tapping a stall hotspot does.
   */
  const handleMessage = async () => {
    if (!user) { setShowJoin(true); return; }
    if (!row) return;
    if (user.id === row.user_id) { navigate('/wandering-directory?role=' + encodeURIComponent(row.role)); return; }
    setChatRoomId(null);
    setShowChat(true);
    const { data: roomId, error } = await supabase.rpc('get_or_create_direct_room', {
      user1_id: user.id,
      user2_id: row.user_id,
    });
    if (error || !roomId) {
      toast({ variant: 'destructive', title: 'Could not start a conversation', description: error?.message });
      setShowChat(false);
      return;
    }
    setChatRoomId(roomId as unknown as string);
  };

  if (row === undefined) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#060a12]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Unknown id, or a row that is not active: the app's own not-found page,
  // never a bespoke error screen.
  if (!row) return <NotFound />;

  const preset = getPreset(row.role);
  const accent = preset?.accent ?? '#16a34a';
  const roleLabel = preset?.title ?? 'Wandering member';
  const name = row.display_name?.trim() || 'Tribe member';
  const testimonials = (row.testimonials ?? []).filter((t) => t?.quote?.trim());

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-200">
      <div className="mx-auto max-w-3xl px-4 py-6">
        {/* Golden rule: every routed page has a visible way back. The
            directory is this page's parent, filtered to its own role. */}
        <Link
          to={`/wandering-directory?role=${encodeURIComponent(row.role)}`}
          className="mb-5 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[13px] text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {roleLabel} directory
        </Link>

        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: `${accent}33`, background: '#0d1117' }}>
          <div style={{ height: 6, background: accent }} />

          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full text-2xl"
                style={{ background: `${accent}33`, border: `2px solid ${accent}55` }}
              >
                {row.photo_url
                  ? <SignedImg src={row.photo_url} alt="" className="h-full w-full object-cover" />
                  : (preset?.kind ? '🌿' : '🌿')}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold text-slate-100">{name}</h1>
                <p className="text-sm font-semibold" style={{ color: accent }}>{roleLabel}</p>
                {row.base_town && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3 w-3" /> {row.base_town}
                  </p>
                )}
              </div>
            </div>

            {row.tagline && (
              <p className="mt-4 text-[15px] leading-relaxed text-slate-300">{row.tagline}</p>
            )}

            {!!row.gallery_urls?.length && (
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {row.gallery_urls.map((url, i) => (
                  <SignedImg
                    key={i}
                    src={url}
                    alt=""
                    className="aspect-square w-full rounded-lg border border-white/10 object-cover"
                  />
                ))}
              </div>
            )}

            {!!testimonials.length && (
              <div className="mt-6 space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">What the tribe says</h2>
                {testimonials.map((t, i) => (
                  <figure key={i} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                    <Quote className="mb-1 h-3.5 w-3.5" style={{ color: accent }} />
                    <blockquote className="text-sm text-slate-300">{t.quote}</blockquote>
                    <figcaption className="mt-1.5 text-xs text-slate-500">
                      {[t.name, t.town].filter(Boolean).join(' · ')}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleMessage}
              className="mt-6 w-full rounded-full px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: accent }}
            >
              Message {name}
            </button>
          </div>
        </div>
      </div>

      {showJoin && (
        <StallJoinSheet
          stallName={name}
          blurb={`Sign up to message ${name} and everything else the tribe shares.`}
          onClose={() => setShowJoin(false)}
        />
      )}

      {showChat && (
        <StallChatSheet roomId={chatRoomId} onClose={() => { setShowChat(false); setChatRoomId(null); }} />
      )}
    </div>
  );
}
