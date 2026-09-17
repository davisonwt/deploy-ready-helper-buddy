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
import { ArrowLeft, ImagePlus, X, Loader2, Check, Trash2, ShieldAlert } from 'lucide-react';
import sowProductBanner from '@/assets/seeds-strip.jpg';
import { getPreset } from '@/lib/store/presets';

import {
  COMMON_LANGUAGES, HAND_LEGACY_RATE_UNIT, HAND_LEGAL_CONFIRMATION,
  HAND_PRIMARY_RATE_ORDER, HAND_RATE_PERIODS, HAND_TRAVEL_CHARGES, HOUSEHOLD_CATEGORIES,
  PROFESSIONAL_CATEGORIES, QUALIFICATION_LABEL, REFERENCE_CONSENT_NOTE,
  isProfessionalCategory, type ServiceCategory,
} from '@/lib/sleeping/handOptions';
import { geocodeBaseLocation } from '@/lib/sleeping/geocodeBase';
import SowSteps from '@/components/sowing/SowSteps';
import { handTravelColumnsAvailable } from '@/lib/sleeping/handTravelSupport';

const MAX_GALLERY_PHOTOS = 5;
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

interface ReferenceRow {
  id?: string;
  referee_name: string;
  relationship: string;
  contact: string;
}

function SowBanner() {
  const preset = getPreset('hand');
  const bannerUrl = preset?.bannerImage ?? sowProductBanner;
  const accent = preset?.accent ?? '#16a34a';
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
 * Offer a helping hand.
 *
 * ONE flow, the same shape as SowWheelPage and SowPillowPage. Step 1 picks
 * the category, and that single choice drives the rest: a professional must
 * give a qualification, a household lister must give at least one reference.
 *
 * A Hand seed stays a row in `products` (type=service, kind=hand) so the
 * existing booking path and the 85/15 split keep working untouched.
 * Structured detail lives in `hand_seed_details`, and referees live in
 * `hand_seed_references`, which almost nobody can read.
 */
export default function SowHandPage() {
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
        .eq('role', 'hand')
        .maybeSingle();
      if (!alive) return;
      if (!data || (data as any).status !== 'active') {
        navigate('/register-wandering?role=hand', { replace: true });
        return;
      }
      setBaseTown((data as any).base_town || '');
      setRoleChecked(true);
    })();
    return () => { alive = false; };
  }, [user, navigate]);

  // --- the form -------------------------------------------------------------
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [front, setFront] = useState<CoverResult | null>(null);
  const [workSample, setWorkSample] = useState<CoverResult | null>(null);
  const [gallery, setGallery] = useState<CoverResult[]>([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [qualification, setQualification] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [radiusKm, setRadiusKm] = useState('30');
  const [rates, setRates] = useState<RateState>({});
  /** Call-out and per-km. Kept apart from `rates` on purpose: neither one
   *  satisfies "at least one rate", so they must not reach rateReady. */
  const [travelRates, setTravelRates] = useState<RateState>({});
  const [travelSupported, setTravelSupported] = useState(false);
  const [currency, setCurrency] = useState('');
  const [currencyReady, setCurrencyReady] = useState(false);
  const [baseLocation, setBaseLocation] = useState('');
  const [available, setAvailable] = useState(true);
  const [backgroundChecked, setBackgroundChecked] = useState(false);
  const [backgroundCheckBy, setBackgroundCheckBy] = useState('');
  const [references, setReferences] = useState<ReferenceRow[]>([]);
  const [legalConfirmed, setLegalConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [existingLat, setExistingLat] = useState<number | null>(null);
  const [existingLng, setExistingLng] = useState<number | null>(null);
  const [loadedLocation, setLoadedLocation] = useState<string | null>(null);

  const isProfessional = isProfessionalCategory(category);

  useEffect(() => {
    if (!isEdit && baseTown && !baseLocation) setBaseLocation(baseTown);
  }, [isEdit, baseTown, baseLocation]);

  // --- edit mode ------------------------------------------------------------
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
        if (p.kind !== 'hand') {
          toast.error('That listing is not a helping hand.');
          navigate('/my-listings', { replace: true });
          return;
        }

        const { data: detail } = await supabase
          .from('hand_seed_details').select('*').eq('product_id', editId).maybeSingle();
        // The owner can always read their own referees.
        const { data: refs } = await supabase
          .from('hand_seed_references')
          .select('id, referee_name, relationship, contact')
          .eq('product_id', editId);
        if (!alive) return;
        const d = (detail ?? {}) as any;

        setTitle(p.title ?? '');
        setDescription(p.description ?? '');
        const frontUrl = d.front_image_url ?? p.cover_image_url ?? null;
        if (frontUrl) setFront({ fileUrl: frontUrl, storagePath: '' });
        const sampleUrl = d.work_sample_image_url ?? (p.image_urls ?? [])[1] ?? null;
        if (sampleUrl) setWorkSample({ fileUrl: sampleUrl, storagePath: '' });
        const rest: string[] = (d.gallery_urls?.length ? d.gallery_urls : (p.image_urls ?? []).slice(2)) as string[];
        setGallery(rest.filter(Boolean).map((u) => ({ fileUrl: u, storagePath: '' })));

        setCategory((d.service_category ?? null) as ServiceCategory | null);
        setQualification(d.qualification ?? '');
        setLicenceNumber(d.licence_number ?? '');
        setYearsExperience(String(d.years_experience ?? p.service_details?.years_experience ?? ''));
        setLanguages((d.languages ?? []) as string[]);
        setRadiusKm(String(Math.round((d.service_radius_m ?? 30000) / 1000)));
        if (d.currency) setCurrency(String(d.currency).toUpperCase());
        setCurrencyReady(true);
        const savedLocation = d.base_location ?? p.service_details?.base_town ?? '';
        setBaseLocation(savedLocation);
        setLoadedLocation(savedLocation);
        setExistingLat(d.base_lat ?? null);
        setExistingLng(d.base_lng ?? null);
        setAvailable(d.availability !== false);
        setBackgroundChecked(!!d.background_check_declared);
        setBackgroundCheckBy(d.background_check_by ?? '');
        setReferences(((refs ?? []) as any[]).map((r) => ({
          id: r.id, referee_name: r.referee_name ?? '', relationship: r.relationship ?? '', contact: r.contact ?? '',
        })));
        setLegalConfirmed(true);

        const loaded: RateState = {};
        for (const col of ['rate_hourly', 'rate_per_job', 'rate_daily', 'rate_weekly', 'rate_monthly']) {
          if (d[col] != null) loaded[col] = String(Number(d[col]));
        }
        if (Object.keys(loaded).length === 0 && p.price != null) loaded.rate_hourly = String(Number(p.price));
        setRates(loaded);

        const loadedTravel: RateState = {};
        for (const col of ['rate_callout', 'rate_per_km']) {
          if (d[col] != null) loadedTravel[col] = String(Number(d[col]));
        }
        setTravelRates(loadedTravel);
      } catch (e: any) {
        if (!alive) return;
        console.error('[SowHandPage] could not load listing for edit', e);
        setLoadError(e?.message ?? 'Could not load that listing.');
      } finally {
        if (alive) setLoadingExisting(false);
      }
    })();
    return () => { alive = false; };
  }, [editId, user, navigate]);

  // Currency default from the owner's country, still editable.
  useEffect(() => {
    let alive = true;
    if (!user || isEdit) return;
    (async () => {
      const { data: profile } = await supabase
        .from('profiles').select('country, preferred_currency').eq('user_id', user.id).maybeSingle();
      if (!alive) return;
      const preferred = (profile as any)?.preferred_currency?.trim();
      if (preferred) { setCurrency(preferred.toUpperCase()); setCurrencyReady(true); return; }
      const country = (profile as any)?.country?.trim();
      if (country) {
        const { data: match } = await supabase
          .from('country_currency').select('currency_code')
          .or(`alpha2.eq.${country.toUpperCase()},country_name.ilike.${country}`)
          .limit(1).maybeSingle();
        if (!alive) return;
        if ((match as any)?.currency_code) {
          setCurrency((match as any).currency_code); setCurrencyReady(true); return;
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
        .from('companies').select('id, name, is_default')
        .eq('owner_user_id', user.id).order('created_at', { ascending: true });
      if (!alive) return;
      const list = (data as any) ?? [];
      setSelectedCompanyId((list.find((b: any) => b.is_default) ?? list[0])?.id ?? null);
    })();
    return () => { alive = false; };
  }, [user]);

  const addGalleryPhoto = async (file: File) => {
    if (gallery.length >= MAX_GALLERY_PHOTOS || !user) return;
    setUploadingGallery(true);
    try {
      const cropped = await cropToSquare(file);
      if (cropped.size > MAX_PHOTO_SIZE_BYTES) {
        toast.error('That photo is too large — the limit is 10 MB.'); return;
      }
      const path = `covers/${user.id}/hand-${Date.now()}.jpg`;
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
    handTravelColumnsAvailable().then((ok) => { if (alive) setTravelSupported(ok); });
    return () => { alive = false; };
  }, []);

  const numericTravel = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [col, raw] of Object.entries(travelRates)) {
      const n = Number(raw);
      if (raw !== '' && Number.isFinite(n) && n > 0) out[col] = n;
    }
    return out;
  }, [travelRates]);

  const numericRates = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [col, raw] of Object.entries(rates)) {
      const n = Number(raw);
      if (raw !== '' && Number.isFinite(n) && n > 0) out[col] = n;
    }
    return out;
  }, [rates]);

  const filledReferences = useMemo(
    () => references.filter((r) => r.referee_name.trim() && r.contact.trim()),
    [references],
  );

  const categoryReady = !!category;
  const frontReady = !!front;
  const titleReady = title.trim().length > 0;
  const yearsReady = yearsExperience.trim() !== '' && Number(yearsExperience) >= 0;
  const rateReady = Object.keys(numericRates).length > 0;
  const currencyValid = /^[A-Z]{3}$/.test(currency.trim().toUpperCase());
  const locationReady = baseLocation.trim().length > 0;
  // The two rules the category drives.
  const qualificationReady = !isProfessional || qualification.trim().length > 0;
  const referencesReady = isProfessional || filledReferences.length > 0;

  const requiredCount = 10;
  const completed = [
    categoryReady, frontReady, titleReady, yearsReady, rateReady,
    currencyValid, locationReady, qualificationReady, referencesReady, legalConfirmed,
  ].filter(Boolean).length;

  const missingReason = useMemo(() => {
    if (!categoryReady) return 'Pick what you do.';
    if (!frontReady) return 'Add a photo of yourself or your work.';
    if (!titleReady) return 'Give it a short name.';
    if (!qualificationReady) return 'Add your qualification or licence.';
    if (!yearsReady) return 'Say how many years you have been doing this.';
    if (!rateReady) return 'Fill in at least one price.';
    if (!currencyValid) return 'Choose the currency you charge in.';
    if (!locationReady) return 'Say where you are based.';
    if (!referencesReady) return 'Add at least one reference.';
    if (!legalConfirmed) return 'Tick the confirmation to finish.';
    return undefined;
  }, [categoryReady, frontReady, titleReady, qualificationReady, yearsReady,
      rateReady, currencyValid, locationReady, referencesReady, legalConfirmed]);

  // Listed before the first question is answered, so nobody reaches the end
  // of the form to discover a price was wanted. See SowSteps.
  const stepList = [
    { label: 'What you do', done: categoryReady },
    { label: 'Background', done: categoryReady && yearsReady && qualificationReady },
    { label: 'Photos and name', done: frontReady && titleReady },
    { label: 'Where', done: locationReady },
    { label: 'What you charge', done: rateReady && currencyValid },
    { label: 'References', done: categoryReady && referencesReady },
    { label: 'Last thing', done: legalConfirmed },
  ];

  const canSubmit = completed === requiredCount;

  const handlePlant = async () => {
    if (!user) { toast.error('Please log in to sow.'); return; }
    if (!canSubmit || !front || !category) return;

    setSubmitting(true);
    try {
      const { data: sowerData } = await supabase.from('sowers').select('id').eq('user_id', user.id).single();
      let sowerId = sowerData?.id as string | undefined;
      if (!sowerId) {
        const { data: profile } = await supabase.from('profiles').select('display_name').eq('user_id', user.id).single();
        const { data: newSower, error: createErr } = await supabase
          .from('sowers')
          .insert({ user_id: user.id, display_name: profile?.display_name || user.email?.split('@')[0] || 'Anonymous' })
          .select().single();
        if (createErr) throw createErr;
        sowerId = newSower.id;
      }
      const companyId = selectedCompanyId ?? (await getDefaultCompanyId(sowerId));

      const primaryColumn = HAND_PRIMARY_RATE_ORDER.find((c) => numericRates[c] != null) ?? null;
      const primaryRate = primaryColumn ? numericRates[primaryColumn] : null;
      const galleryUrls = gallery.map((g) => g.fileUrl);
      const imageUrls = [front.fileUrl, workSample?.fileUrl, ...galleryUrls].filter(Boolean) as string[];

      const service_details: Record<string, unknown> = {
        category,
        years_experience: Number(yearsExperience),
        rate_unit: primaryColumn ? HAND_LEGACY_RATE_UNIT[primaryColumn] : null,
        radius_km: Number(radiusKm) || null,
        base_town: baseLocation.trim(),
      };

      const productPayload = {
        title: title.trim(),
        description: description.trim(),
        type: 'service',
        kind: 'hand',
        category,
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
        service_category: category,
        qualification: qualification.trim() || null,
        licence_number: licenceNumber.trim() || null,
        years_experience: Number(yearsExperience),
        languages,
        service_radius_m: Number(radiusKm) ? Math.round(Number(radiusKm) * 1000) : null,
        rate_hourly: numericRates.rate_hourly ?? null,
        rate_per_job: numericRates.rate_per_job ?? null,
        rate_daily: numericRates.rate_daily ?? null,
        rate_weekly: numericRates.rate_weekly ?? null,
        rate_monthly: numericRates.rate_monthly ?? null,
        // Only when the columns exist. Sending an unknown column fails the
        // whole upsert, and the migration is applied by hand.
        ...(travelSupported ? {
          rate_callout: numericTravel.rate_callout ?? null,
          rate_per_km: numericTravel.rate_per_km ?? null,
        } : {}),
        currency: currency.trim().toUpperCase(),
        base_location: baseLocation.trim(),
        base_lat: baseLat,
        base_lng: baseLng,
        availability: available,
        front_image_url: front.fileUrl,
        work_sample_image_url: workSample?.fileUrl ?? null,
        gallery_urls: galleryUrls,
        background_check_declared: backgroundChecked,
        background_check_by: backgroundChecked ? (backgroundCheckBy.trim() || null) : null,
        operator_confirmed_legal: true,
      };

      // References are written BEFORE the detail row, and the new ones before
      // the old ones are removed. Both orderings are load-bearing.
      //
      // trg_hand_household_needs_reference fires at the end of whichever
      // transaction touched the detail row, and PostgREST gives every request
      // its own transaction. Writing the detail row first therefore commits a
      // household listing with zero references and is rejected outright, which
      // is what broke every household registration on 2026-09-17.
      //
      // Deleting the old set before inserting the new one has the same
      // problem from the other side: the delete's own commit would see zero
      // references on a household listing and trip trg_hand_reference_delete_guard.
      // Adding first and removing afterwards means the count never reaches
      // zero, so neither trigger ever sees an empty household listing.
      const { data: oldRefRows } = await supabase
        .from('hand_seed_references').select('id').eq('product_id', productId);
      const oldRefIds = ((oldRefRows ?? []) as Array<{ id: string }>).map((r) => r.id);

      if (filledReferences.length > 0) {
        const { error: refErr } = await supabase.from('hand_seed_references').insert(
          filledReferences.map((r) => ({
            product_id: productId,
            referee_name: r.referee_name.trim(),
            relationship: r.relationship.trim() || null,
            contact: r.contact.trim(),
          })) as any,
        );
        if (refErr) {
          console.error('hand_seed_references save failed', refErr);
          toast.error(`Could not save your references: ${refErr.message}`);
          setSubmitting(false);
          return;
        }
      }

      if (oldRefIds.length > 0) {
        const { error: delErr } = await supabase
          .from('hand_seed_references').delete().in('id', oldRefIds);
        if (delErr) console.warn('[SowHandPage] could not clear old references', delErr);
      }

      const { error: detailErr } = await supabase
        .from('hand_seed_details')
        .upsert(detailPayload as any, { onConflict: 'product_id' });
      if (detailErr) {
        console.error('hand_seed_details save failed', detailErr);
        toast.error(`Saved the listing, but the service details did not save: ${detailErr.message}`);
        navigate(`/seed/hand/${productId}`);
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
      toast.success(isEdit ? 'Changes saved.' : 'Your hand is offered! 🌱');
      await new Promise((resolve) => setTimeout(resolve, 600));
      navigate(isEdit ? '/my-listings' : `/seed/hand/${productId}`);
    } catch (e: any) {
      console.error('Plant seed error', e);
      toast.error(e?.message ?? 'Could not list this service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="container max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-muted-foreground">Please log in to offer a hand.</p>
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

  const CategoryGrid = ({ list }: { list: readonly { value: string; label: string }[] }) => (
    <div className="grid grid-cols-2 gap-2 auto-rows-fr">
      {list.map((c) => {
        const on = category === c.value;
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => setCategory(c.value as ServiceCategory)}
            aria-pressed={on}
            className={`flex h-full min-h-12 items-center rounded-xl border-2 px-3 py-2 text-left text-sm font-medium transition ${
              on ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
            }`}
          >
            {on && <Check className="w-4 h-4 mr-1.5 shrink-0" />}
            {c.label}
          </button>
        );
      })}
    </div>
  );

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

      <h1 className="text-2xl font-bold mb-1">{isEdit ? 'Edit your service' : 'Offer your hand'}</h1>
      <p className="text-sm text-muted-foreground mb-6">
        You do the work. People book you for it.
      </p>

      <SowSteps
        steps={stepList}
        current={(stepList.findIndex((s) => !s.done) + 1) || stepList.length}
        startHint="Pick what you do to start"
      />

      {/* 1. What do you do -------------------------------------------- */}
      <section className="mb-7">
        <h2 className="text-lg font-semibold mb-3">1. What do you do?</h2>

        <p className="text-sm font-medium mb-2">A trade or profession</p>
        <CategoryGrid list={PROFESSIONAL_CATEGORIES} />

        <p className="text-sm font-medium mb-2 mt-5">Work in and around the home</p>
        <CategoryGrid list={HOUSEHOLD_CATEGORIES} />
      </section>

      {category && (
        <>
          {/* 2. Your background -------------------------------------- */}
          <section className="mb-7">
            <h2 className="text-lg font-semibold mb-3">2. Your background</h2>

            <div className="mb-4">
              <Label htmlFor="hand-qualification">
                {isProfessional ? QUALIFICATION_LABEL.professional : QUALIFICATION_LABEL.household}
                {isProfessional && <span className="text-destructive"> *</span>}
              </Label>
              <Textarea
                id="hand-qualification"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder={isProfessional
                  ? 'Red Seal qualified plumber, 2016'
                  : 'Ten years with two families, references below'}
                rows={2}
                className="mt-1"
              />
            </div>

            <div className="mb-4">
              <Label htmlFor="hand-licence">Licence or registration number (optional)</Label>
              <Input
                id="hand-licence"
                value={licenceNumber}
                onChange={(e) => setLicenceNumber(e.target.value)}
                placeholder="If you have one"
                className="h-12 mt-1"
              />
            </div>

            <div className="mb-4">
              <Label htmlFor="hand-years">Years doing this <span className="text-destructive">*</span></Label>
              <Input
                id="hand-years"
                type="number"
                inputMode="numeric"
                min="0"
                max="80"
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
                placeholder="5"
                className="h-12 mt-1 max-w-[140px]"
              />
            </div>

            <div>
              <Label className="text-sm">Languages you work in</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {COMMON_LANGUAGES.map((l) => {
                  const on = languages.includes(l);
                  return (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLanguages((prev) => (on ? prev.filter((v) => v !== l) : [...prev, l]))}
                      aria-pressed={on}
                      className={`min-h-11 px-4 rounded-full border text-sm transition ${
                        on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted border-border'
                      }`}
                    >
                      {on && <Check className="w-3.5 h-3.5 inline mr-1" />}
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 3. Photos ----------------------------------------------- */}
          <section className="mb-7">
            <h2 className="text-lg font-semibold mb-3">3. Show it</h2>

            <Label className="text-sm">You, or your work</Label>
            <div className="mt-1 mb-4">
              <CoverDropZone bucket="premium-room" pathPrefix={`covers/${user.id}`} onChange={setFront} required />
            </div>

            <Label className="text-sm">A job you have done (optional)</Label>
            <div className="mt-1 mb-4">
              <CoverDropZone bucket="premium-room" pathPrefix={`covers/${user.id}`} onChange={setWorkSample} />
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
              <Label htmlFor="hand-title">Short name</Label>
              <Input
                id="hand-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Reliable plumber, same-day callouts"
                className="h-12 mt-1"
              />
            </div>

            <div className="mt-4">
              <Label htmlFor="hand-desc">What you do, in your own words</Label>
              <Textarea
                id="hand-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Blocked drains, geysers, leaks. I bring my own tools."
                rows={3}
                className="mt-1"
              />
            </div>
          </section>

          {/* 4. Where ------------------------------------------------ */}
          <section className="mb-7">
            <h2 className="text-lg font-semibold mb-3">4. Where do you work?</h2>
            <Input
              value={baseLocation}
              onChange={(e) => setBaseLocation(e.target.value)}
              placeholder="Town or area"
              className="h-12"
            />
            <div className="mt-3">
              <Label htmlFor="hand-radius" className="text-sm">How far will you travel?</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="hand-radius"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(e.target.value)}
                  className="h-12 max-w-[120px]"
                />
                <span className="text-sm text-muted-foreground">km from there</span>
              </div>
            </div>
          </section>

          {/* 5. Price ------------------------------------------------ */}
          <section className="mb-7">
            <h2 className="text-lg font-semibold mb-3">5. What do you charge?</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Fill in only the ones you offer. At least one.
            </p>

            <div className="mb-4">
              <Label htmlFor="hand-currency">Currency</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="hand-currency"
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
              {HAND_RATE_PERIODS.map((p) => (
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

            {travelSupported && (
              <div className="mt-5 rounded-xl border border-dashed p-3">
                <p className="text-sm font-medium">Travel, if you charge for it</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Charged on top of the rate above, not instead of it. Leave blank if you do not charge for travel.
                </p>
                <div className="space-y-3">
                  {HAND_TRAVEL_CHARGES.map((c) => (
                    <div key={c.column} className="flex items-center gap-3">
                      <Label htmlFor={c.column} className="w-28 shrink-0 text-sm">{c.label}</Label>
                      <Input
                        id={c.column}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={travelRates[c.column] ?? ''}
                        onChange={(e) => setTravelRates((prev) => ({ ...prev, [c.column]: e.target.value }))}
                        placeholder="—"
                        className="h-12"
                      />
                      <span className="hidden text-xs text-muted-foreground sm:inline">{c.hint}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* 6. References ------------------------------------------- */}
          <section className="mb-7">
            <h2 className="text-lg font-semibold mb-1">
              6. References{!isProfessional && <span className="text-destructive"> *</span>}
            </h2>
            <p className="text-sm text-muted-foreground mb-2">
              {isProfessional
                ? 'Optional for a trade. Add one if you have someone who will vouch for you.'
                : 'At least one is required for work in someone’s home.'}
            </p>

            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 mb-4 flex gap-2">
              <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
              <p className="text-xs leading-relaxed">
                {REFERENCE_CONSENT_NOTE}
                {' '}Their details are only ever shown to you and to someone who has booked you.
              </p>
            </div>

            <div className="space-y-3">
              {references.map((r, i) => (
                <div key={i} className="rounded-xl border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Reference {i + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setReferences((prev) => prev.filter((_, idx) => idx !== i))}
                      aria-label={`Remove reference ${i + 1}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <Input
                    aria-label={`Referee ${i + 1} name`}
                    value={r.referee_name}
                    onChange={(e) => setReferences((prev) => prev.map((x, idx) => idx === i ? { ...x, referee_name: e.target.value } : x))}
                    placeholder="Their name"
                    className="h-12"
                  />
                  <Input
                    aria-label={`Referee ${i + 1} relationship`}
                    value={r.relationship}
                    onChange={(e) => setReferences((prev) => prev.map((x, idx) => idx === i ? { ...x, relationship: e.target.value } : x))}
                    placeholder="How they know your work"
                    className="h-12"
                  />
                  <Input
                    aria-label={`Referee ${i + 1} contact`}
                    value={r.contact}
                    onChange={(e) => setReferences((prev) => prev.map((x, idx) => idx === i ? { ...x, contact: e.target.value } : x))}
                    placeholder="Phone or email"
                    className="h-12"
                  />
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full h-12"
              onClick={() => setReferences((prev) => [...prev, { referee_name: '', relationship: '', contact: '' }])}
            >
              Add a reference
            </Button>
          </section>

          {/* 7. Last thing ------------------------------------------- */}
          <section className="mb-7">
            <h2 className="text-lg font-semibold mb-3">7. Last thing</h2>

            <div className="flex items-center gap-3 mb-5">
              <Checkbox
                id="hand-available"
                checked={available}
                onCheckedChange={(v) => setAvailable(v === true)}
                className="w-6 h-6"
              />
              <Label htmlFor="hand-available" className="text-base">Taking work now</Label>
            </div>

            <div className="mb-5">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="hand-background"
                  checked={backgroundChecked}
                  onCheckedChange={(v) => setBackgroundChecked(v === true)}
                  className="w-6 h-6"
                />
                <Label htmlFor="hand-background" className="text-base">
                  I have had a background check done
                </Label>
              </div>
              {backgroundChecked && (
                <Input
                  value={backgroundCheckBy}
                  onChange={(e) => setBackgroundCheckBy(e.target.value)}
                  placeholder="Who did it, and when"
                  aria-label="Who did the background check"
                  className="h-12 mt-2"
                />
              )}
              <p className="text-xs text-muted-foreground mt-2">
                This is your own statement. Sow2Grow does not check it, and it is
                shown to others as your claim.
              </p>
            </div>

            <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/5 p-4">
              <div className="flex gap-3">
                <Checkbox
                  id="hand-legal"
                  checked={legalConfirmed}
                  onCheckedChange={(v) => setLegalConfirmed(v === true)}
                  className="w-6 h-6 mt-0.5 shrink-0"
                />
                <Label htmlFor="hand-legal" className="text-sm leading-relaxed cursor-pointer">
                  {HAND_LEGAL_CONFIRMATION}
                </Label>
              </div>
              {!legalConfirmed && (
                <p className="text-xs text-muted-foreground mt-3 ml-9">
                  You have to tick this before you can offer your hand.
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
            label={isEdit ? 'Save changes' : 'Offer my hand'}
            progressWord={isEdit ? 'ready' : undefined}
          />
        </>
      )}
    </div>
  );
}
