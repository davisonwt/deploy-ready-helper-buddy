/**
 * WhisperersFeedPage — public-facing feed of registered Whisperers.
 *
 * Lists every active Whisperer with `is_listed = true` from the
 * `whisperers` table. Each card shows their headline, bio snippet,
 * specialties, location, years of experience, and a swipeable portfolio
 * preview (images + videos). A clear "Become a Whisperer" CTA at the top
 * routes tribe members to /become-a-whisperer.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, MapPin, Briefcase, ExternalLink, MessageCircle, Loader2, Play, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type Media = { type: 'image' | 'video'; url: string; path: string };

interface WhispererRow {
  id: string;
  user_id: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  rates: string | null;
  years_experience: number | null;
  specialties: string[] | null;
  languages: string[] | null;
  portfolio_url: string | null;
  portfolio_media: Media[] | null;
  is_verified: boolean | null;
  created_at: string;
}

export default function WhisperersFeedPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<WhispererRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from('whisperers')
        .select('id,user_id,display_name,headline,bio,avatar_url,location,rates,years_experience,specialties,languages,portfolio_url,portfolio_media,is_verified,created_at')
        .eq('is_listed', true)
        .eq('is_active', true)
        .order('is_verified', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200);
      if (!alive) return;
      if (error) console.error(error);
      setRows((data as any) || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase
        .from('whisperers').select('id').eq('user_id', user.id).maybeSingle();
      setMyId(data?.id || null);
    })();
  }, [user?.id]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0f14] via-[#0e0a1a] to-[#0a0f14] text-emerald-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-emerald-200 hover:text-white text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <Link to="/learn-share" className="text-xs text-emerald-200/70 hover:text-white">Learn & Share →</Link>
        </div>

        <header className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-400/30 text-purple-200 text-xs mb-3">
            🌬️ Whisperers Feed
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Whisperers — find your seed's voice
          </h1>
          <p className="text-emerald-200/80 mt-2 max-w-2xl text-sm md:text-base">
            Browse marketers and content creators in the tribe. Reach out from inside the Sow2Grow ChatApp
            to partner up and take your seeds viral together.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/become-a-whisperer"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white text-sm font-semibold inline-flex items-center gap-2 hover:from-purple-400 hover:to-fuchsia-400"
            >
              <Sparkles className="w-4 h-4" />
              {myId ? 'Edit my Whisperer profile' : 'Become a Whisperer'}
            </Link>
            <Link
              to="/learn-share?role=Whisperer"
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-sm"
            >
              Watch how it works
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="py-20 flex items-center justify-center text-emerald-200/80"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <div className="py-20 text-center text-emerald-200/70 border border-dashed border-emerald-500/20 rounded-2xl">
            <p className="text-base">No Whisperers listed yet.</p>
            <p className="text-sm mt-1">Be the first — click <strong>Become a Whisperer</strong> above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rows.map(w => <WhispererCard key={w.id} w={w} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function WhispererCard({ w }: { w: WhispererRow }) {
  const media = Array.isArray(w.portfolio_media) ? w.portfolio_media : [];
  const [idx, setIdx] = useState(0);
  const current = media[idx];

  return (
    <div className="bg-black/40 border border-purple-400/15 hover:border-purple-400/40 transition rounded-2xl overflow-hidden flex flex-col">
      {/* Portfolio preview */}
      <div className="relative aspect-video bg-black">
        {current ? (
          current.type === 'image' ? (
            <img src={current.url} alt="" className="w-full h-full object-cover" />
          ) : (
            <video src={current.url} controls className="w-full h-full object-cover bg-black" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-emerald-300/40 text-sm">
            <ImageIcon className="w-8 h-8" />
          </div>
        )}
        {media.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {media.map((m, i) => (
              <button
                key={m.path}
                onClick={() => setIdx(i)}
                className={`w-2 h-2 rounded-full ${i === idx ? 'bg-white' : 'bg-white/40'}`}
                aria-label={`Show item ${i + 1}`}
              />
            ))}
          </div>
        )}
        {current?.type === 'video' && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-[10px] inline-flex items-center gap-1">
            <Play className="w-3 h-3" /> video
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-white">
              {w.display_name}
              {w.is_verified && <span title="Verified" className="ml-1 text-xs text-emerald-300">✓</span>}
            </div>
            {w.headline && <div className="text-sm text-emerald-200/80 mt-0.5 line-clamp-2">{w.headline}</div>}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-emerald-200/70">
          {w.location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{w.location}</span>}
          {typeof w.years_experience === 'number' && (
            <span className="inline-flex items-center gap-1"><Briefcase className="w-3 h-3" />{w.years_experience} yr exp</span>
          )}
          {w.rates && <span className="text-purple-200/90">· {w.rates}</span>}
        </div>

        {w.bio && <p className="text-sm text-emerald-100/85 mt-3 line-clamp-4">{w.bio}</p>}

        {w.specialties && w.specialties.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {w.specialties.slice(0, 6).map(s => (
              <span key={s} className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-400/30 text-[11px] text-purple-100">
                {s}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <Link
            to={`/chatapp?dm=${w.user_id}`}
            className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-400 hover:to-fuchsia-400 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Message via ChatApp
          </Link>
          {w.portfolio_url && (
            <a
              href={w.portfolio_url}
              target="_blank"
              rel="noreferrer noopener"
              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Portfolio
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
