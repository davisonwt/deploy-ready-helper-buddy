import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Eye, ImagePlus, X, Loader2, Plus, PartyPopper, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { launchConfetti } from '@/utils/confetti';
import CoverDropZone, { type CoverResult } from '@/components/sowing/CoverDropZone';
import PlantButton from '@/components/sowing/PlantButton';
import WanderingMemberCard from '@/components/wandering/WanderingMemberCard';
import ShareSeedDialog from '@/components/share/ShareSeedDialog';
import { getPreset } from '@/lib/store/presets';

type Role = 'hand' | 'wheel' | 'pillow';

const ROLE_META: Record<Role, { label: string; emoji: string }> = {
  hand: { label: 'Wandering Hand', emoji: '🤲' },
  wheel: { label: 'Wandering Wheel', emoji: '🚗' },
  pillow: { label: 'Wandering Pillow', emoji: '🛏️' },
};

const PHOTO_PROMPT: Record<Role, string> = {
  hand: 'A photo of you',
  wheel: 'A photo of your vehicle',
  pillow: 'A photo of your place',
};

const TAGLINE_LABEL: Record<Role, string> = {
  hand: 'What do you do?',
  wheel: 'What do you drive?',
  pillow: 'What do you host?',
};

const TAGLINE_PLACEHOLDER: Record<Role, string> = {
  hand: 'e.g. Plumbing, electrical & general repairs',
  wheel: 'e.g. Bakkie with trailer, local deliveries',
  pillow: 'e.g. Cosy garden cottage, sleeps 2',
};

const GALLERY_PROMPT: Record<Role, string> = {
  hand: "jobs you've done",
  wheel: "your vehicles and loads you've moved",
  pillow: 'your rooms, the view, the kitchen',
};

const SELF_OPERATION_DECLARATION =
  "I own this and I operate it myself. I am not sub-letting, sub-contracting or renting on someone else's behalf.";

const MIN_GALLERY_PHOTOS = 3;
const MAX_GALLERY_PHOTOS = 8;
const MAX_TESTIMONIALS = 3;
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;

// Blank/country-level location values that shouldn't masquerade as a
// town — a role card that reads "Bethlehem" is trustworthy; one that
// reads "South Africa" tells a grower nothing about where to find them.
const COUNTRY_LIKE = /^(south africa|zimbabwe|namibia|botswana|zambia|mozambique|lesotho|eswatini|swaziland)$/i;

interface Testimonial {
  name: string;
  town: string;
  quote: string;
}

const emptyTestimonial = (): Testimonial => ({ name: '', town: '', quote: '' });

async function uploadGalleryPhoto(file: File, userId: string): Promise<CoverResult> {
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `covers/${userId}/gallery-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from('premium-room').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || 'image/jpeg',
  });
  if (error) throw error;
  const { data } = supabase.storage.from('premium-room').getPublicUrl(path);
  return { fileUrl: data.publicUrl, storagePath: path };
}

/**
 * The role-unlock screen, spec-service-seeds.md §4 — rebuilt to the
 * /sow/art standard: shared pieces (CoverDropZone, PlantButton's progress
 * counter, ShareSeedDialog), the role's preset (banner/accent/promise
 * from presets.ts), and a live "How you'll appear" preview using the
 * exact same WanderingMemberCard component the Directory renders — not
 * a lookalike. Heart never lands here — it keeps its own onboarding at
 * /tribal-hearts.
 */
export default function RegisterWanderingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const roleParam = searchParams.get('role');
  const role: Role | null = roleParam === 'hand' || roleParam === 'wheel' || roleParam === 'pillow' ? roleParam : null;
  const preset = role ? getPreset(role) : null;
  const accent = preset?.accent ?? '#16a34a';

  const [photo, setPhoto] = useState<CoverResult | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [baseTown, setBaseTown] = useState('');
  const [tagline, setTagline] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [galleryPhotos, setGalleryPhotos] = useState<CoverResult[]>([]);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const [testimonials, setTestimonials] = useState<Testimonial[]>([emptyTestimonial()]);

  const [selfOperated, setSelfOperated] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!user) { setLoadingProfile(false); return; }
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, first_name, last_name, location, latitude, longitude')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!alive) return;
      if (data) {
        setDisplayName(data.display_name || [data.first_name, data.last_name].filter(Boolean).join(' ') || '');
        const loc = (data.location || '').trim();
        setBaseTown(loc && !COUNTRY_LIKE.test(loc) ? loc : '');
        setLat(data.latitude ?? null);
        setLng(data.longitude ?? null);
      }
      setLoadingProfile(false);
    })();
    return () => { alive = false; };
  }, [user]);

  const addGalleryPhoto = async (file: File) => {
    if (!user || galleryPhotos.length >= MAX_GALLERY_PHOTOS) return;
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      toast.error('That photo is too large — the limit is 10 MB.');
      return;
    }
    setUploadingGallery(true);
    try {
      const result = await uploadGalleryPhoto(file, user.id);
      setGalleryPhotos((prev) => [...prev, result]);
    } catch (err) {
      console.error('Gallery photo upload failed:', err);
      toast.error('Could not upload that photo. Please try again.');
    } finally {
      setUploadingGallery(false);
    }
  };

  const removeGalleryPhoto = (index: number) => {
    setGalleryPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTestimonial = (index: number, patch: Partial<Testimonial>) => {
    setTestimonials((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  };
  const addTestimonial = () => {
    if (testimonials.length >= MAX_TESTIMONIALS) return;
    setTestimonials((prev) => [...prev, emptyTestimonial()]);
  };
  const removeTestimonial = (index: number) => {
    setTestimonials((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const photoReady = !!photo;
  const nameReady = displayName.trim().length > 0;
  const townReady = baseTown.trim().length > 0;
  const taglineReady = tagline.trim().length > 0;
  const galleryReady = galleryPhotos.length >= MIN_GALLERY_PHOTOS;
  const isFilledTestimonial = (t: Testimonial) => !!t.name.trim() && !!t.town.trim() && !!t.quote.trim();
  const testimonialsReady = testimonials.some(isFilledTestimonial);

  const completed = [photoReady, nameReady, townReady, taglineReady, galleryReady, testimonialsReady]
    .filter(Boolean).length;

  const missingReason = useMemo(() => {
    if (!role) return undefined;
    if (!photoReady) return 'Add a photo to continue.';
    if (!nameReady) return 'Add your display name.';
    if (!townReady) return 'Add your base town.';
    if (!taglineReady) return `Answer "${TAGLINE_LABEL[role]}"`;
    if (!galleryReady) return `Add at least ${MIN_GALLERY_PHOTOS} photos — ${GALLERY_PROMPT[role]}.`;
    if (!testimonialsReady) return 'Add at least one testimonial.';
    return undefined;
  }, [role, photoReady, nameReady, townReady, taglineReady, galleryReady, testimonialsReady]);

  if (!role || !preset) {
    return (
      <div className="container max-w-md mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/sow')} className="mb-4 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" /> Sow
        </Button>
        <p className="text-sm text-muted-foreground">
          Pick a role from the <Link to="/sow" className="underline">sow chooser</Link> to unlock it.
        </p>
      </div>
    );
  }

  const meta = ROLE_META[role];
  const doorLink = `/wandering/${role}`;

  const handleSubmit = async () => {
    if (!user) { toast.error('Please log in to unlock this role.'); return; }
    if (completed < 6) return;
    if (!selfOperated || !acceptedTerms) {
      toast.error('Please check both boxes below to continue.');
      return;
    }
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const filledTestimonials = testimonials.filter(isFilledTestimonial);
      const { error } = await supabase.from('wandering_roles').upsert(
        {
          user_id: user.id,
          role,
          display_name: displayName.trim(),
          base_town: baseTown.trim(),
          lat,
          lng,
          photo_url: photo?.fileUrl ?? null,
          tagline: tagline.trim(),
          gallery_urls: galleryPhotos.map((p) => p.fileUrl),
          testimonials: filledTestimonials,
          status: 'active',
          declared_self_operated_at: now,
          accepted_terms_at: now,
        } as any,
        { onConflict: 'user_id,role' }
      );
      if (error) throw error;

      // spec-storefronts.md §4a: the default business gets the matching
      // shop preset the moment the role unlocks, so a Hand/Wheel/Pillow
      // shop looks finished from day one — but only if it has no theme
      // yet; a business that already picked one (or unlocked a different
      // role first) keeps it. Best-effort, never blocks the role unlock.
      try {
        const { data: defaultBiz } = await supabase
          .from('companies')
          .select('id, store_theme')
          .eq('owner_user_id', user.id)
          .eq('is_default', true)
          .maybeSingle();
        const theme = (defaultBiz as any)?.store_theme as { preset?: string } | null;
        if (defaultBiz && !theme?.preset) {
          await supabase
            .from('companies')
            .update({ store_theme: { ...(theme || {}), preset: role } })
            .eq('id', (defaultBiz as any).id);
        }
      } catch (themeErr) {
        console.warn('Could not set the shop preset:', themeErr);
      }

      launchConfetti();
      toast.success(`${meta.label} unlocked!`);
      setSubmitted(true);
    } catch (err) {
      console.error('Role unlock failed:', err);
      toast.error(err instanceof Error ? err.message : 'Could not unlock this role. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="container max-w-lg mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-muted-foreground">Please log in to unlock a Wandering role.</p>
        <Button onClick={() => navigate('/login')}>Log in</Button>
      </div>
    );
  }

  const bannerStyle = preset.bannerImage
    ? { backgroundImage: `url(${preset.bannerImage})`, backgroundSize: 'cover', backgroundPosition: 'center', borderColor: `${accent}66` }
    : { background: `linear-gradient(135deg, ${accent}, ${accent}55)`, borderColor: `${accent}66` };

  if (submitted) {
    return (
      <div className="container max-w-lg mx-auto px-4 py-10 text-center space-y-6">
        <div className="flex justify-start">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="-ml-2">
            <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
          </Button>
        </div>
        <div
          className="relative w-full h-32 overflow-hidden rounded-2xl border"
          style={bannerStyle}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          {role === 'hand' && preset.bannerImage ? (
            <>
              <p className="absolute inset-x-0 top-0 p-4 text-white font-semibold drop-shadow">{preset.promise}</p>
              <div className="absolute inset-x-0 bottom-0 h-[45%] bg-[#081310]/95 flex items-center justify-center px-3 gap-1.5 flex-wrap">
                {preset.chips.map((chip) => (
                  <span
                    key={chip}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${accent}22`, color: accent, border: `1px solid ${accent}55` }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex items-end p-4">
              <p className="relative text-white font-semibold drop-shadow">{preset.promise}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <PartyPopper className="w-10 h-10" style={{ color: accent }} />
          <h1 className="text-2xl font-bold">You're a {meta.label}!</h1>
          <Badge
            variant="secondary"
            className="text-sm px-3 py-1"
            style={{ backgroundColor: `${accent}1a`, color: accent, borderColor: `${accent}55` }}
          >
            {meta.emoji} {meta.label}
          </Badge>
        </div>

        <div className="max-w-xs mx-auto">
          <WanderingMemberCard
            name={displayName}
            roleLabel={meta.label}
            roleEmoji={meta.emoji}
            color={accent}
            location={baseTown}
            tagline={tagline}
            photoUrl={photo?.fileUrl ?? null}
            galleryUrls={galleryPhotos.map((p) => p.fileUrl)}
          />
        </div>

        <div className="space-y-2.5">
          <p className="text-sm text-muted-foreground">
            Your door: <Link to={doorLink} className="underline" style={{ color: accent }}>{doorLink}</Link>
          </p>
          <Button onClick={() => setShareOpen(true)} variant="outline" className="w-full">
            <Share2 className="w-4 h-4 mr-2" /> Share your door
          </Button>
          <Button onClick={() => navigate(`/sow/${role}`)} className="w-full" style={{ backgroundColor: accent }}>
            Sow your first {meta.label} seed
          </Button>
        </div>

        <ShareSeedDialog
          open={shareOpen}
          onOpenChange={setShareOpen}
          seedId={`wandering-${role}-${user.id}`}
          title={`I'm a ${meta.label}`}
          subtitle={tagline}
          image={photo?.fileUrl}
          openPath={doorLink}
          feedKind="photo"
        />
      </div>
    );
  }

  const previewCard = (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">How you'll appear</p>
      <WanderingMemberCard
        name={displayName}
        roleLabel={meta.label}
        roleEmoji={meta.emoji}
        color={accent}
        location={baseTown}
        tagline={tagline}
        photoUrl={photo?.fileUrl ?? null}
        galleryUrls={galleryPhotos.map((p) => p.fileUrl)}
      />
    </div>
  );

  return (
    <div className="container max-w-5xl mx-auto px-4 py-6 md:py-8 pb-28 md:pb-8">
      <Button variant="ghost" size="sm" onClick={() => navigate('/sow')} className="mb-4 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-2" /> Sow
      </Button>

      <div
        className="relative w-full h-32 md:h-44 lg:h-56 overflow-hidden rounded-2xl mb-6 border"
        style={{ ...bannerStyle, boxShadow: `0 0 40px ${accent}40` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />
        {/* Hand's banner artwork bakes in "Plumbers, Electricians,
            Mechanics, Dentists, Doctors, & More" — Dentists/Doctors aren't
            in presets.ts's own chips (spec-wandering-doors.md §4, no
            licensed professionals yet), so that row is covered here
            rather than left showing categories we haven't cleared. Title/
            promise text moves to the top for this case so it doesn't
            collide with the chip band pinned to the bottom. */}
        {role === 'hand' && preset.bannerImage ? (
          <>
            <div className="absolute inset-x-0 top-0 p-4 md:p-6">
              <h1 className="text-white text-xl md:text-3xl font-black tracking-tight drop-shadow-lg">
                Become a {meta.label}
              </h1>
              <p className="text-white/85 text-sm md:text-base mt-1 max-w-2xl drop-shadow">{preset.promise}</p>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-[45%] bg-[#081310]/95 flex items-center justify-center px-3 gap-1.5 flex-wrap">
              {preset.chips.map((chip) => (
                <span
                  key={chip}
                  className="text-[10px] md:text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${accent}22`, color: accent, border: `1px solid ${accent}55` }}
                >
                  {chip}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6">
            <h1 className="text-white text-xl md:text-3xl font-black tracking-tight drop-shadow-lg">
              Become a {meta.label}
            </h1>
            <p className="text-white/85 text-sm md:text-base mt-1 max-w-2xl drop-shadow">{preset.promise}</p>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <CoverDropZone bucket="premium-room" pathPrefix={`covers/${user.id}`} onChange={setPhoto} required />
            <div className="flex-1 space-y-1.5">
              <Label>{PHOTO_PROMPT[role]}</Label>
              <p className="text-xs text-muted-foreground">This is your photo on your Directory card and door.</p>
            </div>
          </div>

          <div>
            <Label htmlFor="wandering-name">Display name</Label>
            <Input
              id="wandering-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loadingProfile}
              placeholder="How you'll show up to growers"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="wandering-town">Base town</Label>
            <Input
              id="wandering-town"
              value={baseTown}
              onChange={(e) => setBaseTown(e.target.value)}
              disabled={loadingProfile}
              placeholder="e.g. Bethlehem, Free State"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="wandering-tagline">{TAGLINE_LABEL[role]}</Label>
            <Input
              id="wandering-tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder={TAGLINE_PLACEHOLDER[role]}
              className="mt-1.5"
              maxLength={80}
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Gallery — {GALLERY_PROMPT[role]}</Label>
            <div className="flex flex-wrap gap-2">
              {galleryPhotos.map((p, i) => (
                <div key={p.storagePath} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                  <img src={p.fileUrl} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeGalleryPhoto(i)}
                    className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5 hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {galleryPhotos.length < MAX_GALLERY_PHOTOS && (
                <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/60 flex items-center justify-center cursor-pointer">
                  {uploadingGallery ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <ImagePlus className="w-4 h-4 text-muted-foreground" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingGallery}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) addGalleryPhoto(f); e.target.value = ''; }}
                  />
                </label>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {galleryPhotos.length} of {MAX_GALLERY_PHOTOS} — at least {MIN_GALLERY_PHOTOS} to be ready.
            </p>
          </div>

          <div>
            <Label className="mb-1.5 block">Testimonials</Label>
            <p className="text-xs text-muted-foreground mb-2">
              From a customer — they'll be able to add their own after a booking.
            </p>
            <div className="space-y-3">
              {testimonials.map((t, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2 relative">
                  {testimonials.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTestimonial(i)}
                      className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={t.name}
                      onChange={(e) => updateTestimonial(i, { name: e.target.value })}
                      placeholder="Name"
                    />
                    <Input
                      value={t.town}
                      onChange={(e) => updateTestimonial(i, { town: e.target.value })}
                      placeholder="Town"
                    />
                  </div>
                  <Textarea
                    value={t.quote}
                    onChange={(e) => updateTestimonial(i, { quote: e.target.value })}
                    placeholder="A short quote about working with you"
                    rows={2}
                  />
                </div>
              ))}
            </div>
            {testimonials.length < MAX_TESTIMONIALS && (
              <Button type="button" variant="ghost" size="sm" onClick={addTestimonial} className="mt-2 px-0 text-muted-foreground">
                <Plus className="w-4 h-4 mr-1.5" /> Add another testimonial
              </Button>
            )}
          </div>

          <div className="pt-2 space-y-3">
            <div
              onClick={() => setSelfOperated((v) => !v)}
              className="flex items-start gap-2.5 rounded-xl border-2 p-4 cursor-pointer transition-colors"
              style={selfOperated ? { borderColor: accent, backgroundColor: `${accent}0d` } : undefined}
            >
              <Checkbox
                id="self-operated"
                checked={selfOperated}
                onCheckedChange={(v) => setSelfOperated(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="self-operated" className="text-sm font-normal leading-snug cursor-pointer">
                {SELF_OPERATION_DECLARATION}
              </Label>
            </div>

            <div
              onClick={() => setAcceptedTerms((v) => !v)}
              className="flex items-start gap-2.5 rounded-xl border-2 p-4 cursor-pointer transition-colors"
              style={acceptedTerms ? { borderColor: accent, backgroundColor: `${accent}0d` } : undefined}
            >
              <Checkbox
                id="accept-terms"
                checked={acceptedTerms}
                onCheckedChange={(v) => setAcceptedTerms(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="accept-terms" className="text-sm font-normal leading-snug cursor-pointer" onClick={(e) => e.stopPropagation()}>
                I accept Sow2Grow's <Link to="/terms" className="underline" target="_blank">Terms</Link>.
              </Label>
            </div>
          </div>

          <div className="hidden md:block pt-2">
            <PlantButton
              requiredCount={6}
              completedCount={completed}
              missingReason={missingReason}
              submitting={submitting}
              onClick={handleSubmit}
              progressWord="ready"
              label={`Unlock ${meta.label}`}
              loadingLabel="Unlocking…"
            />
          </div>
        </div>

        <div className="hidden md:block">
          <div className="sticky top-6">{previewCard}</div>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-background border-t p-3 space-y-2">
        <Sheet>
          <SheetTrigger asChild>
            <button type="button" className="w-full flex items-center gap-2 text-xs text-muted-foreground">
              <Eye className="w-3.5 h-3.5" /> Preview how you'll appear
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
          onClick={handleSubmit}
          progressWord="ready"
          label={`Unlock ${meta.label}`}
          loadingLabel="Unlocking…"
        />
      </div>
    </div>
  );
}
