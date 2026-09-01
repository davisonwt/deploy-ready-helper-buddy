import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { insertProduct } from '@/api/products';
import { getDefaultCompanyId } from '@/lib/products/getDefaultCompanyId';
import { generateWatermarkedPreview } from '@/lib/media/generateWatermarkedPreview';
import { moderateStorageUpload } from '@/lib/moderation/moderateUpload';
import { priceBreakdown } from '@/lib/pricing/platformFee';
import { launchConfetti } from '@/utils/confetti';
import { toast } from 'sonner';

import SeedDropZone, { type SeedFileResult } from '@/components/sowing/SeedDropZone';
import PriceWithSplit from '@/components/sowing/PriceWithSplit';
import OnePicker, { type OnePickerOption } from '@/components/sowing/OnePicker';
import SeedPreviewCard from '@/components/sowing/SeedPreviewCard';
import PlantButton from '@/components/sowing/PlantButton';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, ChevronDown, Eye, Loader2 } from 'lucide-react';
import sowArtBanner from '@/assets/sow/art-banner.png';

const CATEGORIES: OnePickerOption[] = [
  'Painting', 'Photography', 'Digital art', 'Illustration', 'Drawing',
  'Sculpture', 'Print', 'Mixed media', 'Collage', 'Other',
].map((c) => ({ value: c.toLowerCase().replace(/\s+/g, '-'), label: c }));

const IMAGE_ACCEPT = '.jpg,.jpeg,.png,.gif,.webp';

type Licence = 'personal' | 'commercial' | 'print_rights';

const LICENCE_LABELS: Record<Licence, string> = {
  personal: 'Personal use',
  commercial: 'Commercial use',
  print_rights: 'Print rights',
};

function SowBanner() {
  return (
    <div
      className="relative w-full h-32 md:h-44 lg:h-56 overflow-hidden rounded-2xl mb-6 border"
      style={{ borderColor: 'rgba(217,70,239,0.45)', boxShadow: '0 0 40px rgba(217,70,239,0.25)' }}
    >
      <img src={sowArtBanner} alt="" className="absolute inset-0 w-full h-full object-cover object-right" loading="eager" />
    </div>
  );
}

export default function SowArtPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [seedFile, setSeedFile] = useState<SeedFileResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewGenerating, setPreviewGenerating] = useState(false);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState<number | null>(null);
  const [isFree, setIsFree] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [licence, setLicence] = useState<Licence>('personal');
  const [submitting, setSubmitting] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  // More options — none of these can block Plant seed.
  const [moreOpen, setMoreOpen] = useState(false);
  const [medium, setMedium] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [whispererPercent, setWhispererPercent] = useState<number | null>(null);
  const [tags, setTags] = useState('');
  const [explicit, setExplicit] = useState(false);

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

  // The watermarked preview generates client-side (canvas, no edge
  // function) as soon as the full-res upload finishes — same "eager, with
  // its own progress state" pattern as audio's 45s preview, just not
  // routed through generate-preview since that function is audio-only.
  // A failure here doesn't block Plant, same reasoning as 'preview_failed'
  // for audio: the full-res file already uploaded fine.
  useEffect(() => {
    let alive = true;
    if (!user || !seedFile || seedFile.previewStatus !== 'ready' || previewUrl) return;
    (async () => {
      setPreviewGenerating(true);
      try {
        const blob = await generateWatermarkedPreview(seedFile.file);
        const path = `previews/${user.id}/${Date.now()}.jpg`;
        const { error: uploadErr } = await supabase.storage.from('seed-previews').upload(path, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg',
        });
        if (uploadErr) throw uploadErr;
        const { verdict } = await moderateStorageUpload('seed-previews', path, 'image');
        if (verdict !== 'allow') {
          // Non-blocking preview, same as every other failure path here --
          // the full-res file (already scanned via SeedDropZone) is what
          // actually matters; just don't show a rejected watermark image.
          console.error('Watermarked preview rejected by moderation:', verdict);
          return;
        }
        const { data: pub } = supabase.storage.from('seed-previews').getPublicUrl(path);
        if (!alive) return;
        setPreviewUrl(pub.publicUrl);
      } catch (err) {
        console.error('Watermarked preview generation failed (non-blocking):', err);
      } finally {
        if (alive) setPreviewGenerating(false);
      }
    })();
    return () => { alive = false; };
  }, [seedFile, previewUrl, user]);

  const fileReady = !!seedFile && !!seedFile.fileUrl && seedFile.previewStatus === 'ready';
  const titleReady = title.trim().length > 0;
  const priceReady = isFree || (price != null && price > 0);
  const categoryReady = !!category;
  const descriptionReady = description.trim().length > 0;
  // Licence always has a value (defaults to personal) — a real puzzle
  // piece, but one that's satisfied from the start unless changed away.
  const licenceReady = !!licence;

  const completed = [fileReady, titleReady, priceReady, categoryReady, descriptionReady, licenceReady]
    .filter(Boolean).length;

  const missingReason = useMemo(() => {
    if (!fileReady) {
      if (seedFile?.fileUrl) return seedFile.previewMessage || 'This file needs a different format.';
      if (seedFile && ['reading', 'uploading'].includes(seedFile.previewStatus)) return 'Your image is uploading…';
      return 'Add your image to continue.';
    }
    if (!titleReady) return 'Give it a title.';
    if (!priceReady) return 'Set a price, or mark it free.';
    if (!categoryReady) return 'Pick a category.';
    if (!descriptionReady) return 'Add a short description.';
    return undefined;
  }, [fileReady, seedFile, titleReady, priceReady, categoryReady, descriptionReady]);

  const handlePlant = async () => {
    if (!user) { toast.error('Please log in to sow.'); return; }
    if (completed < 6 || !seedFile) return;

    setSubmitting(true);
    try {
      // Same sower-row resolution as UploadForm.tsx / SowMusicPage.tsx —
      // get-or-create.
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
      const metadata: Record<string, unknown> = { usage_license: licence };
      if (medium.trim()) metadata.medium = medium.trim();
      if (dimensions.trim()) metadata.dimensions = dimensions.trim();
      if (explicit) metadata.explicit = true;
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      if (tagList.length) metadata.tags = tagList;

      // The uploaded image doubles as its own cover — but never the
      // full-res original, which stays gated behind get-seed-file. The
      // watermarked preview (public, seed-previews) is what every card,
      // feed and this listing's own cover_image_url show; file_url (the
      // real upload, premium-room) is only ever reached through the same
      // purchase-gated function music's full track uses.
      const inserted = await insertProduct({
        sower_id: sowerId,
        company_id: companyId,
        title: title.trim(),
        description: description.trim(),
        type: 'art',
        kind: 'art',
        category,
        license_type: isFree ? 'free' : 'bestowal',
        price: totalPrice,
        cover_image_url: previewUrl,
        image_urls: previewUrl ? [previewUrl] : [],
        file_url: seedFile.fileUrl,
        preview_url: previewUrl,
        delivery_type: 'digital',
        has_whisperer: whispererPercent != null && whispererPercent > 0,
        whisperer_commission_percent: whispererPercent,
        metadata,
      });

      try { await (supabase.rpc as any)('add_xp_to_current_user', { amount: 100 }); } catch { /* best-effort */ }

      setCelebrate(true);
      launchConfetti();
      toast.success('Seed planted! 🌱');
      await new Promise((resolve) => setTimeout(resolve, 650));
      navigate(`/bulk/products/${inserted.id}`);
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
        <p className="text-muted-foreground">Please log in to sow your art.</p>
        <Button onClick={() => navigate('/login')}>Log in</Button>
      </div>
    );
  }

  const pathPrefix = `products/${user.id}`;

  const previewCard = (
    <SeedPreviewCard
      title={title}
      description={description}
      coverUrl={previewUrl ?? null}
      price={price}
      isFree={isFree}
      type="art"
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

      <h1 className="text-2xl font-bold mb-4">Sow your art</h1>

      <SowBanner />

      <div className="grid md:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-5">
          <div>
            <Label className="mb-1.5 block">Image</Label>
            <SeedDropZone
              kind="image"
              bucket="premium-room"
              pathPrefix={pathPrefix}
              accept={IMAGE_ACCEPT}
              allowedLabel="JPG, PNG, GIF or WEBP, up to 10 MB."
              onChange={(result) => { setSeedFile(result); setPreviewUrl(null); }}
            />
            {previewGenerating && (
              <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Making your watermarked preview…
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="sow-title">Title</Label>
            <Input
              id="sow-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's it called?"
              className="mt-1.5"
            />
          </div>

          <PriceWithSplit
            price={price}
            isFree={isFree}
            onChangePrice={setPrice}
            onChangeFree={setIsFree}
            label="Price"
          />

          <OnePicker
            label="Category"
            storageKey="sow:lastArtCategory"
            options={CATEGORIES}
            value={category}
            onChange={setCategory}
          />

          <div>
            <Label htmlFor="sow-description">Description</Label>
            <Textarea
              id="sow-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A couple of lines about the piece — more if you like."
              className="mt-1.5"
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Licence</Label>
            <RadioGroup value={licence} onValueChange={(v) => setLicence(v as Licence)} className="space-y-1.5">
              {(Object.keys(LICENCE_LABELS) as Licence[]).map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <RadioGroupItem value={key} id={`licence-${key}`} />
                  <Label htmlFor={`licence-${key}`} className="cursor-pointer font-normal">
                    {LICENCE_LABELS[key]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="px-0 text-muted-foreground">
                <ChevronDown className={`w-4 h-4 mr-1.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
                More options
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-3">
              <div>
                <Label htmlFor="sow-medium">Medium</Label>
                <Input
                  id="sow-medium"
                  value={medium}
                  onChange={(e) => setMedium(e.target.value)}
                  placeholder="e.g. Oil on canvas, digital, charcoal"
                  className="mt-1.5 max-w-xs"
                />
              </div>

              <div>
                <Label htmlFor="sow-dimensions">Dimensions</Label>
                <Input
                  id="sow-dimensions"
                  value={dimensions}
                  onChange={(e) => setDimensions(e.target.value)}
                  placeholder="e.g. 60cm × 80cm"
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

              <div>
                <Label htmlFor="sow-tags">Tags</Label>
                <Input
                  id="sow-tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Comma-separated"
                  className="mt-1.5 max-w-xs"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="sow-explicit" className="cursor-pointer">Explicit content</Label>
                  <p className="text-xs text-muted-foreground">Flags the piece for viewers who filter mature content.</p>
                </div>
                <Switch id="sow-explicit" checked={explicit} onCheckedChange={setExplicit} />
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-background border-t px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
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
