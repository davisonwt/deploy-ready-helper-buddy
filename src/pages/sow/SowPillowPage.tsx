import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { insertProduct } from '@/api/products';
import { getDefaultCompanyId } from '@/lib/products/getDefaultCompanyId';
import { priceBreakdown } from '@/lib/pricing/platformFee';
import { launchConfetti } from '@/utils/confetti';
import { toast } from 'sonner';

import CoverDropZone, { type CoverResult } from '@/components/sowing/CoverDropZone';
import OnePicker, { type OnePickerOption } from '@/components/sowing/OnePicker';
import SeedPreviewCard from '@/components/sowing/SeedPreviewCard';
import PlantButton from '@/components/sowing/PlantButton';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, ChevronDown, Eye, ImagePlus, X, Loader2 } from 'lucide-react';
import sowProductBanner from '@/assets/seeds-strip.jpg';
import { getPreset } from '@/lib/store/presets';

const PROPERTY_TYPE_OPTIONS: OnePickerOption[] = [
  { value: 'room', label: 'Room' },
  { value: 'guest-house', label: 'Guest house' },
  { value: 'farm', label: 'Farm stay' },
  { value: 'motel', label: 'Motel' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'bush-camp', label: 'Bush camp' },
  { value: 'other', label: 'Other' },
];

const AMENITY_OPTIONS = [
  { value: 'wifi', label: 'Wifi' },
  { value: 'breakfast', label: 'Breakfast included' },
  { value: 'parking', label: 'Parking' },
  { value: 'pool', label: 'Pool' },
  { value: 'aircon', label: 'Air conditioning' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'pet-friendly', label: 'Pet friendly' },
];

const RATE_UNITS = [
  { value: 'per_night', label: 'Per night' },
  { value: 'per_week', label: 'Per week' },
] as const;

const MAX_EXTRA_PHOTOS = 5;
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

function SowBanner() {
  const preset = getPreset('pillow');
  const bannerUrl = preset?.bannerImage ?? sowProductBanner;
  const accent = preset?.accent ?? '#d4af37';
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl mb-6 border aspect-[3.9/1]"
      style={{ borderColor: `${accent}73`, boxShadow: `0 0 40px ${accent}40` }}
    >
      <img src={bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover object-top" loading="eager" />
    </div>
  );
}

/** Same crop-to-square-JPEG-then-upload CoverDropZone uses internally, for the "up to 5 more photos" field. */
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

export default function SowPillowPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Direct-URL guard -- the chooser only links here once wandering_roles
  // has an active 'pillow' row, but a bookmark or a typed URL can reach
  // this page without that. Redirect straight to the unlock screen if so.
  const [roleChecked, setRoleChecked] = useState(false);
  const [baseTown, setBaseTown] = useState('');

  useEffect(() => {
    let alive = true;
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('wandering_roles')
        .select('base_town, status')
        .eq('user_id', user.id)
        .eq('role', 'pillow')
        .maybeSingle();
      if (!alive) return;
      if (!data || data.status !== 'active') {
        navigate('/register-wandering?role=pillow', { replace: true });
        return;
      }
      setBaseTown(data.base_town || '');
      setRoleChecked(true);
    })();
    return () => { alive = false; };
  }, [user, navigate]);

  const [cover, setCover] = useState<CoverResult | null>(null);
  const [extraPhotos, setExtraPhotos] = useState<CoverResult[]>([]);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [title, setTitle] = useState('');
  const [propertyType, setPropertyType] = useState<string | null>(null);
  const [customPropertyType, setCustomPropertyType] = useState('');
  const [sleeps, setSleeps] = useState<number | null>(null);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [rateAmount, setRateAmount] = useState<number | null>(null);
  const [rateUnit, setRateUnit] = useState<typeof RATE_UNITS[number]['value']>('per_night');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  // More options -- none of these can block Plant seed.
  const [moreOpen, setMoreOpen] = useState(false);
  const [amenitiesOther, setAmenitiesOther] = useState('');
  const [whispererPercent, setWhispererPercent] = useState<number | null>(null);
  const [tags, setTags] = useState('');

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

  // Location prefills from the sower's own Wandering base town, same as
  // Hand's fulfilment-note prefill -- never overwrites a value already typed.
  useEffect(() => {
    if (baseTown && !location) setLocation(baseTown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseTown]);

  const addExtraPhoto = async (file: File) => {
    if (extraPhotos.length >= MAX_EXTRA_PHOTOS || !user) return;
    setUploadingExtra(true);
    try {
      const cropped = await cropToSquare(file);
      if (cropped.size > MAX_PHOTO_SIZE_BYTES) {
        toast.error('That photo is too large — the limit is 10 MB.');
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
  const propertyTypeReady = !!propertyType && (propertyType !== 'other' || customPropertyType.trim().length > 0);
  const rateReady = rateAmount != null && rateAmount > 0;
  const locationReady = location.trim().length > 0;
  const descriptionReady = description.trim().length > 0;

  const completed = [coverReady, titleReady, propertyTypeReady, rateReady, locationReady, descriptionReady]
    .filter(Boolean).length;

  const missingReason = useMemo(() => {
    if (!coverReady) return 'Add a photo of the property to continue.';
    if (!titleReady) return 'Give it a title.';
    if (!propertyTypeReady) return propertyType === 'other' ? 'Type in your property type.' : 'Pick a property type.';
    if (!rateReady) return 'Set your rate.';
    if (!locationReady) return 'Add your location.';
    if (!descriptionReady) return 'Add a short description.';
    return undefined;
  }, [coverReady, titleReady, propertyTypeReady, rateReady, locationReady, descriptionReady, propertyType]);

  const handlePlant = async () => {
    if (!user) { toast.error('Please log in to sow.'); return; }
    if (completed < 6 || !cover) return;

    setSubmitting(true);
    try {
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

      const finalPropertyType = propertyType === 'other' ? customPropertyType.trim() : propertyType;
      const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);

      const service_details: Record<string, unknown> = {
        property_type: finalPropertyType,
        sleeps: sleeps,
        amenities,
        amenities_other: amenitiesOther.trim() || null,
        location: location.trim(),
        rate_unit: rateUnit,
        base_town: baseTown,
      };
      if (tagList.length) service_details.tags = tagList;

      // No file_url, no preview_url -- a Pillow seed is a service, not a
      // file. price is the rate amount; the unit lives in service_details.
      const inserted = await insertProduct({
        sower_id: sowerId,
        company_id: companyId,
        title: title.trim(),
        description: description.trim(),
        type: 'service',
        kind: 'pillow',
        category: finalPropertyType,
        license_type: 'bestowal',
        price: rateAmount,
        cover_image_url: cover.fileUrl,
        image_urls: [cover.fileUrl, ...extraPhotos.map((p) => p.fileUrl)],
        file_url: null,
        preview_url: null,
        service_details,
        has_whisperer: whispererPercent != null && whispererPercent > 0,
        whisperer_commission_percent: whispererPercent,
      });

      try { await (supabase.rpc as any)('add_xp_to_current_user', { amount: 100 }); } catch { /* best-effort */ }

      setCelebrate(true);
      launchConfetti();
      toast.success('Seed planted! 🌱');
      await new Promise((resolve) => setTimeout(resolve, 650));
      navigate(`/seed/pillow/${inserted.id}`);
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
        <p className="text-muted-foreground">Please log in to sow a Pillow seed.</p>
        <Button onClick={() => navigate('/login')}>Log in</Button>
      </div>
    );
  }

  if (!roleChecked) {
    return (
      <div className="container max-w-lg mx-auto px-4 py-16 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  const rateSplit = rateAmount != null && rateAmount > 0 ? priceBreakdown(rateAmount) : null;

  const previewCard = (
    <SeedPreviewCard
      title={title}
      description={description}
      coverUrl={cover?.fileUrl ?? null}
      price={rateAmount}
      isFree={false}
      type="service"
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

      <h1 className="text-2xl font-bold mb-4">🛏️ Sow a Pillow seed</h1>

      <SowBanner />

      <div className="grid md:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <CoverDropZone bucket="premium-room" pathPrefix={`covers/${user.id}`} onChange={setCover} required />
            <div className="flex-1">
              <Label htmlFor="pillow-title">Title</Label>
              <Input
                id="pillow-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What are you offering?"
                className="mt-1.5"
              />
            </div>
          </div>

          <OnePicker
            label="Property type"
            storageKey="sow:lastPropertyType"
            options={PROPERTY_TYPE_OPTIONS}
            value={propertyType}
            onChange={setPropertyType}
          />
          {propertyType === 'other' && (
            <Input
              value={customPropertyType}
              onChange={(e) => setCustomPropertyType(e.target.value)}
              placeholder="Describe your property"
              className="max-w-xs"
            />
          )}

          <div>
            <Label htmlFor="pillow-sleeps">Sleeps</Label>
            <Input
              id="pillow-sleeps"
              type="number"
              min="1"
              step="1"
              value={sleeps ?? ''}
              onChange={(e) => setSleeps(e.target.value === '' ? null : Math.max(1, Number(e.target.value)))}
              placeholder="Number of guests"
              className="mt-1.5 max-w-[160px]"
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Amenities</Label>
            <ToggleGroup type="multiple" value={amenities} onValueChange={setAmenities} className="justify-start flex-wrap">
              {AMENITY_OPTIONS.map((a) => (
                <ToggleGroupItem key={a.value} value={a.value} size="sm" variant="outline" className="px-3">
                  {a.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div>
            <Label htmlFor="pillow-location">Location / area</Label>
            <Input
              id="pillow-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Town or area guests will find you in"
              className="mt-1.5 max-w-md"
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Rate</Label>
            <div className="flex gap-2">
              <div className="relative flex-1 max-w-[160px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-6"
                  value={rateAmount ?? ''}
                  onChange={(e) => setRateAmount(e.target.value === '' ? null : Number(e.target.value))}
                />
              </div>
              <Select value={rateUnit} onValueChange={(v) => setRateUnit(v as typeof rateUnit)}>
                <SelectTrigger className="flex-1 max-w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RATE_UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {rateSplit
                ? `Bestowers pay $${rateSplit.total.toFixed(2)} (Sow2Grow's 15% fee is added on top, plus a small network fee). You receive the full $${rateSplit.base.toFixed(2)}.`
                : 'Set a rate to see what bestowers will pay.'}
            </p>
          </div>

          <div>
            <Label htmlFor="pillow-description">Description</Label>
            <Textarea
              id="pillow-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's it like to stay — a couple of lines."
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
                <Label htmlFor="pillow-amenities-other">Other amenities</Label>
                <Input
                  id="pillow-amenities-other"
                  value={amenitiesOther}
                  onChange={(e) => setAmenitiesOther(e.target.value)}
                  placeholder="Anything not listed above"
                  className="max-w-xs mt-1.5"
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

              {businesses.length > 1 && (
                <div>
                  <Label htmlFor="pillow-books">Books</Label>
                  <p className="text-xs text-muted-foreground mb-1.5">
                    Which of your businesses this seed's bookings go into. Can be changed later, until its first booking.
                  </p>
                  <Select value={selectedCompanyId ?? undefined} onValueChange={setSelectedCompanyId}>
                    <SelectTrigger id="pillow-books" className="max-w-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {businesses.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="pillow-whisperer">Whisperer commission %</Label>
                <p className="text-xs text-muted-foreground mb-1.5">
                  Comes out of your share, never added on top of what the buyer pays. Leave blank for none.
                </p>
                <Input
                  id="pillow-whisperer"
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
                <Label htmlFor="pillow-tags">Tags</Label>
                <Input
                  id="pillow-tags"
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

        <div className="hidden md:block">
          <div className="sticky top-6">{previewCard}</div>
        </div>
      </div>

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
