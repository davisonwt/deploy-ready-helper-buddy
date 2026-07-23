import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMusicPurchase } from '@/hooks/useMusicPurchase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Home, Loader2, Play, Pause, Heart, Download } from 'lucide-react';
import { toast } from 'sonner';

const PREVIEW_SECONDS = 40;
const PRIVATE_BUCKETS = ['music-tracks', 'dj-music', 'premium-room'];

function extractBucketAndPath(url: string): { bucket: string; path: string } | null {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
    if (!m) return null;
    return { bucket: m[1], path: decodeURIComponent(m[2]) };
  } catch { return null; }
}

async function resolveMediaUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  const parts = extractBucketAndPath(url);
  if (!parts) return url;
  if (!PRIVATE_BUCKETS.includes(parts.bucket)) return url;
  const { data } = await supabase.storage.from(parts.bucket).createSignedUrl(parts.path, 60 * 60);
  return data?.signedUrl || url;
}

export default function MusicTrackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { purchaseTrack, hasPurchased, loading: purchasing } = useMusicPurchase();

  const [track, setTrack] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [owned, setOwned] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('dj_music_tracks')
        .select('id, track_title, artist_name, cover_image_url, file_url, preview_url, price, duration_seconds, genre, music_genre, dj_id')
        .eq('id', id)
        .maybeSingle();
      if (!alive) return;
      if (error || !data) {
        toast.error('Track not found');
        setLoading(false);
        return;
      }
      setTrack(data);
      const [c, a] = await Promise.all([
        resolveMediaUrl(data.cover_image_url),
        resolveMediaUrl(data.preview_url || data.file_url),
      ]);
      if (!alive) return;
      setCoverUrl(c);
      setAudioUrl(a);
      if (user) setOwned(await hasPurchased(data.id));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id, user]);

  const onTime = () => {
    const el = audioRef.current;
    if (!el) return;
    setElapsed(el.currentTime);
    if (!owned && el.currentTime >= PREVIEW_SECONDS) {
      el.pause();
      el.currentTime = 0;
      setPlaying(false);
      toast('Preview ended — bestow to unlock the full track.');
    }
  };

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) { el.pause(); setPlaying(false); }
    else { el.play(); setPlaying(true); }
  };

  const handleBuy = () => {
    if (!track) return;
    purchaseTrack(track.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-purple-950">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!track) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-4 p-8">
        <p>Track not found.</p>
        <Button onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
      </div>
    );
  }

  const price = Number(track.price) >= 2 ? Number(track.price) : 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
              <Home className="w-4 h-4 mr-1" /> Home
            </Button>
          </Link>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur">
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-64 aspect-square rounded-xl overflow-hidden bg-slate-800 flex-shrink-0">
              {coverUrl ? (
                <img src={coverUrl} alt={track.track_title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">🎵</div>
              )}
            </div>

            <div className="flex-1 flex flex-col gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-emerald-400 mb-1">Music Seed</div>
                <h1 className="text-2xl md:text-3xl font-bold">{track.track_title}</h1>
                <div className="text-slate-300 mt-1">by {track.artist_name || 'Tribe Music'}</div>
                {(track.music_genre || track.genre) && (
                  <div className="text-xs text-slate-400 mt-1">Genre: {track.music_genre || track.genre}</div>
                )}
              </div>

              {audioUrl && (
                <div className="rounded-lg bg-black/30 p-4">
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    onTimeUpdate={onTime}
                    onEnded={() => setPlaying(false)}
                    preload="metadata"
                  />
                  <div className="flex items-center gap-3">
                    <Button onClick={toggle} size="icon" className="rounded-full bg-emerald-500 hover:bg-emerald-600">
                      {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </Button>
                    <div className="flex-1">
                      <div className="text-sm">
                        {owned ? 'Full track' : `${PREVIEW_SECONDS}-second preview`}
                      </div>
                      <div className="text-xs text-slate-400">
                        {Math.floor(elapsed)}s {!owned && `/ ${PREVIEW_SECONDS}s`}
                      </div>
                      <div className="h-1 mt-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 transition-all"
                          style={{ width: `${Math.min(100, (elapsed / (owned ? (track.duration_seconds || PREVIEW_SECONDS) : PREVIEW_SECONDS)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                {owned ? (
                  <a href={audioUrl || '#'} download>
                    <Button className="bg-emerald-500 hover:bg-emerald-600">
                      <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                  </a>
                ) : (
                  <Button onClick={handleBuy} disabled={purchasing} className="bg-rose-500 hover:bg-rose-600">
                    {purchasing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Heart className="w-4 h-4 mr-2" />}
                    Bestow ${price.toFixed(2)} USDC
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
