import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { insertProduct } from '@/api/products';
import { getDefaultCompanyId } from '@/lib/products/getDefaultCompanyId';
import { priceBreakdown } from '@/lib/pricing/platformFee';
import { launchConfetti } from '@/utils/confetti';
import { toast } from 'sonner';

import CoverDropZone, { type CoverResult } from '@/components/sowing/CoverDropZone';
import PriceWithSplit from '@/components/sowing/PriceWithSplit';
import OnePicker, { type OnePickerOption } from '@/components/sowing/OnePicker';
import SeedPreviewCard from '@/components/sowing/SeedPreviewCard';
import PlantButton from '@/components/sowing/PlantButton';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, ChevronDown, Eye, ImagePlus, X, Loader2, Wheat, Flame, Hammer, Package, Check } from 'lucide-react';
import sowProductBanner from '@/assets/sow/field-sow-banner.png';
import { saveBusinessKind, productKindForBusinessKind, BUSINESS_KIND_OPTIONS, type BusinessKind } from '@/lib/store/businessKind';
import { getPreset } from '@/lib/store/presets';

// Field/Hearth/Forge are BUSINESS types (companies.kind), not a per-seed
// choice — a farmer is a Field business, everything they sow inherits it.
// `Kind` here is the resulting products.kind value; 'product' covers both
// a Shop business and the ?kind= override's own literal 'product' value.
type Kind = 'field' | 'hearth' | 'forge' | 'product';
const KINDS: Kind[] = ['field', 'hearth', 'forge', 'product'];

const BUSINESS_KIND_ICONS: Record<BusinessKind, React.ComponentType<{ className?: string }>> = {
  field: Wheat, hearth: Flame, forge: Hammer, shop: Package,
};

function toOptions(labels: string[]): OnePickerOption[] {
  return labels.map((l) => ({ value: l.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label: l }));
}

// Hearth = home-made goods (crafts, cakes, jams, chutneys) — never
// "Creations" (that's Music/Art/Books). General has no fixed list; it's
// free text, since shop stock spans everything.
const CATEGORY_OPTIONS_BY_KIND: Record<Exclude<Kind, 'product'>, OnePickerOption[]> = {
  field: toOptions(['Vegetables', 'Fruit', 'Eggs', 'Dairy', 'Meat', 'Honey', 'Plants']),
  hearth: toOptions(['Baked goods', 'Preserves', 'Crafts', 'Candles', 'Soap', 'Clothing']),
  forge: toOptions(['Metalwork', 'Woodwork', 'Leather', 'Repairs', 'Custom']),
};

const MAX_EXTRA_PHOTOS = 5;
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

const BANNER_TITLE: Record<Kind, string> = {
  field: 'Sow from the field',
  hearth: 'Sow from the hearth',
  forge: 'Sow from the forge',
  product: 'Sow physical goods',
};

const FALLBACK_ACCENT = '#ea580c';

// Field/Hearth/Forge get their business kind's real preset banner (real
// artwork landed for all three now). Shop and an unresolved kind (no
// preset object exists for either) fall back to field-sow-banner.png —
// a generic "goods" photo, not seeds-strip.jpg.
function SowBanner({ kind }: { kind: Kind | null }) {
  const preset = kind && kind !== 'product' ? getPreset(kind) : null;
  const bannerUrl = preset?.bannerImage ?? sowProductBanner;
  const accent = preset?.bannerImage ? preset.accent : FALLBACK_ACCENT;
  return (
    <div
      className="relative w-full h-32 md:h-44 lg:h-56 overflow-hidden rounded-2xl mb-6 border"
      style={{ borderColor: `${accent}73`, boxShadow: `0 0 40px ${accent}40` }}
    >
      <img src={bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover object-right" loading="eager" />
    </div>
  );
}

/** Same crop-to-square-JPEG-then-upload CoverDropZone uses internally, for the "up to 5 more photos" field — those aren't the required cover, just extra gallery shots. */
function cropToSquare(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - side) / 2;
      const sy = (img.naturalHeight - side) / 2;
      const canvas = document.createElement('canvas');
      canvas.width = side;
      canvas.height = side;
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('canvas unavailable')); return; }
      ctx.drawImage(img, sx, sy, side, side, 0, 0, side, side);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) resolve(blob); else reject(new Error('crop failed'));
      }, 'image/jpeg', 0.9);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('could not read image')); };
    img.src = url;
  });
}

export default function SowProductPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ?kind= still works as an override — mostly for testing/deep-links now
  // that the tile picker is gone; the real source is the business's own
  // companies.kind.
  const urlKind = (() => {
    const q = searchParams.get('kind');
    return (KINDS as string[]).includes(q ?? '') ? (q as Kind) : null;
  })();

  // The one-time choice for a business that has no kind yet — asked
  // inline, saved to the business on Plant (never re-asked afterward).
  const [chosenBusinessKind, setChosenBusinessKind] = useState<BusinessKind | null>(null);

  const [cover, setCover] = useState<CoverResult | null>(null);
  const [extraPhotos, setExtraPhotos] = useState<CoverResult[]>([]);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState<number | null>(null);
  const [isFree, setIsFree] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [stock, setStock] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  // More options — none of these can block Plant seed.
  const [moreOpen, setMoreOpen] = useState(false);
  const [sku, setSku] = useState('');
  const [weightSize, setWeightSize] = useState('');
  const [fulfilmentNote, setFulfilmentNote] = useState('');
  const [fulfilmentTouched, setFulfilmentTouched] = useState(false);
  const [whispererPercent, setWhispererPercent] = useState<number | null>(null);
  const [tags, setTags] = useState('');
  const [leadTimeDays, setLeadTimeDays] = useState<number | null>(null);

  // Books field (spec-books.md §4) — only shown once there's a real choice
  // to make; with one business it's silent and the default set is used.
  // Also carries collect_address (fulfilment note prefill) and kind (the
  // seed's own kind now comes from here, not a per-seed tile picker).
  const [businesses, setBusinesses] = useState<{ id: string; name: string; is_default: boolean; collect_address: string | null; kind: BusinessKind | null }[]>([]);
  const [businessesLoaded, setBusinessesLoaded] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, name, is_default, collect_address, kind')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: true });
      if (!alive) return;
      const list = (data as any) ?? [];
      setBusinesses(list);
      setSelectedCompanyId((list.find((b: any) => b.is_default) ?? list[0])?.id ?? null);
      setBusinessesLoaded(true);
    })();
    return () => { alive = false; };
  }, [user]);

  const selectedBusiness = businesses.find((b) => b.id === selectedCompanyId) ?? null;
  const businessKind: BusinessKind | null = selectedBusiness?.kind ?? null;

  // Precedence: ?kind= override > the business's own saved kind > the
  // one-time inline choice below (not yet saved to the business).
  const kind: Kind | null = urlKind
    ?? (businessKind ? productKindForBusinessKind(businessKind) : null)
    ?? (chosenBusinessKind ? productKindForBusinessKind(chosenBusinessKind) : null);

  const needsBusinessKindPicker = businessesLoaded && !urlKind && !businessKind && !!selectedCompanyId;

  // Switching business (Books field) re-evaluates everything above —
  // drop any not-yet-saved choice and the category, which belonged to
  // the previous business's kind.
  useEffect(() => {
    setChosenBusinessKind(null);
    setCategory(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanyId]);

  // "Collect from {business collect_address}" — prefilled once the
  // selected business is known, but never overwrites a note the sower
  // already typed themselves.
  useEffect(() => {
    if (fulfilmentTouched) return;
    const biz = businesses.find((b) => b.id === selectedCompanyId);
    if (biz?.collect_address) setFulfilmentNote(`Collect from ${biz.collect_address}`);
  }, [businesses, selectedCompanyId, fulfilmentTouched]);

  const addExtraPhoto = async (file: File) => {
    if (extraPhotos.length >= MAX_EXTRA_PHOTOS || !user) return;
    setUploadingExtra(true);
    try {
      const cropped = await cropToSquare(file);
      if (cropped.size > MAX_PHOTO_SIZE_BYTES) {
        toast.error(`That photo is too large — the limit is 10 MB.`);
        return;
      }
      const path = `covers/${user.id}/extra-${Date.now()}.jpg`;
      const { error: uploadErr } = await supabase.storage.from('premium-room').upload(path, cropped, {
        cacheControl: '3600',
        contentType: 'image/jpeg',
        upsert: false,
      });
      if (uploadErr) throw uploadErr;
      const { data: pub } = supabase.storage.from('premium-room').getPublicUrl(path);
      setExtraPhotos((prev) => [...prev, { fileUrl: pub.publicUrl, storagePath: path }]);
    } catch (err) {
      console.error('Extra photo upload failed:', err);
      toast.error('Could not upload that photo. Please try again.');
    } finally {
      setUploadingExtra(false);
    }
  };

  const removeExtraPhoto = (index: number) => {
    setExtraPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const coverReady = !!cover;
  const titleReady = title.trim().length > 0;
  const priceReady = isFree || (price != null && price > 0);
  // Needs a resolved kind first — the category list depends on it.
  const categoryReady = kind !== null && !!category;
  // Blank means "not tracked" — a legitimate final value for the column,
  // but the puzzle piece needs an explicit choice, including 0.
  const stockReady = stock !== null;
  const descriptionReady = description.trim().length > 0;

  const completed = [coverReady, titleReady, priceReady, categoryReady, stockReady, descriptionReady]
    .filter(Boolean).length;

  const missingReason = useMemo(() => {
    if (kind === null) return 'Choose what kind of business this is, above.';
    if (!coverReady) return 'Add a photo to continue.';
    if (!titleReady) return 'Give it a title.';
    if (!priceReady) return 'Set a price, or mark it free.';
    if (!categoryReady) return 'Pick a category.';
    if (!stockReady) return 'Set how many you have — 0 for out of stock, or leave it for "not tracked" after planting.';
    if (!descriptionReady) return 'Add a short description.';
    return undefined;
  }, [kind, coverReady, titleReady, priceReady, categoryReady, stockReady, descriptionReady]);

  const handlePlant = async () => {
    if (!user) { toast.error('Please log in to sow.'); return; }
    if (completed < 6 || !cover || !kind) return;

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

      // First time this business has planted anything from here — the
      // inline picker's choice becomes the business's own kind, once,
      // never re-asked (spec-sowing-forms.md, revised).
      if (chosenBusinessKind && companyId) {
        await saveBusinessKind(companyId, chosenBusinessKind);
      }

      const totalPrice = isFree ? 0 : priceBreakdown(price!).total;
      const metadata: Record<string, unknown> = {};
      if (weightSize.trim()) metadata.weight_size = weightSize.trim();
      if (fulfilmentNote.trim()) metadata.fulfilment_note = fulfilmentNote.trim();
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
      if (tagList.length) metadata.tags = tagList;
      if (kind === 'forge' && leadTimeDays != null) metadata.lead_time_days = leadTimeDays;

      // No file_url, no preview_url — a physical seed has nothing digital
      // to gate behind get-seed-file. The photo is fully public, like
      // every other product's cover. `type` stays 'product' for every
      // kind (matches the one legacy physical-goods row); `kind` is
      // inherited from the business's own companies.kind, resolved above.
      const inserted = await insertProduct({
        sower_id: sowerId,
        company_id: companyId,
        title: title.trim(),
        description: description.trim(),
        type: 'product',
        kind,
        category,
        license_type: isFree ? 'free' : 'bestowal',
        price: totalPrice,
        cover_image_url: cover.fileUrl,
        image_urls: [cover.fileUrl, ...extraPhotos.map((p) => p.fileUrl)],
        stock,
        sku: sku.trim() || null,
        delivery_type: 'physical',
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
      // The (company_id, sku) unique index — a plain Postgres error reads
      // as noise to a sower; this is the one conflict worth naming.
      if (e?.code === '23505' && /sku/i.test(e?.message ?? '')) {
        toast.error("That SKU is already used by another item in this business — pick a different one.");
      } else {
        toast.error(e?.message ?? 'Could not plant this seed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="container max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-muted-foreground">Please log in to sow a product.</p>
        <Button onClick={() => navigate('/login')}>Log in</Button>
      </div>
    );
  }

  const previewCard = (
    <SeedPreviewCard
      title={title}
      description={description}
      coverUrl={cover?.fileUrl ?? null}
      price={price}
      isFree={isFree}
      type="product"
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

      <h1 className="text-2xl font-bold mb-4">{kind ? BANNER_TITLE[kind] : BANNER_TITLE.product}</h1>

      <SowBanner kind={kind} />

      <div className="grid md:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-5">
          {needsBusinessKindPicker && (
            <div>
              <Label className="mb-1.5 block">What kind of business is this?</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Asked once — everything {selectedBusiness?.name ?? 'this business'} sows will be this kind from now on.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {BUSINESS_KIND_OPTIONS.map((opt) => {
                  const Icon = BUSINESS_KIND_ICONS[opt.value];
                  const selected = chosenBusinessKind === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setChosenBusinessKind(opt.value)}
                      className={`relative flex flex-col items-center justify-center gap-1 rounded-xl border-2 p-3 text-center transition-all
                        ${selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/60 hover:bg-muted/50'}`}
                    >
                      {selected && <Check className="absolute top-1.5 right-1.5 w-3.5 h-3.5 text-primary" />}
                      <Icon className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium">{opt.label}</span>
                      <span className="text-[11px] text-muted-foreground leading-tight">{opt.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

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

          <PriceWithSplit
            price={price}
            isFree={isFree}
            onChangePrice={setPrice}
            onChangeFree={setIsFree}
            label="Price"
          />

          {kind && (kind === 'product' ? (
            <div>
              <Label htmlFor="sow-category">Category</Label>
              <Input
                id="sow-category"
                value={category ?? ''}
                onChange={(e) => setCategory(e.target.value || null)}
                placeholder="e.g. Home & Kitchen"
                className="mt-1.5"
              />
            </div>
          ) : (
            <OnePicker
              label="Category"
              storageKey={`sow:lastProductCategory:${kind}`}
              options={CATEGORY_OPTIONS_BY_KIND[kind]}
              value={category}
              onChange={setCategory}
            />
          ))}

          <div>
            <Label htmlFor="sow-stock">Stock</Label>
            <p className="text-xs text-muted-foreground mb-1.5">
              How many you have. 0 shows as "Out of stock" — buyers still see the listing.
            </p>
            <Input
              id="sow-stock"
              type="number"
              min="0"
              step="1"
              value={stock ?? ''}
              onChange={(e) => setStock(e.target.value === '' ? null : Math.max(0, Number(e.target.value)))}
              className="max-w-xs"
            />
          </div>

          <div>
            <Label htmlFor="sow-description">Description</Label>
            <Textarea
              id="sow-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A couple of lines about the product — more if you like."
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
              <div>
                <Label htmlFor="sow-sku">SKU</Label>
                <p className="text-xs text-muted-foreground mb-1.5">Must be unique within your business, if you set one.</p>
                <Input
                  id="sow-sku"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Optional"
                  className="max-w-xs"
                />
              </div>

              <div>
                <Label className="mb-1.5 block">More photos</Label>
                <div className="flex flex-wrap gap-2">
                  {extraPhotos.map((p, i) => (
                    <div key={p.storagePath} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                      <img src={p.fileUrl} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeExtraPhoto(i)}
                        className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {extraPhotos.length < MAX_EXTRA_PHOTOS && (
                    <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/60 flex items-center justify-center cursor-pointer">
                      {uploadingExtra ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      ) : (
                        <ImagePlus className="w-4 h-4 text-muted-foreground" />
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingExtra}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) addExtraPhoto(f); e.target.value = ''; }}
                      />
                    </label>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Up to {MAX_EXTRA_PHOTOS} more, alongside the main photo.</p>
              </div>

              {kind === 'forge' && (
                <div>
                  <Label htmlFor="sow-lead-time">Made to order — lead time (days)</Label>
                  <Input
                    id="sow-lead-time"
                    type="number"
                    min="0"
                    step="1"
                    value={leadTimeDays ?? ''}
                    onChange={(e) => setLeadTimeDays(e.target.value === '' ? null : Math.max(0, Number(e.target.value)))}
                    placeholder="Optional"
                    className="max-w-xs"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="sow-weight-size">Weight / size</Label>
                <Input
                  id="sow-weight-size"
                  value={weightSize}
                  onChange={(e) => setWeightSize(e.target.value)}
                  placeholder="e.g. 2kg, or Large"
                  className="mt-1.5 max-w-xs"
                />
              </div>

              <div>
                <Label htmlFor="sow-fulfilment">Fulfilment note</Label>
                <Textarea
                  id="sow-fulfilment"
                  rows={2}
                  value={fulfilmentNote}
                  onChange={(e) => { setFulfilmentNote(e.target.value); setFulfilmentTouched(true); }}
                  placeholder="How buyers get this from you"
                  className="mt-1.5"
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
