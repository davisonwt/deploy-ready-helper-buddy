import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { insertProduct, updateProduct } from '@/api/products';
import { getDefaultCompanyId } from '@/lib/products/getDefaultCompanyId';
import { launchConfetti } from '@/utils/confetti';
import { toast } from 'sonner';

import CoverDropZone, { type CoverResult } from '@/components/sowing/CoverDropZone';
import PlantButton from '@/components/sowing/PlantButton';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ImagePlus, X, Loader2, Check } from 'lucide-react';
import sowProductBanner from '@/assets/seeds-strip.jpg';
import { getPreset } from '@/lib/store/presets';

import SignedImg from '@/components/media/SignedImg';
import {
  LEGACY_RATE_UNIT, OPERATOR_LICENCE_CONFIRMATION, PRIMARY_RATE_ORDER,
  RATE_PERIODS, USE_TAGS, VEHICLE_BRANCH, VEHICLE_TYPES,
  type UseTag, type VehicleType,
} from '@/lib/sleeping/wheelOptions';

const MAX_EXTRA_PHOTOS = 5;
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

function SowBanner() {
  const preset = getPreset('wheel');
  const bannerUrl = preset?.bannerImage ?? sowProductBanner;
  const accent = preset?.accent ?? '#ea580c';
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl mb-6 border aspect-[3.9/1]"
      style={{ borderColor: `${accent}73`, boxShadow: `0 0 40px ${accent}40` }}
    >
      <img src={bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover object-top" loading="eager" />
    </div>
  );
}

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

type RateState = Record<string, string>;

/**
 * Register a vehicle with a driver.
 *
 * ONE flow for every vehicle type. Picking the type changes which uses and
 * which rate periods are offered first (see VEHICLE_BRANCH); it never
 * sends the person to a different form. Everything else is identical for a
 * car and for a harvester.
 *
 * A Wheel seed stays a row in `products` (type=service, kind=wheel) so the
 * existing booking path and the 85/15 split keep working untouched. The
 * structured detail lives alongside it in `wheel_seed_details`.
 */
export default function SowWheelPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Edit mode. /sow/wheel?edit=<product id> loads an existing listing into
  // this same form. There is deliberately no second editor: a separate form
  // is how wheel_seed_details fields got silently dropped by EditForm.
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const isEdit = !!editId;
  const [loadingExisting, setLoadingExisting] = useState(!!editId);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [roleChecked, setRoleChecked] = useState(false);
  const [baseTown, setBaseTown] = useState('');
  const [roleLat, setRoleLat] = useState<number | null>(null);
  const [roleLng, setRoleLng] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('wandering_roles')
        .select('base_town, lat, lng, status')
        .eq('user_id', user.id)
        .eq('role', 'wheel')
        .maybeSingle();
      if (!alive) return;
      if (!data || data.status !== 'active') {
        navigate('/register-wandering?role=wheel', { replace: true });
        return;
      }
      setBaseTown((data as any).base_town || '');
      setRoleLat((data as any).lat ?? null);
      setRoleLng((data as any).lng ?? null);
      setRoleChecked(true);
    })();
    return () => { alive = false; };
  }, [user, navigate]);

  // --- the form -------------------------------------------------------------
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [cover, setCover] = useState<CoverResult | null>(null);
  const [extraPhotos, setExtraPhotos] = useState<CoverResult[]>([]);
  const [uploadingExtra, setUploadingExtra] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<UseTag[]>([]);
  const [showAllTags, setShowAllTags] = useState(false);
  const [rates, setRates] = useState<RateState>({});
  const [showAllRates, setShowAllRates] = useState(false);
  const [currency, setCurrency] = useState('');
  const [currencyReady, setCurrencyReady] = useState(false);
  const [baseLocation, setBaseLocation] = useState('');
  const [available, setAvailable] = useState(true);
  const [licenceConfirmed, setLicenceConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  /** Edit mode: the coordinates already saved, reused when the town is unchanged. */
  const [existingLat, setExistingLat] = useState<number | null>(null);
  const [existingLng, setExistingLng] = useState<number | null>(null);
  const [loadedLocation, setLoadedLocation] = useState<string | null>(null);

  useEffect(() => {
    // Only prefill from the wandering role when creating. In edit mode the
    // listing's own saved location wins.
    if (!isEdit && baseTown && !baseLocation) setBaseLocation(baseTown);
  }, [isEdit, baseTown, baseLocation]);

  // --- edit mode: load the existing listing -------------------------------
  useEffect(() => {
    let alive = true;
    if (!editId || !user) return;
    (async () => {
      try {
        const { data: product, error: pErr } = await supabase
          .from('products')
          .select('*, sowers!inner(user_id)')
          .eq('id', editId)
          .single();
        if (pErr) throw pErr;
        if (!alive) return;

        if ((product as any)?.sowers?.user_id !== user.id) {
          toast.error('That listing is not yours to edit.');
          navigate('/my-listings', { replace: true });
          return;
        }
        if ((product as any).kind !== 'wheel') {
          toast.error('That listing is not a vehicle.');
          navigate('/my-listings', { replace: true });
          return;
        }

        const { data: detail } = await supabase
          .from('wheel_seed_details')
          .select('*')
          .eq('product_id', editId)
          .maybeSingle();

        if (!alive) return;
        const p = product as any;
        const d = (detail ?? {}) as any;

        setTitle(p.title ?? '');
        setDescription(p.description ?? '');
        if (p.cover_image_url) setCover({ fileUrl: p.cover_image_url, storagePath: '' });
        const extras: CoverResult[] = ((p.image_urls ?? []) as string[])
          .filter((u) => u && u !== p.cover_image_url)
          .map((u) => ({ fileUrl: u, storagePath: '' }));
        setExtraPhotos(extras);

        setVehicleType((d.vehicle_type ?? p.category ?? null) as VehicleType | null);
        setTags((d.use_tags ?? []) as UseTag[]);
        if (d.currency) setCurrency(String(d.currency).toUpperCase());
        setCurrencyReady(true);
        const savedLocation = d.base_location ?? p.service_details?.base_town ?? '';
        setBaseLocation(savedLocation);
        setLoadedLocation(savedLocation);
        setExistingLat(d.base_lat ?? null);
        setExistingLng(d.base_lng ?? null);
        setAvailable(d.availability !== false);
        // The confirmation was given when the listing was created. It stays
        // required, and stays ticked, so an edit cannot quietly drop it.
        setLicenceConfirmed(true);

        const loaded: RateState = {};
        for (const col of ['rate_per_trip', 'rate_hourly', 'rate_per_km', 'rate_daily', 'rate_weekly', 'rate_monthly']) {
          if (d[col] != null) loaded[col] = String(Number(d[col]));
        }
        // A listing with no detail row still has its legacy single rate.
        if (Object.keys(loaded).length === 0 && p.price != null) loaded.rate_per_trip = String(Number(p.price));
        setRates(loaded);
        setShowAllRates(true);
        setShowAllTags(true);
      } catch (e: any) {
        if (!alive) return;
        console.error('[SowWheelPage] could not load listing for edit', e);
        setLoadError(e?.message ?? 'Could not load that listing.');
      } finally {
        if (alive) setLoadingExisting(false);
      }
    })();
    return () => { alive = false; };
  }, [editId, user, navigate]);

  // Currency default comes from the owner's country, and stays editable.
  useEffect(() => {
    let alive = true;
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('country, preferred_currency')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!alive) return;

      const preferred = (profile as any)?.preferred_currency?.trim();
      if (preferred) { setCurrency(preferred.toUpperCase()); setCurrencyReady(true); return; }

      const country = (profile as any)?.country?.trim();
      if (country) {
        const { data: match } = await supabase
          .from('country_currency')
          .select('currency_code')
          .or(`alpha2.eq.${country.toUpperCase()},country_name.ilike.${country}`)
          .limit(1)
          .maybeSingle();
        if (!alive) return;
        if ((match as any)?.currency_code) {
          setCurrency((match as any).currency_code);
          setCurrencyReady(true);
          return;
        }
      }
      // No country on file: the owner picks. No country is assumed.
      setCurrencyReady(true);
    })();
    return () => { alive = false; };
  }, [user]);

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
      setSelectedCompanyId((list.find((b: any) => b.is_default) ?? list[0])?.id ?? null);
    })();
    return () => { alive = false; };
  }, [user]);

  const branch = vehicleType ? VEHICLE_BRANCH[vehicleType] : null;

  const visibleTags = useMemo(() => {
    if (!branch || showAllTags) return USE_TAGS;
    return USE_TAGS.filter((t) => branch.suggestedTags.includes(t.value));
  }, [branch, showAllTags]);

  const visibleRates = useMemo(() => {
    if (!branch || showAllRates) return RATE_PERIODS;
    return RATE_PERIODS.filter((p) => branch.suggestedRates.includes(p.column));
  }, [branch, showAllRates]);

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
        cacheControl: '3600', contentType: 'image/jpeg', upsert: false,
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

  const numericRates = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [col, raw] of Object.entries(rates)) {
      const n = Number(raw);
      if (raw !== '' && Number.isFinite(n) && n > 0) out[col] = n;
    }
    return out;
  }, [rates]);

  const typeReady = !!vehicleType;
  const coverReady = !!cover;
  const titleReady = title.trim().length > 0;
  const rateReady = Object.keys(numericRates).length > 0;
  const currencyValid = /^[A-Z]{3}$/.test(currency.trim().toUpperCase());
  const locationReady = baseLocation.trim().length > 0;

  // The licence confirmation is a REQUIRED item, not a side condition.
  // PlantButton derives its disabled state purely from completed vs
  // required, so leaving it out of the count would leave the button
  // clickable with the box unticked.
  const requiredCount = 7;
  const completed = [
    typeReady, coverReady, titleReady, rateReady,
    currencyValid, locationReady, licenceConfirmed,
  ].filter(Boolean).length;

  const missingReason = useMemo(() => {
    if (!typeReady) return 'Pick what kind of vehicle it is.';
    if (!coverReady) return 'Add one photo of the vehicle.';
    if (!titleReady) return 'Give it a short name.';
    if (!rateReady) return 'Fill in at least one price.';
    if (!currencyValid) return 'Choose the currency you charge in.';
    if (!locationReady) return 'Say where the vehicle is based.';
    if (!licenceConfirmed) return 'Tick the licence confirmation to finish.';
    return undefined;
  }, [typeReady, coverReady, titleReady, rateReady, currencyValid, locationReady, licenceConfirmed]);

  const canSubmit = completed === requiredCount && licenceConfirmed;

  const handlePlant = async () => {
    if (!user) { toast.error('Please log in to sow.'); return; }
    if (!canSubmit || !cover || !vehicleType) return;

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

      // products.price stays populated so the existing booking path and the
      // 85/15 split are untouched. It mirrors the first rate the owner set.
      const primaryColumn = PRIMARY_RATE_ORDER.find((c) => numericRates[c] != null) ?? null;
      const primaryRate = primaryColumn ? numericRates[primaryColumn] : null;

      const service_details: Record<string, unknown> = {
        vehicle_type: vehicleType,
        rate_unit: primaryColumn ? LEGACY_RATE_UNIT[primaryColumn] : null,
        base_town: baseLocation.trim(),
        driver_included: true,
      };
      if (tags.length) service_details.tags = tags;

      const productPayload = {
        title: title.trim(),
        description: description.trim(),
        type: 'service',
        kind: 'wheel',
        category: vehicleType,
        license_type: 'bestowal',
        price: primaryRate,
        cover_image_url: cover.fileUrl,
        image_urls: [cover.fileUrl, ...extraPhotos.map((p) => p.fileUrl)],
        file_url: null,
        preview_url: null,
        service_details,
      };

      let productId: string;
      if (isEdit && editId) {
        await updateProduct(editId, { ...productPayload, updated_at: new Date().toISOString() });
        productId = editId;
      } else {
        const inserted = await insertProduct({
          sower_id: sowerId,
          company_id: companyId,
          ...productPayload,
        });
        productId = inserted.id;
      }

      // Coordinates decide whether this listing is ever findable: the hub's
      // proximity search skips a row with no lat/lng. wandering_roles only
      // has them when the owner's profile happened to carry them, which is
      // often not the case, so resolve the typed location instead and keep
      // the role's own coordinates as the fallback.
      let baseLat: number | null = isEdit ? existingLat : roleLat;
      let baseLng: number | null = isEdit ? existingLng : roleLng;
      const locationChanged = baseLocation.trim() !== (loadedLocation ?? '').trim();
      // Only pay for a lookup when there is something new to resolve.
      if (!isEdit || locationChanged || baseLat == null || baseLng == null) {
        try {
          const { data: geo } = await supabase.functions.invoke('geocode-place', {
            body: { place: baseLocation.trim() },
          });
          const gLat = Number(geo?.lat);
          const gLng = Number(geo?.lng);
          if (Number.isFinite(gLat) && Number.isFinite(gLng)) { baseLat = gLat; baseLng = gLng; }
        } catch {
          // Keep the fallback. The warning below covers the no-coordinates case.
        }
      }

      const detailPayload = {
        product_id: productId,
        vehicle_type: vehicleType,
        use_tags: tags,
        driver_included: true,
        rate_per_trip: numericRates.rate_per_trip ?? null,
        rate_hourly: numericRates.rate_hourly ?? null,
        rate_per_km: numericRates.rate_per_km ?? null,
        rate_daily: numericRates.rate_daily ?? null,
        rate_weekly: numericRates.rate_weekly ?? null,
        rate_monthly: numericRates.rate_monthly ?? null,
        currency: currency.trim().toUpperCase(),
        base_location: baseLocation.trim(),
        base_lat: baseLat,
        base_lng: baseLng,
        availability: available,
        operator_confirmed_licensed: true,
      };

      // upsert, not insert: an older listing may have no detail row at all.
      const { error: detailErr } = await supabase
        .from('wheel_seed_details')
        .upsert(detailPayload as any, { onConflict: 'product_id' });

      if (detailErr) {
        // The listing exists but has no detail row, so it would be invisible
        // in the hub. Say so plainly rather than celebrating.
        console.error('wheel_seed_details save failed', detailErr);
        toast.error(`Saved the listing, but the vehicle details did not save: ${detailErr.message}`);
        navigate(`/seed/wheel/${productId}`);
        return;
      }

      if (baseLat == null || baseLng == null) {
        // Registered, but it will not show in the directory. Say so plainly
        // rather than letting the owner think they are listed.
        toast.warning(
          (isEdit ? 'Saved, but we could not place "' : 'Vehicle registered, but we could not place "') + baseLocation.trim()
          + '" on the map, so it will not show in Sleeping Seeds yet. Edit the location to a town or city name.',
          { duration: 12000 },
        );
      }

      if (!isEdit) launchConfetti();
      toast.success(isEdit ? 'Changes saved.' : 'Vehicle registered! 🌱');
      await new Promise((resolve) => setTimeout(resolve, 600));
      navigate(isEdit ? '/my-listings' : `/seed/wheel/${productId}`);
    } catch (e: any) {
      console.error('Plant seed error', e);
      toast.error(e?.message ?? 'Could not register this vehicle. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="container max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-muted-foreground">Please log in to register a vehicle.</p>
        <Button onClick={() => navigate('/login')}>Log in</Button>
      </div>
    );
  }

  if (!roleChecked || loadingExisting) {
    return (
      <div className="container max-w-lg mx-auto px-4 py-16 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="container max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-destructive">{loadError}</p>
        <Button onClick={() => navigate('/my-listings')}>Back to My Listings</Button>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto px-4 py-6 pb-28">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(isEdit ? '/my-listings' : '/sow')}
        className="mb-4 -ml-2"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        {isEdit ? 'Back to My Listings' : 'Back to Sow'}
      </Button>

      <SowBanner />

      <h1 className="text-2xl font-bold mb-1">{isEdit ? 'Edit your vehicle' : 'Register your vehicle'}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        You drive, always. People book you and your vehicle together.
      </p>

      {/* 1. What is it -------------------------------------------------- */}
      <section className="mb-7">
        <h2 className="text-lg font-semibold mb-3">1. What is it?</h2>
        {/*
          auto-rows-fr makes every row the same height, so a two-line label
          like "Bakkie / pickup" does not leave its neighbour short.
        */}
        <div className="grid grid-cols-2 gap-3 auto-rows-fr">
          {VEHICLE_TYPES.map((t) => {
            const on = vehicleType === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setVehicleType(t.value)}
                aria-pressed={on}
                /*
                  flex-col is not optional. index.css:679 gives every bare
                  <button> `inline-flex items-center justify-center`, which
                  laid the label and its hint out side by side and read as
                  "CarA normal car.". That base rule uses :where() so it has
                  zero specificity and these utilities win.
                */
                className={`flex h-full min-h-[5.5rem] flex-col items-start justify-start gap-0.5
                  rounded-xl border-2 p-3 text-left transition ${
                  on ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                }`}
              >
                <span className="font-semibold leading-tight">{t.label}</span>
                <span className="text-xs leading-snug text-muted-foreground">{t.hint}</span>
              </button>
            );
          })}
        </div>
      </section>

      {vehicleType && (
        <>
          {/* 2. What it can do ------------------------------------------ */}
          <section className="mb-7">
            <h2 className="text-lg font-semibold mb-3">2. {branch?.loadQuestion}</h2>
            <div className="flex flex-wrap gap-2">
              {visibleTags.map((t) => {
                const on = tags.includes(t.value);
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTags((prev) => (on ? prev.filter((v) => v !== t.value) : [...prev, t.value]))}
                    aria-pressed={on}
                    className={`min-h-11 px-4 rounded-full border text-sm transition ${
                      on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-border'
                    }`}
                  >
                    {on && <Check className="w-3.5 h-3.5 inline mr-1" />}
                    {t.label}
                  </button>
                );
              })}
            </div>
            {!showAllTags && (
              <Button variant="link" size="sm" className="px-0 mt-2" onClick={() => setShowAllTags(true)}>
                Show all options
              </Button>
            )}
          </section>

          {/* 3. Photos and name ----------------------------------------- */}
          <section className="mb-7">
            <h2 className="text-lg font-semibold mb-3">3. Show it</h2>
            <CoverDropZone bucket="premium-room" pathPrefix={`covers/${user.id}`} onChange={setCover} required />

            <div className="mt-3">
              <Label className="text-sm">More photos (up to {MAX_EXTRA_PHOTOS})</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {extraPhotos.map((p, i) => (
                  <div key={p.storagePath} className="relative">
                    <SignedImg src={p.fileUrl} alt="" className="w-20 h-20 rounded-lg object-cover border" />
                    <button
                      type="button"
                      onClick={() => setExtraPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                      aria-label="Remove photo"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {extraPhotos.length < MAX_EXTRA_PHOTOS && (
                  <label className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary">
                    {uploadingExtra
                      ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      : <ImagePlus className="w-5 h-5 text-muted-foreground" />}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void addExtraPhoto(f); e.target.value = ''; }}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="wheel-title">Short name</Label>
              <Input
                id="wheel-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Blue bakkie with canopy"
                className="h-12 mt-1"
              />
            </div>

            <div className="mt-4">
              <Label htmlFor="wheel-desc">Anything else people should know</Label>
              <Textarea
                id="wheel-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="I load and unload myself. Two helpers available on request."
                rows={3}
                className="mt-1"
              />
            </div>
          </section>

          {/* 4. Where ---------------------------------------------------- */}
          <section className="mb-7">
            <h2 className="text-lg font-semibold mb-3">4. Where is it based?</h2>
            <Input
              value={baseLocation}
              onChange={(e) => setBaseLocation(e.target.value)}
              placeholder="Town or area"
              className="h-12"
            />
            <p className="text-xs text-muted-foreground mt-1">
              People search by how far away you are.
            </p>
          </section>

          {/* 5. Price ---------------------------------------------------- */}
          <section className="mb-7">
            <h2 className="text-lg font-semibold mb-3">5. What do you charge?</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Fill in only the ones you offer. At least one.
            </p>

            <div className="mb-4">
              <Label htmlFor="wheel-currency">Currency</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="wheel-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
                  placeholder={currencyReady ? 'e.g. USD' : ''}
                  className="h-12 w-32 uppercase"
                  maxLength={3}
                />
                <p className="text-xs text-muted-foreground self-center">
                  Three-letter code. Your prices always show in this currency.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {visibleRates.map((p) => (
                <div key={p.column} className="flex items-center gap-3">
                  <Label htmlFor={p.column} className="w-28 shrink-0 text-sm">{p.label}</Label>
                  <Input
                    id={p.column}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={rates[p.column] ?? ''}
                    onChange={(e) => setRates((prev) => ({ ...prev, [p.column]: e.target.value }))}
                    placeholder="—"
                    className="h-12"
                  />
                </div>
              ))}
            </div>
            {!showAllRates && (
              <Button variant="link" size="sm" className="px-0 mt-2" onClick={() => setShowAllRates(true)}>
                Show all rate options
              </Button>
            )}
          </section>

          {/* 6. Availability and the licence confirmation ---------------- */}
          <section className="mb-7">
            <h2 className="text-lg font-semibold mb-3">6. Last thing</h2>

            <div className="flex items-center gap-3 mb-5">
              <Checkbox
                id="wheel-available"
                checked={available}
                onCheckedChange={(v) => setAvailable(v === true)}
                className="w-6 h-6"
              />
              <Label htmlFor="wheel-available" className="text-base">
                Available for bookings now
              </Label>
            </div>

            <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/5 p-4">
              <div className="flex gap-3">
                <Checkbox
                  id="wheel-licence"
                  checked={licenceConfirmed}
                  onCheckedChange={(v) => setLicenceConfirmed(v === true)}
                  className="w-6 h-6 mt-0.5 shrink-0"
                />
                <Label htmlFor="wheel-licence" className="text-sm leading-relaxed cursor-pointer">
                  {OPERATOR_LICENCE_CONFIRMATION}
                </Label>
              </div>
              {!licenceConfirmed && (
                <p className="text-xs text-muted-foreground mt-3 ml-9">
                  You have to tick this before you can register the vehicle.
                </p>
              )}
            </div>
          </section>

          <PlantButton
            requiredCount={requiredCount}
            completedCount={completed}
            missingReason={missingReason}
            submitting={submitting}
            onClick={handlePlant}
            label={isEdit ? 'Save changes' : 'Register vehicle'}
            progressWord={isEdit ? 'ready' : undefined}
          />
        </>
      )}
    </div>
  );
}
