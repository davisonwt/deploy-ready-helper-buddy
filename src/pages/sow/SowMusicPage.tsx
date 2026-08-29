import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { insertProduct } from '@/api/products';
import { getDefaultCompanyId } from '@/lib/products/getDefaultCompanyId';
import { priceBreakdown } from '@/lib/pricing/platformFee';
import { launchConfetti } from '@/utils/confetti';
import { toast } from 'sonner';

import SeedDropZone, { type SeedFileResult } from '@/components/sowing/SeedDropZone';
import AlbumTrackList, { type AlbumTrack } from '@/components/sowing/AlbumTrackList';
import CoverDropZone, { type CoverResult } from '@/components/sowing/CoverDropZone';
import PriceWithSplit from '@/components/sowing/PriceWithSplit';
import OnePicker, { type OnePickerOption } from '@/components/sowing/OnePicker';
import SeedPreviewCard from '@/components/sowing/SeedPreviewCard';
import PlantButton from '@/components/sowing/PlantButton';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Music, Disc, ChevronDown, Eye } from 'lucide-react';
import sowMusicBanner from '@/assets/sow/music-banner.png';

const GENRES: OnePickerOption[] = [
  'Pop', 'Rock', 'Hip-Hop', 'R&B', 'Electronic', 'Dance', 'Indie', 'Folk',
  'Country', 'Jazz', 'Blues', 'Classical', 'Gospel', 'Reggae', 'Afrobeat',
  'Latin', 'Metal', 'Ambient', 'Soul', 'World', 'Other',
].map((g) => ({ value: g.toLowerCase(), label: g }));

const AUDIO_ACCEPT = '.wav,.mp3,.flac,.aac,.m4a,.ogg';
const ALBUM_MIN_TRACKS = 8;

type Mode = 'single' | 'album';

// Willow (the image companion) would normally weave this banner per spec,
// but companion-invoke needs a real signed-in user session and spends that
// user's own image-generation quota — not something to trigger from a
// build script. Using the existing warm, music-themed asset instead, in
// the same style as PageHeroBanner (src/components/chat/PageHeroBanner.tsx).
function SowBanner() {
  return (
    <div
      className="relative w-full h-32 md:h-44 lg:h-56 overflow-hidden rounded-2xl mb-6 border"
      style={{ borderColor: 'rgba(56,189,248,0.45)', boxShadow: '0 0 40px rgba(56,189,248,0.25)' }}
    >
      <img src={sowMusicBanner} alt="" className="absolute inset-0 w-full h-full object-cover object-right" loading="eager" />
    </div>
  );
}

export default function SowMusicPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('single');
  const [seedFile, setSeedFile] = useState<SeedFileResult | null>(null);
  const [tracks, setTracks] = useState<AlbumTrack[]>([]);
  const [cover, setCover] = useState<CoverResult | null>(null);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState<number | null>(null);
  const [isFree, setIsFree] = useState(false);
  const [genre, setGenre] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  // More options — none of these can block Plant seed.
  const [moreOpen, setMoreOpen] = useState(false);
  const [explicit, setExplicit] = useState(false);
  const [releaseDate, setReleaseDate] = useState('');
  const [whispererPercent, setWhispererPercent] = useState<number | null>(null);

  // Books field (spec-books.md §4) — only shown once there's a real choice
  // to make; with one business it's silent and the default set is used.
  const [businesses, setBusinesses] = useState<{ id: string; name: string; is_default: boolean }[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, name, is_default')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: true });
      if (!alive) return;
      const list = (data as any) ?? [];
      setBusinesses(list);
      setSelectedCompanyId((list.find((b: any) => b.is_default) ?? list[0])?.id ?? null);
    })();
    return () => { alive = false; };
  }, [user]);

  // Stable per-visit folder for album tracks — recomputed only if the user
  // never touches album mode, so it never collides across sessions.
  const albumSessionId = useMemo(() => Date.now(), []);

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setSeedFile(null);
    setTracks([]);
  };

  const albumTracksReady = tracks.length >= ALBUM_MIN_TRACKS && tracks.every((t) => t.status === 'ready');
  // 'preview_failed' still counts as ready: the track itself uploaded fine
  // and is a supported format — only the preview step failed for an
  // infrastructure reason, which shouldn't block planting a good seed.
  // 'unsupported' does NOT — that's the real "can't generate a preview at
  // all" policy block (spec-seed-protection.md).
  const fileReady = mode === 'album'
    ? albumTracksReady
    : !!seedFile && !!seedFile.fileUrl && (seedFile.previewStatus === 'ready' || seedFile.previewStatus === 'preview_failed');
  const coverReady = !!cover;
  const titleReady = title.trim().length > 0;
  const priceReady = isFree || (price != null && price > 0);
  const genreReady = !!genre;
  const descriptionReady = description.trim().length > 0;

  const completed = [fileReady, coverReady, titleReady, priceReady, genreReady, descriptionReady]
    .filter(Boolean).length;

  const missingReason = useMemo(() => {
    if (!fileReady) {
      if (mode === 'album') {
        if (tracks.length === 0) return 'Add your tracks to continue.';
        if (tracks.some((t) => t.status === 'error')) return 'Fix or remove the tracks that failed to upload.';
        if (tracks.some((t) => t.status === 'uploading')) return 'Tracks are still uploading…';
        const remaining = ALBUM_MIN_TRACKS - tracks.length;
        return `Add at least ${remaining} more track${remaining === 1 ? '' : 's'} — albums need ${ALBUM_MIN_TRACKS}+.`;
      }
      // A track already uploaded (fileUrl set) is never "add your track" —
      // the only way fileReady is still false with a fileUrl present is the
      // format-unsupported policy block ('unsupported'), so show its own
      // specific reason instead of the generic, misleading prompt.
      if (seedFile?.fileUrl) return seedFile.previewMessage || 'This file needs a different format for its preview.';
      if (seedFile && ['reading', 'uploading', 'generating'].includes(seedFile.previewStatus)) return 'Your track is uploading…';
      return 'Add your track to continue.';
    }
    if (!coverReady) return 'Add a cover to continue.';
    if (!titleReady) return 'Give it a title.';
    if (!priceReady) return 'Set a price, or mark it free.';
    if (!genreReady) return 'Pick a genre.';
    if (!descriptionReady) return 'Add a short description.';
    return undefined;
  }, [fileReady, mode, tracks, seedFile, coverReady, titleReady, priceReady, genreReady, descriptionReady]);

  const handlePlant = async () => {
    if (!user) { toast.error('Please log in to sow.'); return; }
    if (completed < 6 || !cover) return;
    if (mode === 'single' && !seedFile) return;
    if (mode === 'album' && !albumTracksReady) return;

    setSubmitting(true);
    try {
      // Same sower-row resolution as UploadForm.tsx — get-or-create.
      const { data: sowerData } = await supabase.from('sowers').select('id').eq('user_id', user.id).single();
      let sowerId = sowerData?.id as string | undefined;
      if (!sowerId) {
        const { data: profile } = await supabase.from('profiles').select('display_name').eq('user_id', user.id).single();
        const { data: newSower, error: createErr } = await supabase
          .from('sowers')
          .insert({ user_id: user.id, display_name: profile?.display_name || user.email?.split('@')[0] || 'Anonymous' })
          .select()
          .single();
        if (createErr) throw createErr;
        sowerId = newSower.id;
      }

      const companyId = selectedCompanyId ?? (await getDefaultCompanyId(sowerId));

      const totalPrice = isFree ? 0 : priceBreakdown(price!).total;
      const metadata: Record<string, unknown> = {};
      if (explicit) metadata.explicit = true;
      if (releaseDate) metadata.release_date = releaseDate;

      let fileUrl: string;
      let duration: number | null = null;
      let previewUrl: string | null = null;

      if (mode === 'album') {
        // Same shape the old album upload form wrote: one products row,
        // file_url pointing at a manifest.json of individually-uploaded
        // tracks. isAlbum() recognises this from the manifest.json file_url
        // alone; metadata.is_album is set too, for good measure.
        metadata.is_album = true;
        const manifest = {
          type: 'album',
          createdAt: new Date().toISOString(),
          cover: cover.fileUrl,
          tracks: tracks.map((t) => ({ name: t.name, size: t.size, path: t.path, url: t.url, price: t.price ?? undefined })),
        };
        const manifestBlob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
        const manifestPath = `products/${user.id}/${albumSessionId}/manifest.json`;
        const { error: manifestErr } = await supabase.storage
          .from('premium-room')
          .upload(manifestPath, manifestBlob, { contentType: 'application/json' });
        if (manifestErr) throw manifestErr;
        const { data: manifestUrl } = supabase.storage.from('premium-room').getPublicUrl(manifestPath);
        fileUrl = manifestUrl.publicUrl;
      } else {
        fileUrl = seedFile!.fileUrl;
        duration = seedFile!.duration ? Math.round(seedFile!.duration) : null;
        previewUrl = seedFile!.previewUrl ?? null;
      }

      const inserted = await insertProduct({
        sower_id: sowerId,
        company_id: companyId,
        title: title.trim(),
        description: description.trim(),
        type: 'music',
        category: genre,
        music_genre: genre,
        license_type: isFree ? 'free' : 'bestowal',
        price: totalPrice,
        cover_image_url: cover.fileUrl,
        file_url: fileUrl,
        preview_url: previewUrl,
        duration,
        delivery_type: 'digital',
        has_whisperer: whispererPercent != null && whispererPercent > 0,
        whisperer_commission_percent: whispererPercent,
        metadata,
      });

      try { await (supabase.rpc as any)('add_xp_to_current_user', { amount: 100 }); } catch { /* best-effort */ }

      // The 6th puzzle piece was already in (Plant is disabled until then) —
      // play its shimmer alongside the confetti, then give it a beat to be
      // seen before the page changes out from under it.
      setCelebrate(true);
      launchConfetti();
      toast.success('Seed planted! 🌱');
      await new Promise((resolve) => setTimeout(resolve, 650));
      navigate(`/music-track/${inserted.id}`);
    } catch (e: any) {
      console.error('Plant seed error', e);
      toast.error(e?.message ?? 'Could not plant this seed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="container max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-muted-foreground">Please log in to sow a song.</p>
        <Button onClick={() => navigate('/login')}>Log in</Button>
      </div>
    );
  }

  const pathPrefix = `products/${user.id}`;
  const albumPathPrefix = `products/${user.id}/${albumSessionId}`;

  const previewCard = (
    <SeedPreviewCard
      title={title}
      description={description}
      coverUrl={cover?.fileUrl ?? null}
      price={price}
      isFree={isFree}
      type="music"
      isAlbum={mode === 'album'}
      completedPieces={completed}
      celebrate={celebrate}
    />
  );

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 md:py-8 pb-28 md:pb-8">
      <Button variant="ghost" size="sm" onClick={() => navigate('/sow')} className="mb-4 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <h1 className="text-2xl font-bold mb-4">{mode === 'album' ? 'Sow an album' : 'Sow a song'}</h1>

      <SowBanner />

      <div className="grid md:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-5">
          <div>
            <Label className="mb-1.5 block">Single or album?</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => switchMode('single')}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-colors
                  ${mode === 'single' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60'}`}
              >
                <Music className="w-4 h-4" /> Single track
              </button>
              <button
                type="button"
                onClick={() => switchMode('album')}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-medium transition-colors
                  ${mode === 'album' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60'}`}
              >
                <Disc className="w-4 h-4" /> Album
              </button>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <CoverDropZone bucket="premium-room" pathPrefix={`covers/${user.id}`} onChange={setCover} required />
            <div className="flex-1">
              <Label htmlFor="sow-title">Title</Label>
              <Input
                id="sow-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's it called?"
                className="mt-1.5"
              />
            </div>
          </div>

          {mode === 'album' ? (
            <div>
              <Label className="mb-1.5 block">Tracks</Label>
              <AlbumTrackList
                bucket="premium-room"
                pathPrefix={albumPathPrefix}
                allowedLabel={`WAV, MP3, FLAC, AAC, M4A, or OGG — at least ${ALBUM_MIN_TRACKS} tracks`}
                onChange={setTracks}
              />
            </div>
          ) : (
            <div>
              <Label className="mb-1.5 block">Track</Label>
              <SeedDropZone
                kind="audio"
                bucket="premium-room"
                pathPrefix={pathPrefix}
                generatePreview
                accept={AUDIO_ACCEPT}
                allowedLabel="WAV or MP3 for an automatic 45-second preview. Other formats can still be uploaded through the classic form."
                onChange={setSeedFile}
              />
            </div>
          )}

          <PriceWithSplit
            price={price}
            isFree={isFree}
            onChangePrice={setPrice}
            onChangeFree={setIsFree}
            label={mode === 'album' ? 'Album price' : 'Price'}
          />

          <OnePicker
            label="Genre"
            storageKey="sow:lastGenre"
            options={GENRES}
            value={genre}
            onChange={setGenre}
          />

          <div>
            <Label htmlFor="sow-description">Description</Label>
            <Textarea
              id="sow-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A couple of lines about the song — more if you like."
              className="mt-1.5"
            />
          </div>

          <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="px-0 text-muted-foreground">
                <ChevronDown className={`w-4 h-4 mr-1.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
                More options
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sow-explicit" className="cursor-pointer">Explicit content</Label>
                  <p className="text-xs text-muted-foreground">Flags the track for listeners who filter explicit lyrics.</p>
                </div>
                <Switch id="sow-explicit" checked={explicit} onCheckedChange={setExplicit} />
              </div>

              <div>
                <Label htmlFor="sow-release-date">Release date</Label>
                <Input
                  id="sow-release-date"
                  type="date"
                  value={releaseDate}
                  onChange={(e) => setReleaseDate(e.target.value)}
                  className="mt-1.5 max-w-xs"
                />
              </div>

              {businesses.length > 1 && (
                <div>
                  <Label htmlFor="sow-books">Books</Label>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Which of your businesses this seed's sales go into. Can be changed later, until its first sale.
                  </p>
                  <Select value={selectedCompanyId ?? undefined} onValueChange={setSelectedCompanyId}>
                    <SelectTrigger id="sow-books" className="max-w-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {businesses.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="sow-whisperer">Whisperer commission %</Label>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Comes out of your share, never added on top of what the buyer pays. Leave blank for none.
                </p>
                <Input
                  id="sow-whisperer"
                  type="number"
                  min="0"
                  max="30"
                  step="1"
                  value={whispererPercent ?? ''}
                  onChange={(e) => setWhispererPercent(e.target.value === '' ? null : Number(e.target.value))}
                  className="max-w-xs"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="hidden md:block pt-2">
            <PlantButton
              requiredCount={6}
              completedCount={completed}
              missingReason={missingReason}
              submitting={submitting}
              onClick={handlePlant}
            />
          </div>
        </div>

        {/* Desktop: sticky preview column */}
        <div className="hidden md:block">
          <div className="sticky top-6">{previewCard}</div>
        </div>
      </div>

      {/* Mobile: sticky bottom sheet + inline Plant */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-background border-t p-3 space-y-2">
        <Sheet>
          <SheetTrigger asChild>
            <button type="button" className="w-full flex items-center gap-2 text-xs text-muted-foreground">
              <Eye className="w-3.5 h-3.5" /> Preview how it will look
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
            {previewCard}
          </SheetContent>
        </Sheet>
        <PlantButton
          requiredCount={6}
          completedCount={completed}
          missingReason={missingReason}
          submitting={submitting}
          onClick={handlePlant}
        />
      </div>
    </div>
  );
}
