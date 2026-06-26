/**
 * BecomeWhispererPage — Professional Whisperer registration.
 *
 * Lets a signed-in tribe member create / update their public Whisperer
 * profile: headline, bio, specialties, languages, location, rates, years of
 * experience, plus a portfolio of images and videos uploaded to the
 * `whisperer-portfolios` storage bucket. When they hit "List me on the
 * Whisperers feed" the row's `is_listed` flag flips to true and they appear
 * on /whisperers.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, Image as ImageIcon, Video as VideoIcon, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

type MediaItem = { type: 'image' | 'video'; url: string; path: string; caption?: string };

const SPECIALTY_OPTIONS = [
  'Live streaming', 'Short-form video', 'Long-form video', 'Podcasting',
  'Writing & blogging', 'Email marketing', 'Influencer marketing',
  'Paid ads', 'SEO', 'Community building', 'Brand storytelling',
  'Product reviews', 'Affiliate marketing', 'Photography', 'Graphic design',
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export default function BecomeWhispererPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [yearsExperience, setYearsExperience] = useState<number | ''>('');
  const [location, setLocation] = useState('');
  const [rates, setRates] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string>('');
  const [media, setMedia] = useState<MediaItem[]>([]);

  // Load existing whisperer row if present.
  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from('whisperers')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!alive) return;
      if (error) console.error(error);
      if (data) {
        setExistingId(data.id);
        setDisplayName(data.display_name || '');
        setHeadline(data.headline || '');
        setBio(data.bio || '');
        setYearsExperience(data.years_experience ?? '');
        setLocation(data.location || '');
        setRates(data.rates || '');
        setPortfolioUrl(data.portfolio_url || '');
        setSpecialties(Array.isArray(data.specialties) ? data.specialties : []);
        setLanguages((data.languages || []).join(', '));
        setMedia(Array.isArray(data.portfolio_media) ? (data.portfolio_media as any) : []);
      } else {
        // Prefill display name from profile
        const { data: p } = await supabase
          .from('profiles')
          .select('display_name, first_name, last_name')
          .eq('user_id', user.id)
          .maybeSingle();
        if (p) {
          const dn = (p.display_name || '').trim() || `${p.first_name || ''} ${p.last_name || ''}`.trim();
          if (dn) setDisplayName(dn);
        }
      }
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user?.id]);

  const toggleSpecialty = (s: string) => {
    setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || !files.length || !user?.id) return;
    setUploading(true);
    const next: MediaItem[] = [];
    try {
      for (const file of Array.from(files)) {
        if (file.size > 100 * 1024 * 1024) {
          toast.error(`${file.name} is over 100MB — skipped`);
          continue;
        }
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');
        if (!isVideo && !isImage) {
          toast.error(`${file.name} is not an image or video — skipped`);
          continue;
        }
        const ext = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
        const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage
          .from('whisperer-portfolios')
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) {
          console.error(error);
          toast.error(`Upload failed: ${file.name}`);
          continue;
        }
        const { data: signed } = await supabase.storage
          .from('whisperer-portfolios')
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        next.push({
          type: isVideo ? 'video' : 'image',
          url: signed?.signedUrl || `${SUPABASE_URL}/storage/v1/object/authenticated/whisperer-portfolios/${path}`,
          path,
        });
      }
      if (next.length) {
        setMedia(prev => [...prev, ...next]);
        toast.success(`${next.length} file${next.length > 1 ? 's' : ''} uploaded`);
      }
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = async (item: MediaItem) => {
    setMedia(prev => prev.filter(m => m.path !== item.path));
    try {
      await supabase.storage.from('whisperer-portfolios').remove([item.path]);
    } catch (e) { console.warn(e); }
  };

  const save = async (publish: boolean) => {
    if (!user?.id) { toast.error('Sign in first'); return; }
    if (!displayName.trim()) { toast.error('Display name is required'); return; }
    if (publish && media.length === 0) {
      toast.error('Add at least one portfolio image or video before listing');
      return;
    }
    if (publish && !bio.trim()) {
      toast.error('Add a short bio before listing');
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      display_name: displayName.trim(),
      headline: headline.trim() || null,
      bio: bio.trim() || null,
      years_experience: yearsExperience === '' ? null : Number(yearsExperience),
      location: location.trim() || null,
      rates: rates.trim() || null,
      portfolio_url: portfolioUrl.trim() || null,
      specialties: specialties.length ? specialties : null,
      languages: languages.split(',').map(s => s.trim()).filter(Boolean),
      portfolio_media: media,
      is_listed: publish,
      is_active: true,
    };
    const { data, error } = existingId
      ? await supabase.from('whisperers').update(payload).eq('id', existingId).select().single()
      : await supabase.from('whisperers').insert(payload).select().single();
    setSaving(false);
    if (error) {
      console.error(error);
      toast.error(error.message || 'Could not save profile');
      return;
    }
    if (data) setExistingId(data.id);
    toast.success(publish ? 'You are live on the Whisperers feed!' : 'Draft saved');
    if (publish) navigate('/whisperers');
  };

  const counts = useMemo(() => ({
    images: media.filter(m => m.type === 'image').length,
    videos: media.filter(m => m.type === 'video').length,
  }), [media]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0f14] to-[#0a1410] text-emerald-100">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0f14] via-[#0a1410] to-[#0a0f14] text-emerald-50">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-emerald-200 hover:text-white text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          <Link to="/whisperers" className="text-sm text-purple-200 hover:text-white">View Whisperers feed →</Link>
        </div>

        <header className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-400/30 text-purple-200 text-xs mb-3">
            🌬️ Whisperer Registration
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Become a Whisperer</h1>
          <p className="text-emerald-200/80 mt-2 text-sm md:text-base">
            List yourself as a marketer or content creator. Once you publish, tribe members will find
            you on the Whisperers feed and partner with you on seeds they want to take viral.
          </p>
        </header>

        <section className="space-y-5 bg-black/30 border border-emerald-500/15 rounded-2xl p-5 md:p-6">
          <Field label="Display name *">
            <input className={inp} value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={80} />
          </Field>
          <Field label="Headline" hint="One line that tells tribe members what you do.">
            <input className={inp} placeholder="e.g. Live-stream host who takes farm seeds viral"
              value={headline} onChange={e => setHeadline(e.target.value)} maxLength={140} />
          </Field>
          <Field label="About you *" hint="Tell tribe members who you are and what you have done before.">
            <textarea className={`${inp} min-h-[140px] resize-y`} value={bio} onChange={e => setBio(e.target.value)} maxLength={2000} />
            <div className="text-xs text-emerald-300/60 mt-1">{bio.length}/2000</div>
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Years of experience">
              <input type="number" min={0} max={70} className={inp}
                value={yearsExperience}
                onChange={e => setYearsExperience(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value || '0', 10)))} />
            </Field>
            <Field label="Location">
              <input className={inp} placeholder="City, country" value={location} onChange={e => setLocation(e.target.value)} maxLength={120} />
            </Field>
            <Field label="Languages" hint="Comma separated">
              <input className={inp} placeholder="English, Afrikaans" value={languages} onChange={e => setLanguages(e.target.value)} />
            </Field>
            <Field label="Rates / bestowal preference">
              <input className={inp} placeholder="e.g. 10% bestowal split per seed"
                value={rates} onChange={e => setRates(e.target.value)} maxLength={140} />
            </Field>
          </div>

          <Field label="Specialties">
            <div className="flex flex-wrap gap-2">
              {SPECIALTY_OPTIONS.map(s => {
                const on = specialties.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSpecialty(s)}
                    className={`px-3 py-1.5 rounded-full text-xs border transition ${
                      on
                        ? 'bg-purple-500/30 border-purple-400 text-white'
                        : 'bg-white/5 border-white/10 text-emerald-100 hover:bg-white/10'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="External portfolio link (optional)">
            <input className={inp} placeholder="https://…" value={portfolioUrl} onChange={e => setPortfolioUrl(e.target.value)} maxLength={500} />
          </Field>
        </section>

        {/* Portfolio media */}
        <section className="mt-6 bg-black/30 border border-emerald-500/15 rounded-2xl p-5 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Portfolio of past work *</h2>
            <div className="text-xs text-emerald-300/70">
              {counts.images} image{counts.images === 1 ? '' : 's'} · {counts.videos} video{counts.videos === 1 ? '' : 's'}
            </div>
          </div>
          <p className="text-sm text-emerald-200/70 mb-4">
            Upload images or videos that show what you have done before. Max 100MB per file.
          </p>

          <label className="flex flex-col items-center justify-center border-2 border-dashed border-purple-400/40 rounded-xl py-8 px-4 cursor-pointer hover:bg-white/[0.03] transition">
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={e => handleUpload(e.target.files)}
              disabled={uploading}
            />
            {uploading ? (
              <><Loader2 className="w-6 h-6 animate-spin text-purple-300 mb-2" /><span className="text-sm">Uploading…</span></>
            ) : (
              <>
                <Upload className="w-6 h-6 text-purple-300 mb-2" />
                <span className="text-sm font-medium text-emerald-100">Click to upload images or videos</span>
                <span className="text-xs text-emerald-300/60 mt-1">JPG · PNG · MP4 · MOV — up to 100MB each</span>
              </>
            )}
          </label>

          {media.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
              {media.map(m => (
                <div key={m.path} className="relative group rounded-xl overflow-hidden bg-black/50 aspect-video border border-white/10">
                  {m.type === 'image' ? (
                    <img src={m.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <video src={m.url} className="w-full h-full object-cover" muted playsInline />
                  )}
                  <div className="absolute top-1 left-1 px-2 py-0.5 rounded bg-black/60 text-[10px] flex items-center gap-1">
                    {m.type === 'image' ? <ImageIcon className="w-3 h-3" /> : <VideoIcon className="w-3 h-3" />}
                    {m.type}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeMedia(m)}
                    className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-red-500/80 opacity-0 group-hover:opacity-100 transition"
                    aria-label="Remove"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="sticky bottom-3 mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => save(false)}
            disabled={saving}
            className="flex-1 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save as draft'}
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            disabled={saving}
            className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-400 hover:to-fuchsia-400 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {saving ? 'Publishing…' : 'List me on the Whisperers feed'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp =
  'w-full rounded-lg bg-black/40 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-50 placeholder-emerald-300/40 focus:outline-none focus:border-purple-400/60';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-emerald-100 mb-1">{label}</label>
      {hint && <div className="text-xs text-emerald-300/60 mb-1.5">{hint}</div>}
      {children}
    </div>
  );
}
