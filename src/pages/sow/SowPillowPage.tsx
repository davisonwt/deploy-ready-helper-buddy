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
import SignedImg from '@/components/media/SignedImg';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, ImagePlus, X, Loader2, Check, Minus, Plus } from 'lucide-react';
import sowProductBanner from '@/assets/seeds-strip.jpg';
import { getPreset } from '@/lib/store/presets';

import {
  AMENITIES, HOST_LEGAL_CONFIRMATION, PILLOW_LEGACY_RATE_UNIT,
  PILLOW_PRIMARY_RATE_ORDER, PILLOW_RATE_PERIODS, STAY_BRANCH, STAY_TYPES,
  type Amenity, type StayType,
} from '@/lib/sleeping/pillowOptions';
import { geocodeBaseLocation } from '@/lib/sleeping/geocodeBase';
import SowSteps from '@/components/sowing/SowSteps';
import {
  PILLOW_UNIT_TYPES, UNIT_RATE_PERIODS, blankUnit, loadUnits,
  pillowUnitsAvailable, type PillowUnit,
} from '@/lib/sleeping/pillowUnits';

const MAX_GALLERY_PHOTOS = 5;
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

function SowBanner() {
  const preset = getPreset('pillow');
  const bannerUrl = preset?.bannerImage ?? sowProductBanner;
  const accent = preset?.accent ?? '#d4af37';
  return (
    <div
      className="relative hidden w-full overflow-hidden rounded-2xl border aspect-[3.9/1] sm:mb-6 sm:block"
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
 * List a place to stay.
 *
 * ONE flow for every stay type, the same shape as SowWheelPage. Picking the
 * type changes which amenities and rate periods lead; it never sends the
 * person to a different form.
 *
 * A Pillow seed stays a row in `products` (type=service, kind=pillow) so the
 * existing booking path and the 85/15 split keep working untouched. The
 * structured detail lives alongside it in `pillow_seed_details`.
 *
 * /sow/pillow?edit=<product id> loads an existing listing into this same
 * form. There is deliberately no second editor.
 */
export default function SowPillowPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [params] = useSearchParams();
  const editId = params.get('edit');
  const isEdit = !!editId;
  const [loadingExisting, setLoadingExisting] = useState(!!editId);
  const [loadError, setLoadError] = useState<string | null>(null);

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
      if (!data || (data as any).status !== 'active') {
        navigate('/register-wandering?role=pillow&from=sow', { replace: true });
        return;
      }
      setBaseTown((data as any).base_town || '');
      setRoleChecked(true);
    })();
    return () => { alive = false; };
  }, [user, navigate]);

  // --- the form -------------------------------------------------------------
  const [stayType, setStayType] = useState<StayType | null>(null);
  const [front, setFront] = useState<CoverResult | null>(null);
  const [interior, setInterior] = useState<CoverResult | null>(null);
  const [gallery, setGallery] = useState<CoverResult[]>([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sleeps, setSleeps] = useState<number>(2);
  /** The bookable units. Always at least one, so the host is never asked to
   *  declare what kind of place they are before they can start. */
  const [units, setUnits] = useState<PillowUnit[]>([blankUnit(0)]);
  const [unitsSupported, setUnitsSupported] = useState(false);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [rates, setRates] = useState<RateState>({});
  const [showAllRates, setShowAllRates] = useState(false);
  const [currency, setCurrency] = useState('');
  const [currencyReady, setCurrencyReady] = useState(false);
  const [baseLocation, setBaseLocation] = useState('');
  const [available, setAvailable] = useState(true);
  const [legalConfirmed, setLegalConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [existingLat, setExistingLat] = useState<number | null>(null);
  const [existingLng, setExistingLng] = useState<number | null>(null);
  const [loadedLocation, setLoadedLocation] = useState<string | null>(null);

  useEffect(() => {
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

        const p = product as any;
        if (p?.sowers?.user_id !== user.id) {
          toast.error('That listing is not yours to edit.');
          navigate('/my-listings', { replace: true });
          return;
        }
        if (p.kind !== 'pillow') {
          toast.error('That listing is not a place to stay.');
          navigate('/my-listings', { replace: true });
          return;
        }

        const { data: detail } = await supabase
          .from('pillow_seed_details')
          .select('*')
          .eq('product_id', editId)
          .maybeSingle();
        if (!alive) return;
        const d = (detail ?? {}) as any;

        setTitle(p.title ?? '');
        setDescription(p.description ?? '');

        const frontUrl = d.front_image_url ?? p.cover_image_url ?? null;
        if (frontUrl) setFront({ fileUrl: frontUrl, storagePath: '' });
        const interiorUrl = d.interior_image_url ?? (p.image_urls ?? [])[1] ?? null;
        if (interiorUrl) setInterior({ fileUrl: interiorUrl, storagePath: '' });
        const rest: string[] = (d.gallery_urls?.length ? d.gallery_urls : (p.image_urls ?? []).slice(2)) as string[];
        setGallery(rest.filter(Boolean).map((u) => ({ fileUrl: u, storagePath: '' })));

        setStayType((d.stay_type ?? p.category ?? null) as StayType | null);
        setSleeps(Number(d.sleeps ?? p.service_details?.sleeps ?? 2) || 2);
        setAmenities((d.amenities ?? []) as Amenity[]);
        if (d.currency) setCurrency(String(d.currency).toUpperCase());
        setCurrencyReady(true);
        const savedLocation = d.base_location ?? p.service_details?.location ?? p.service_details?.base_town ?? '';
        setBaseLocation(savedLocation);
        setLoadedLocation(savedLocation);
        setExistingLat(d.base_lat ?? null);
        setExistingLng(d.base_lng ?? null);
        setAvailable(d.availability !== false);
        // Given when the listing was created. Stays required and stays ticked,
        // so an edit cannot quietly drop it.
        setLegalConfirmed(true);

        const loaded: RateState = {};
        for (const col of ['rate_nightly', 'rate_weekly', 'rate_monthly']) {
          if (d[col] != null) loaded[col] = String(Number(d[col]));
        }
        if (Object.keys(loaded).length === 0 && p.price != null) loaded.rate_nightly = String(Number(p.price));
        setRates(loaded);
        setShowAllRates(true);
        setShowAllAmenities(true);
      } catch (e: any) {
        if (!alive) return;
        console.error('[SowPillowPage] could not load listing for edit', e);
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
    if (!user || isEdit) return;
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
      setCurrencyReady(true);
    })();
    return () => { alive = false; };
  }, [user, isEdit]);

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

  const branch = stayType ? STAY_BRANCH[stayType] : null;

  const visibleAmenities = useMemo(() => {
    if (!branch || showAllAmenities) return AMENITIES;
    return AMENITIES.filter((a) => branch.suggestedAmenities.includes(a.value));
  }, [branch, showAllAmenities]);

  const visibleRates = useMemo(() => {
    if (!branch || showAllRates) return PILLOW_RATE_PERIODS;
    return PILLOW_RATE_PERIODS.filter((p) => branch.suggestedRates.includes(p.column));
  }, [branch, showAllRates]);

  const addGalleryPhoto = async (file: File) => {
    if (gallery.length >= MAX_GALLERY_PHOTOS || !user) return;
    setUploadingGallery(true);
    try {
      const cropped = await cropToSquare(file);
      if (cropped.size > MAX_PHOTO_SIZE_BYTES) {
        toast.error('That photo is too large — the limit is 10 MB.');
        return;
      }
      const path = `covers/${user.id}/pillow-${Date.now()}.jpg`;
      const { error: uploadErr } = await supabase.storage.from('premium-room').upload(path, cropped, {
        cacheControl: '3600', contentType: 'image/jpeg', upsert: false,
      });
      if (uploadErr) throw uploadErr;
      const { data: pub } = supabase.storage.from('premium-room').getPublicUrl(path);
      setGallery((prev) => [...prev, { fileUrl: pub.publicUrl, storagePath: path }]);
    } catch (err) {
      console.error('Gallery photo upload failed:', err);
      toast.error('Could not upload that photo. Please try again.');
    } finally {
      setUploadingGallery(false);
    }
  };

  useEffect(() => {
    let alive = true;
    pillowUnitsAvailable().then((ok) => { if (alive) setUnitsSupported(ok); });
    return () => { alive = false; };
  }, []);

  // Edit mode reuses this form rather than a second one, so it loads the
  // listing's existing units straight into the same editor.
  useEffect(() => {
    let alive = true;
    if (!editId) return;
    loadUnits(editId).then((rows) => {
      if (alive && rows.length > 0) setUnits(rows);
    });
    return () => { alive = false; };
  }, [editId]);

  /** A unit is usable when it is named, sleeps someone, and has a price. */
  const unitsValid = useMemo(
    () => units.length > 0 && units.every((u) =>
      u.name.trim().length > 0
      && Number(u.sleeps) >= 1
      && UNIT_RATE_PERIODS.some((r) => Number(u[r.column]) > 0)),
    [units],
  );

  // The pre-units columns on pillow_seed_details are still NOT NULL until
  // 20260917120000_pillow_units_drop_legacy.sql runs, so they are derived
  // from the units rather than asked for twice. Units remain the source of
  // truth; these are a mirror that disappears with that migration.
  const legacySleeps = useMemo(
    () => Math.max(1, ...units.map((u) => Number(u.sleeps) || 1)),
    [units],
  );
  const cheapestUnit = useMemo(() => {
    const priced = units
      .map((u) => ({ u, amount: UNIT_RATE_PERIODS.map((r) => Number(u[r.column])).find((n) => n > 0) }))
      .filter((x) => Number.isFinite(x.amount));
    if (priced.length === 0) return null;
    return priced.reduce((a, b) => ((a.amount as number) <= (b.amount as number) ? a : b)).u;
  }, [units]);
  const legacyStayType = useMemo((): StayType => {
    switch (units[0]?.unit_type) {
      case 'room': return 'room_in_home';
      case 'chalet': case 'cabin': case 'cottage': case 'apartment': return 'whole_place';
      case 'geodesic_dome': case 'tent': case 'safari_tent': return 'bush_camp';
      default: return 'other';
    }
  }, [units]);

  const numericRates = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [col, raw] of Object.entries(rates)) {
      const n = Number(raw);
      if (raw !== '' && Number.isFinite(n) && n > 0) out[col] = n;
    }
    return out;
  }, [rates]);

  // Units carry what the stay type, the sleeps counter and the rate step
  // used to carry separately, so one check replaces three.
  const frontReady = !!front;
  const titleReady = title.trim().length > 0;
  const currencyValid = /^[A-Z]{3}$/.test(currency.trim().toUpperCase());
  const locationReady = baseLocation.trim().length > 0;

  // The legal confirmation is a REQUIRED item, not a side condition:
  // PlantButton derives its disabled state purely from the counts.
  const requiredCount = 6;
  const completed = [
    unitsValid, frontReady, titleReady,
    currencyValid, locationReady, legalConfirmed,
  ].filter(Boolean).length;

  const missingReason = useMemo(() => {
    if (!unitsValid) return 'Every unit needs a name, a size and a price.';
    if (!frontReady) return 'Add a photo of the outside.';
    if (!titleReady) return 'Give it a short name.';
    if (!currencyValid) return 'Choose the currency you charge in.';
    if (!locationReady) return 'Say where the place is.';
    if (!legalConfirmed) return 'Tick the confirmation to finish.';
    return undefined;
  }, [unitsValid, frontReady, titleReady, currencyValid, locationReady, legalConfirmed]);

  // Listed before the first question is answered, so nobody reaches the end
  // of the form to discover a price was wanted. See SowSteps.
  const stepList = [
    { label: 'Your units', done: unitsValid },
    { label: 'What guests get', done: amenities.length > 0 },
    { label: 'Photos and name', done: frontReady && titleReady },
    { label: 'Where', done: locationReady },
    { label: 'What you charge', done: unitsValid && currencyValid },
    { label: 'Last thing', done: legalConfirmed },
  ];

  const canSubmit = completed === requiredCount && legalConfirmed;

  const handlePlant = async () => {
    if (!user) { toast.error('Please log in to sow.'); return; }
    if (!canSubmit || !front) return;

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
      // 85/15 split are untouched. It mirrors the first rate the host set.
      // The headline price is the cheapest unit, which is what the hub shows
      // as "from". A trigger keeps products.price equal to this too, so the
      // two cannot drift; writing it here just avoids a round trip.
      const primaryColumn = UNIT_RATE_PERIODS
        .map((r) => r.column)
        .find((c) => cheapestUnit && Number(cheapestUnit[c]) > 0) ?? null;
      const primaryRate = primaryColumn && cheapestUnit ? Number(cheapestUnit[primaryColumn]) : null;

      const galleryUrls = gallery.map((g) => g.fileUrl);
      const imageUrls = [front.fileUrl, interior?.fileUrl, ...galleryUrls].filter(Boolean) as string[];

      const service_details: Record<string, unknown> = {
        property_type: legacyStayType,
        sleeps: legacySleeps,
        units: units.map((u) => ({
          unit_type: u.unit_type, name: u.name.trim(), sleeps: u.sleeps,
          rate_nightly: u.rate_nightly, rate_weekly: u.rate_weekly, rate_monthly: u.rate_monthly,
        })),
        amenities,
        location: baseLocation.trim(),
        rate_unit: primaryColumn ? PILLOW_LEGACY_RATE_UNIT[primaryColumn] : null,
        base_town: baseLocation.trim(),
      };

      const productPayload = {
        title: title.trim(),
        description: description.trim(),
        type: 'service',
        kind: 'pillow',
        category: legacyStayType,
        license_type: 'bestowal',
        price: primaryRate,
        cover_image_url: front.fileUrl,
        image_urls: imageUrls,
        file_url: null,
        preview_url: null,
        service_details,
      };

      let productId: string;
      if (isEdit && editId) {
        await updateProduct(editId, { ...productPayload, updated_at: new Date().toISOString() });
        productId = editId;
      } else {
        const inserted = await insertProduct({ sower_id: sowerId, company_id: companyId, ...productPayload });
        productId = inserted.id;
      }

      // A listing is placed by its OWN typed location. The member's profile
      // and role coordinates describe where they live -- often just a country
      // default -- so inheriting them drops the listing into the wrong town
      // and offers it to the wrong people. No coordinates is the honest
      // outcome of a failed lookup, and the card says so.
      const locationChanged = baseLocation.trim() !== (loadedLocation ?? '').trim();
      let baseLat: number | null = isEdit && !locationChanged ? existingLat : null;
      let baseLng: number | null = isEdit && !locationChanged ? existingLng : null;
      if (baseLat == null || baseLng == null) {
        const geo = await geocodeBaseLocation(baseLocation.trim());
        if (geo) { baseLat = geo.lat; baseLng = geo.lng; }
      }

      const detailPayload = {
        product_id: productId,
        // Mirrors of the units, kept only until the drop-legacy migration
        // removes these columns. Units are the source of truth.
        stay_type: legacyStayType,
        sleeps: legacySleeps,
        amenities,
        rate_nightly: cheapestUnit?.rate_nightly ?? null,
        rate_weekly: cheapestUnit?.rate_weekly ?? null,
        rate_monthly: cheapestUnit?.rate_monthly ?? null,
        currency: currency.trim().toUpperCase(),
        base_location: baseLocation.trim(),
        base_lat: baseLat,
        base_lng: baseLng,
        availability: available,
        front_image_url: front.fileUrl,
        interior_image_url: interior?.fileUrl ?? null,
        gallery_urls: galleryUrls,
        operator_confirmed_legal: true,
      };

      // Units, replaced wholesale. The set is small and owner-only, so
      // diffing would be more code for no benefit. New rows go in before the
      // old ones come out, so the listing is never momentarily unit-less.
      if (unitsSupported) {
        const { data: oldUnits } = await supabase
          .from('pillow_units').select('id').eq('product_id', productId);
        const oldIds = ((oldUnits ?? []) as Array<{ id: string }>).map((u) => u.id);

        const { error: unitErr } = await supabase.from('pillow_units').insert(
          units.map((u, i) => ({
            product_id: productId,
            unit_type: u.unit_type,
            name: u.name.trim(),
            sleeps: Number(u.sleeps) || 1,
            rate_nightly: u.rate_nightly ?? null,
            rate_weekly: u.rate_weekly ?? null,
            rate_monthly: u.rate_monthly ?? null,
            sort_order: i,
          })) as any,
        );
        if (unitErr) {
          console.error('pillow_units save failed', unitErr);
          toast.error(`Could not save your units: ${unitErr.message}`);
          setSubmitting(false);
          return;
        }
        if (oldIds.length > 0) {
          const { error: delErr } = await supabase
            .from('pillow_units').delete().in('id', oldIds);
          if (delErr) console.warn('[SowPillowPage] could not clear old units', delErr);
        }
      }

      const { error: detailErr } = await supabase
        .from('pillow_seed_details')
        .upsert(detailPayload as any, { onConflict: 'product_id' });

      if (detailErr) {
        console.error('pillow_seed_details save failed', detailErr);
        toast.error(`Saved the listing, but the stay details did not save: ${detailErr.message}`);
        navigate(`/seed/pillow/${productId}`);
        return;
      }

      if (baseLat == null || baseLng == null) {
        toast.warning(
          (isEdit ? 'Saved, but we could not place "' : 'Listed, but we could not place "') + baseLocation.trim()
          + '" on the map, so it will not show in Sleeping Seeds yet. Edit the location to a town or city name.',
          { duration: 12000 },
        );
      }

      if (!isEdit) launchConfetti();
      toast.success(isEdit ? 'Changes saved.' : 'Your place is listed! 🌱');
      await new Promise((resolve) => setTimeout(resolve, 600));
      navigate(isEdit ? '/my-listings' : `/seed/pillow/${productId}`);
    } catch (e: any) {
      console.error('Plant seed error', e);
      toast.error(e?.message ?? 'Could not list this place. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="container max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-muted-foreground">Please log in to list a place.</p>
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
    <div className="container max-w-2xl mx-auto px-4 pt-3 pb-28 sm:pt-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(isEdit ? '/my-listings' : '/sow')}
        className="mb-2 -ml-2 sm:mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        {isEdit ? 'Back to My Listings' : 'Back to Sow'}
      </Button>

      <SowBanner />

      <h1 className="text-2xl font-bold mb-1">{isEdit ? 'Edit your place' : 'List your place'}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Somewhere for a tribe member to rest. You host, they stay.
      </p>

      <SowSteps
        steps={stepList}
        current={(stepList.findIndex((s) => !s.done) + 1) || stepList.length}
        startHint="Name your first unit to start"
      />

      {/* 1. Units ------------------------------------------------------- */}
      <section className="mb-7">
        <h2 className="text-lg font-semibold mb-1">1. What can people book?</h2>
        <p className="text-sm text-muted-foreground mb-3">
          One place to stay is one unit. A resort adds several: a room, a chalet,
          a dome. Each one has its own size and price.
        </p>

        <div className="space-y-4">
          {units.map((u, i) => (
            <div key={i} className="rounded-xl border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">Unit {i + 1}</span>
                {units.length > 1 && (
                  <Button
                    type="button" variant="ghost" size="sm"
                    className="text-destructive hover:text-destructive"
                    aria-label={`Remove unit ${i + 1}`}
                    onClick={() => setUnits((prev) => prev.filter((_, n) => n !== i))}
                  >
                    Remove
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {PILLOW_UNIT_TYPES.map((t) => {
                  const on = u.unit_type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setUnits((prev) => prev.map((x, n) => n === i ? { ...x, unit_type: t.value } : x))}
                      className={`min-h-11 rounded-xl border-2 px-3 text-sm transition ${
                        on ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3">
                <Label htmlFor={`unit-name-${i}`}>What do you call it?</Label>
                <Input
                  id={`unit-name-${i}`}
                  value={u.name}
                  onChange={(e) => setUnits((prev) => prev.map((x, n) => n === i ? { ...x, name: e.target.value } : x))}
                  placeholder="Family chalet"
                  className="h-12 mt-1"
                />
              </div>

              <div className="mt-3 flex items-center gap-3">
                <Label htmlFor={`unit-sleeps-${i}`} className="text-sm">Sleeps</Label>
                <Input
                  id={`unit-sleeps-${i}`}
                  type="number" inputMode="numeric" min="1" max="200"
                  value={u.sleeps}
                  onChange={(e) => setUnits((prev) => prev.map((x, n) => n === i ? { ...x, sleeps: Number(e.target.value) || 1 } : x))}
                  className="h-12 w-24"
                />
                <span className="text-sm text-muted-foreground">people</span>
              </div>

              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium">What it costs</p>
                {UNIT_RATE_PERIODS.map((r) => (
                  <div key={r.column} className="flex items-center gap-3">
                    <Label htmlFor={`${r.column}-${i}`} className="w-24 shrink-0 text-sm">{r.label}</Label>
                    <Input
                      id={`${r.column}-${i}`}
                      type="number" inputMode="decimal" min="0" step="0.01"
                      value={u[r.column] ?? ''}
                      onChange={(e) => setUnits((prev) => prev.map((x, n) => n === i
                        ? { ...x, [r.column]: e.target.value === '' ? null : Number(e.target.value) } : x))}
                      placeholder="—"
                      className="h-12"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Button
          type="button" variant="outline" className="mt-3"
          onClick={() => setUnits((prev) => [...prev, blankUnit(prev.length)])}
        >
          Add another unit
        </Button>
      </section>

          {/* 3. Amenities ------------------------------------------------ */}
          <section className="mb-7">
            <h2 className="text-lg font-semibold mb-3">3. What do guests get?</h2>
            <div className="flex flex-wrap gap-2">
              {visibleAmenities.map((a) => {
                const on = amenities.includes(a.value);
                return (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setAmenities((prev) => (on ? prev.filter((v) => v !== a.value) : [...prev, a.value]))}
                    aria-pressed={on}
                    className={`min-h-11 px-4 rounded-full border text-sm transition ${
                      on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-border'
                    }`}
                  >
                    {on && <Check className="w-3.5 h-3.5 inline mr-1" />}
                    {a.label}
                  </button>
                );
              })}
            </div>
            {!showAllAmenities && (
              <Button variant="link" size="sm" className="px-0 mt-2" onClick={() => setShowAllAmenities(true)}>
                Show all options
              </Button>
            )}
          </section>

          {/* 4. Photos --------------------------------------------------- */}
          <section className="mb-7">
            <h2 className="text-lg font-semibold mb-3">4. Show it</h2>

            <Label className="text-sm">The outside</Label>
            <div className="mt-1 mb-4">
              <CoverDropZone bucket="premium-room" pathPrefix={`covers/${user.id}`} onChange={setFront} required />
            </div>

            <Label className="text-sm">The inside</Label>
            <div className="mt-1 mb-4">
              <CoverDropZone bucket="premium-room" pathPrefix={`covers/${user.id}`} onChange={setInterior} />
            </div>

            <Label className="text-sm">More photos (up to {MAX_GALLERY_PHOTOS})</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {gallery.map((p, i) => (
                <div key={`${p.fileUrl}-${i}`} className="relative">
                  <SignedImg src={p.fileUrl} alt="" className="w-20 h-20 rounded-lg object-cover border" />
                  <button
                    type="button"
                    onClick={() => setGallery((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                    aria-label="Remove photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {gallery.length < MAX_GALLERY_PHOTOS && (
                <label className="w-20 h-20 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary">
                  {uploadingGallery
                    ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    : <ImagePlus className="w-5 h-5 text-muted-foreground" />}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) void addGalleryPhoto(f); e.target.value = ''; }}
                  />
                </label>
              )}
            </div>

            <div className="mt-4">
              <Label htmlFor="pillow-title">Short name</Label>
              <Input
                id="pillow-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Quiet cottage on the hill"
                className="h-12 mt-1"
              />
            </div>

            <div className="mt-4">
              <Label htmlFor="pillow-desc">Anything else guests should know</Label>
              <Textarea
                id="pillow-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Check in after 2pm. Gate code sent the morning you arrive."
                rows={3}
                className="mt-1"
              />
            </div>
          </section>

          {/* 5. Where ---------------------------------------------------- */}
          <section className="mb-7">
            <h2 className="text-lg font-semibold mb-3">5. Where is it?</h2>
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

          {/* 6. Price ---------------------------------------------------- */}
          <section className="mb-7">
            <h2 className="text-lg font-semibold mb-3">6. What currency?</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Each unit's price is set above. This is the currency they are all in.
            </p>

            <div className="mb-4">
              <Label htmlFor="pillow-currency">Currency</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="pillow-currency"
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
          </section>

          {/* 7. Availability and the legal confirmation ------------------- */}
          <section className="mb-7">
            <h2 className="text-lg font-semibold mb-3">7. Last thing</h2>

            <div className="flex items-center gap-3 mb-5">
              <Checkbox
                id="pillow-available"
                checked={available}
                onCheckedChange={(v) => setAvailable(v === true)}
                className="w-6 h-6"
              />
              <Label htmlFor="pillow-available" className="text-base">
                Taking bookings now
              </Label>
            </div>

            <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/5 p-4">
              <div className="flex gap-3">
                <Checkbox
                  id="pillow-legal"
                  checked={legalConfirmed}
                  onCheckedChange={(v) => setLegalConfirmed(v === true)}
                  className="w-6 h-6 mt-0.5 shrink-0"
                />
                <Label htmlFor="pillow-legal" className="text-sm leading-relaxed cursor-pointer">
                  {HOST_LEGAL_CONFIRMATION}
                </Label>
              </div>
              {!legalConfirmed && (
                <p className="text-xs text-muted-foreground mt-3 ml-9">
                  You have to tick this before you can list the place.
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
            label={isEdit ? 'Save changes' : 'List my place'}
            progressWord={isEdit ? 'ready' : undefined}
          />
    </div>
  );
}
