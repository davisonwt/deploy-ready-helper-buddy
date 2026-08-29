import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMusicPurchase } from '@/hooks/useMusicPurchase';
import { invokePaymentFunction } from '@/lib/payments/invokeFunction';
import { fetchSeedFileUrl } from '@/lib/media/getSeedFileUrl';
import { usePreviewPlayer } from '@/hooks/usePreviewPlayer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Home, Loader2, Play, Pause, Heart, Download } from 'lucide-react';
import { toast } from 'sonner';
import { priceBreakdown } from '@/lib/pricing/platformFee';
import { PREVIEW_SECONDS } from '@/lib/media/previewLength';
import ProviderPicker from '@/components/payments/ProviderPicker';
import { CRYPTO_ROUNDING_NOTICE, DEFAULT_CRYPTO_PAY_CURRENCY, MIN_CRYPTO_BESTOWAL_USD, type PayoutProviderId } from '@/lib/payments/providerFees';

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
  // dj_track files (music-tracks/dj-music) only — product-sourced
  // (premium-room) files never go through this path; see fetchSeedFileUrl.
  const { data } = await supabase.storage.from(parts.bucket).createSignedUrl(parts.path, 60 * 60);
  return data?.signedUrl || null;
}

type TrackSource = 'dj_track' | 'product';

interface NormalizedTrack {
  id: string;
  source: TrackSource;
  title: string;
  artist_name: string | null;
  cover_image_url: string | null;
  playable_url: string | null;
  /** Product-sourced only — a public 45s clip in seed-previews, playable directly, no signing. */
  preview_url: string | null;
  price: number | null;
  duration_seconds: number | null;
  genre: string | null;
}

export default function MusicTrackDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { purchaseTrack, hasPurchased, loading: purchasingTrack } = useMusicPurchase();

  const [track, setTrack] = useState<NormalizedTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [djAudioUrl, setDjAudioUrl] = useState<string | null>(null);
  const [owned, setOwned] = useState(false);
  const [buyingProduct, setBuyingProduct] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [provider, setProvider] = useState<PayoutProviderId>('nowpayments');

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) return;
      setLoading(true);

      // dj_music_tracks first, products (type='music') as fallback — the
      // Music tab's "Open" link can point at either id space.
      const { data: djData } = await supabase
        .from('dj_music_tracks')
        .select('id, track_title, artist_name, cover_image_url, file_url, preview_url, price, duration_seconds, genre, music_genre, dj_id')
        .eq('id', id)
        .maybeSingle();

      let normalized: NormalizedTrack | null = null;

      if (djData) {
        normalized = {
          id: djData.id,
          source: 'dj_track',
          title: djData.track_title,
          artist_name: djData.artist_name,
          cover_image_url: djData.cover_image_url,
          playable_url: djData.preview_url || djData.file_url,
          preview_url: null, // dj tracks fold preview into playable_url already, above
          price: djData.price,
          duration_seconds: djData.duration_seconds,
          genre: djData.music_genre || djData.genre,
        };
      } else {
        const { data: productData } = await supabase
          .from('products')
          .select('id, title, artist_name, cover_image_url, image_urls, file_url, preview_url, price, duration, music_genre, music_mood, sower_id')
          .eq('id', id)
          .eq('type', 'music')
          .maybeSingle();

        if (productData) {
          let sowerName: string | null = null;
          if (productData.sower_id) {
            const { data: sowerRow } = await supabase
              .from('sowers')
              .select('display_name')
              .eq('id', productData.sower_id)
              .maybeSingle();
            sowerName = sowerRow?.display_name ?? null;
          }
          normalized = {
            id: productData.id,
            source: 'product',
            title: productData.title,
            artist_name: productData.artist_name || sowerName,
            cover_image_url: productData.cover_image_url || productData.image_urls?.[0] || null,
            playable_url: productData.file_url,
            preview_url: productData.preview_url ?? null,
            price: productData.price,
            duration_seconds: productData.duration,
            genre: productData.music_genre || productData.music_mood,
          };
        }
      }

      if (!alive) return;
      if (!normalized) {
        toast.error('Track not found');
        setLoading(false);
        return;
      }

      setTrack(normalized);
      const c = await resolveMediaUrl(normalized.cover_image_url);
      if (!alive) return;
      setCoverUrl(c);

      let isOwned = false;
      if (user) {
        if (normalized.source === 'dj_track') {
          isOwned = await hasPurchased(normalized.id);
        } else {
          // product_bestowals is the real purchase record for `products` rows
          // (music_purchases only ever tracks dj_music_tracks purchases).
          const { data: bestowalRow } = await supabase
            .from('product_bestowals')
            .select('id')
            .eq('bestower_id', user.id)
            .eq('product_id', normalized.id)
            .eq('status', 'completed')
            .maybeSingle();
          isOwned = !!bestowalRow;
        }
      }
      if (!alive) return;
      setOwned(isOwned);

      // dj_track previews/full files resolve the same way regardless of
      // ownership — playingUrl is either dj's own preview_url or, lacking
      // that, the full file_url, capped client-side below either way. A
      // product-sourced track leans entirely on usePreviewPlayer instead:
      // preview_url (public, no signing) plays directly; get-seed-file is
      // tried lazily on click, not here, so a feed of tracks doesn't fire
      // an entitlement check per card on load.
      const dj = normalized.source === 'dj_track' ? await resolveMediaUrl(normalized.playable_url) : null;
      if (!alive) return;
      setDjAudioUrl(dj);

      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id, user]);

  // Owners/buyers get the full file same as before; get-seed-file re-checks
  // entitlement server-side on every call, so it's safe to always pass
  // productId here and let it fail gracefully (falls back to previewUrl)
  // for a non-owner rather than gating client-side on `owned`.
  const player = usePreviewPlayer({
    id: track?.id ?? 'pending',
    previewUrl: track?.source === 'dj_track' ? djAudioUrl : (track?.preview_url ?? null),
    productId: track && track.source === 'product' ? track.id : undefined,
    capSeconds: track?.source === 'dj_track' && !owned ? PREVIEW_SECONDS : undefined,
  });
  const showPlayer = track
    ? track.source === 'dj_track'
      ? !!djAudioUrl
      : !!track.preview_url || owned
    : false;

  // A product-sourced download mints a fresh 60s URL at click time rather
  // than reusing the one fetched on page load, which may well have expired
  // by the time the buyer actually clicks (get-seed-file re-checks
  // entitlement on every call, per spec-seed-protection.md).
  const handleDownload = async () => {
    if (!track) return;
    setDownloading(true);
    try {
      const url = await fetchSeedFileUrl(track.id, 'download');
      if (!url) {
        toast.error('Could not get a download link. Please try again.');
        return;
      }
      const a = document.createElement('a');
      a.href = url;
      a.download = track.title || 'seed';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      setDownloading(false);
    }
  };

  const handleBuy = async () => {
    if (!track) return;
    const belowCryptoMin = priceBreakdown(track.price).total < MIN_CRYPTO_BESTOWAL_USD;
    const effectiveProvider: PayoutProviderId = belowCryptoMin ? 'paypal' : provider;

    if (track.source === 'dj_track') {
      purchaseTrack(track.id, track.price, { provider: effectiveProvider });
      return;
    }

    // Products go through the real, already-working single-item basket
    // path (same one BestowalCheckout/AlbumBuilderCart use) — the
    // content_purchases pipeline purchaseTrack() calls only ever resolves
    // against dj_music_tracks and would 404 on a products id.
    if (!user) {
      toast.error('Please log in to bestow');
      return;
    }
    setBuyingProduct(true);
    try {
      const data = await invokePaymentFunction<any>('create-basket-bestowal-order', {
        items: [{ productId: track.id, qty: 1 }],
        provider: effectiveProvider,
        payCurrency: effectiveProvider === 'nowpayments' ? DEFAULT_CRYPTO_PAY_CURRENCY : undefined,
        redirectBaseUrl: typeof window !== 'undefined' ? window.location.origin : undefined,
      });
      const redirectUrl = data?.invoiceUrl || data?.approveUrl;
      if (!redirectUrl) throw new Error('Provider did not return a checkout URL');
      window.location.href = redirectUrl;
    } catch (error) {
      console.error('Product bestowal failed:', error);
      toast.error(error instanceof Error ? error.message : 'Bestowal failed. Please try again.');
    } finally {
      setBuyingProduct(false);
    }
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

  const { base, s2gFee, total } = priceBreakdown(track.price);
  const isBuying = track.source === 'dj_track' ? purchasingTrack : buyingProduct;
  const belowCryptoMin = total < MIN_CRYPTO_BESTOWAL_USD;
  const effectiveProvider: PayoutProviderId = belowCryptoMin ? 'paypal' : provider;

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
                <img src={coverUrl} alt={track.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">🎵</div>
              )}
            </div>

            <div className="flex-1 flex flex-col gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-emerald-400 mb-1">Music Seed</div>
                <h1 className="text-2xl md:text-3xl font-bold">{track.title}</h1>
                <div className="text-slate-300 mt-1">by {track.artist_name || 'Tribe Music'}</div>
                {track.genre && (
                  <div className="text-xs text-slate-400 mt-1">Genre: {track.genre}</div>
                )}
              </div>

              {showPlayer ? (
                <div className="rounded-lg bg-black/30 p-4">
                  <div className="flex items-center gap-3">
                    <Button onClick={player.toggle} size="icon" className="rounded-full bg-emerald-500 hover:bg-emerald-600">
                      {player.isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : player.isPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </Button>
                    <div className="flex-1">
                      <div className="text-sm">
                        {owned ? 'Full track' : `${PREVIEW_SECONDS}-second preview`}
                      </div>
                      <div className="text-xs text-slate-400">
                        {Math.floor(player.elapsedSeconds)}s {!owned && `/ ${PREVIEW_SECONDS}s`}
                      </div>
                      <div className="h-1 mt-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 transition-all"
                          style={{ width: `${Math.min(100, player.progress * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-black/30 p-4 text-sm text-slate-400">
                  Preview isn't available for this seed yet.
                </div>
              )}

              <div className="flex flex-col gap-3 pt-2">
                {owned ? (
                  track.source === 'dj_track' && djAudioUrl ? (
                    <a href={djAudioUrl} download>
                      <Button className="bg-emerald-500 hover:bg-emerald-600">
                        <Download className="w-4 h-4 mr-2" /> Download
                      </Button>
                    </a>
                  ) : track.source === 'product' ? (
                    <>
                      <div className="text-sm text-emerald-400 font-medium">
                        ✓ Bestowed — thank you for supporting this sower
                      </div>
                      <Button onClick={handleDownload} disabled={downloading} className="bg-emerald-500 hover:bg-emerald-600 w-fit">
                        {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                        Download
                      </Button>
                    </>
                  ) : (
                    <div className="text-sm text-emerald-400 font-medium">
                      ✓ Bestowed — thank you for supporting this sower
                    </div>
                  )
                ) : (
                  <>
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Payment method
                    </div>
                    {belowCryptoMin && (
                      <p className="text-xs text-slate-400">
                        Crypto has a ${MIN_CRYPTO_BESTOWAL_USD} minimum — pay with PayPal for smaller amounts.
                      </p>
                    )}
                    <ProviderPicker
                      value={effectiveProvider}
                      onChange={setProvider}
                      amount={total}
                      mode="buyer"
                      disabled={isBuying}
                      providers={belowCryptoMin ? ['paypal'] : undefined}
                    />
                    {effectiveProvider === 'nowpayments' && (
                      <p className="text-xs text-slate-400">{CRYPTO_ROUNDING_NOTICE}</p>
                    )}
                    <Button onClick={handleBuy} disabled={isBuying} className="bg-rose-500 hover:bg-rose-600">
                      {isBuying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Heart className="w-4 h-4 mr-2" />}
                      Bestow ${total.toFixed(2)} USDC
                    </Button>
                    <div className="text-xs text-slate-400">
                      ${base.toFixed(2)} to the sower + ${s2gFee.toFixed(2)} Sow2Grow 15% (carried by you).
                      A whisperer share, when linked, comes out of the sower's ${base.toFixed(2)}.
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
