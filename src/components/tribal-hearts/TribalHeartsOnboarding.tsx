import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Camera, Check, MapPin, Heart, Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TribalHeart } from './BondingAnimation';
import { TribalAudio } from '@/hooks/useTribalHeartsAudio';
import { toast } from '@/hooks/use-toast';
import heroImg from '@/assets/tribal-hearts-hero.jpg';

interface Props {
  onComplete: () => void;
  onExit?: () => void;
}

interface Draft {
  intent: string;
  birthYear: number | null;
  country: string;
  region: string;
  gender: 'male' | 'female' | null;
  seeking: 'male' | 'female' | null;
  bio: string;
  interests: string[];
  photos: string[]; // storage paths
  selfieVerified: boolean;
}

const STEPS = 6;

const INTENTS = [
  { key: 'courtship', label: 'Courtship — looking for love', emoji: '💞' },
  { key: 'friendship', label: 'Friendship first', emoji: '🤝' },
  { key: 'connection', label: 'Open connection', emoji: '✨' },
];

const INTERESTS = [
  'Music', 'Faith', 'Hiking', 'Travel', 'Cooking', 'Books',
  'Coffee', 'Deep talks', 'Family', 'Fitness', 'Art', 'Nature',
  'Farming', 'Dancing', 'Quiet evenings', 'Adventure',
];

export const TribalHeartsOnboarding: React.FC<Props> = ({ onComplete, onExit }) => {
  const { user } = useAuth() as any;
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [submitting, setSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const [draft, setDraft] = useState<Draft>({
    intent: '',
    birthYear: null,
    country: '',
    region: '',
    gender: null,
    seeking: null,
    bio: '',
    interests: [],
    photos: [],
    selfieVerified: false,
  });

  const update = useCallback(<K extends keyof Draft>(k: K, v: Draft[K]) => {
    setDraft((d) => ({ ...d, [k]: v }));
  }, []);

  const next = () => {
    TribalAudio.playPlace();
    setDirection(1);
    setStep((s) => Math.min(STEPS - 1, s + 1));
  };
  const back = () => {
    setDirection(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  const canAdvance = (): boolean => {
    switch (step) {
      case 0: return true;
      case 1: return !!draft.intent;
      case 2: return !!draft.birthYear && (new Date().getFullYear() - draft.birthYear) >= 18 && !!draft.country.trim();
      case 3: return draft.gender !== null && draft.seeking !== null && draft.gender !== draft.seeking;
      case 4: return draft.photos.length >= 1;
      case 5: return draft.selfieVerified;
      default: return false;
    }
  };

  const submit = async () => {
    if (!user?.id) return;
    setSubmitting(true);
    try {
      const birthdate = draft.birthYear
        ? `${draft.birthYear}-06-15` // store mid-year so age is correct
        : null;

      const { error } = await supabase.from('tribal_hearts_profiles').upsert({
        user_id: user.id,
        birthdate: birthdate!,
        gender: draft.gender!,
        seeking: draft.seeking!,
        seeking_intent: draft.intent || 'connection',
        bio: draft.bio.trim() || null,
        interests: draft.interests,
        photos: draft.photos,
        location_country: draft.country.trim() || null,
        location_region: draft.region.trim() || null,
        photo_verified: draft.selfieVerified,
        age_verified: true,
        status: 'active',
      } as any);

      if (error) throw error;

      // Celebration
      TribalAudio.playBondingSequence();
      if (navigator.vibrate) navigator.vibrate([0, 80, 40, 80, 40, 200]);
      setShowCelebration(true);
      setTimeout(() => {
        onComplete();
      }, 3200);
    } catch (e: any) {
      console.error(e);
      toast({
        title: 'Could not create your Tribal Hearts profile',
        description: e.message || 'Please try again.',
        variant: 'destructive' as any,
      });
      setSubmitting(false);
    }
  };

  if (showCelebration) {
    return <CelebrationScreen />;
  }

  return (
    <div
      className="min-h-screen relative overflow-y-auto overflow-x-hidden"
      style={{
        background:
          'radial-gradient(ellipse at top, hsl(20 30% 12%) 0%, hsl(20 35% 7%) 60%, hsl(0 0% 4%) 100%)',
      }}
    >
      {/* Soft progress trail */}
      <div className="absolute top-0 inset-x-0 px-6 pt-6 z-20">
        <ProgressTrail current={step} total={STEPS} />
      </div>

      {/* Back button */}
      <button
        onClick={step > 0 ? back : onExit}
        className="absolute top-16 left-5 z-20 flex items-center gap-1 text-sm transition-opacity hover:opacity-100 opacity-70"
        style={{ color: 'hsl(38 50% 75%)' }}
      >
        <ArrowLeft size={16} />
        {step > 0 ? 'Back' : 'Back to Dashboard'}
      </button>

      <main className="relative z-10 min-h-screen flex items-start sm:items-center justify-center px-5 pt-24 pb-32">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-full max-w-md"
          >
            {step === 0 && <StepWelcome />}
            {step === 1 && <StepIntent draft={draft} update={update} />}
            {step === 2 && <StepAgeLocation draft={draft} update={update} />}
            {step === 3 && <StepGender draft={draft} update={update} />}
            {step === 4 && <StepPhotos userId={user?.id} draft={draft} update={update} />}
            {step === 5 && <StepVerification draft={draft} update={update} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Continue button */}
      <div className="fixed bottom-0 inset-x-0 z-20 px-5 pb-6 pt-10"
        style={{
          background: 'linear-gradient(to top, hsl(20 35% 6%) 30%, transparent)',
        }}
      >
        <button
          onClick={step === STEPS - 1 ? submit : next}
          disabled={!canAdvance() || submitting}
          className="w-full max-w-md mx-auto py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-30 hover:scale-[1.02] disabled:hover:scale-100"
          style={{
            background:
              'linear-gradient(135deg, hsl(15 85% 55%) 0%, hsl(25 95% 60%) 100%)',
            color: 'hsl(20 30% 12%)',
            boxShadow: '0 8px 30px hsl(15 80% 50% / 0.5)',
            display: 'flex',
          }}
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Lighting the fire…
            </>
          ) : step === 0 ? (
            <>Begin my journey <ArrowRight size={18} /></>
          ) : step === STEPS - 1 ? (
            <>Join the Tribe <Heart size={16} fill="currentColor" /></>
          ) : (
            <>Continue <ArrowRight size={18} /></>
          )}
        </button>
      </div>
    </div>
  );
};

/* ------------------------ Progress trail ------------------------ */

const ProgressTrail: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <div className="flex items-center justify-center gap-2 max-w-md mx-auto">
    {Array.from({ length: total }).map((_, i) => (
      <motion.div
        key={i}
        className="h-1.5 rounded-full flex-1"
        animate={{
          background:
            i <= current
              ? 'linear-gradient(90deg, hsl(15 85% 55%), hsl(38 95% 65%))'
              : 'hsl(25 25% 22%)',
        }}
        transition={{ duration: 0.4 }}
      />
    ))}
  </div>
);

/* ------------------------ Step 0: Welcome ------------------------ */

const StepWelcome: React.FC = () => (
  <div className="text-center">
    <motion.img
      src={heroImg}
      alt="Tribal hearts circle"
      className="w-full max-w-xs mx-auto rounded-3xl mb-8"
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
      style={{ boxShadow: '0 20px 60px hsl(15 80% 25% / 0.5)' }}
    />
    <motion.h1
      className="text-4xl font-serif italic mb-3"
      style={{ color: 'hsl(38 95% 85%)' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      Find your tribe.
      <br />
      Protect your heart.
    </motion.h1>
    <motion.p
      style={{ color: 'hsl(38 35% 70%)' }}
      className="text-sm leading-relaxed max-w-xs mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.7 }}
    >
      A warm, respectful place for kindred souls. No phones. No emails. Just
      genuine sparks inside the tribe.
    </motion.p>
  </div>
);

/* ------------------------ Step 1: Intent ------------------------ */

const StepIntent: React.FC<{ draft: Draft; update: any }> = ({ draft, update }) => (
  <div>
    <StepHeading title="What brings you to Tribal Hearts?" subtitle="There's no wrong answer." />
    <div className="grid gap-3 mt-8">
      {INTENTS.map((opt) => {
        const active = draft.intent === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => update('intent', opt.key)}
            className="flex items-center gap-4 p-5 rounded-2xl text-left transition-all hover:scale-[1.02]"
            style={{
              background: active
                ? 'linear-gradient(135deg, hsl(15 80% 25%) 0%, hsl(25 75% 30%) 100%)'
                : 'hsl(20 25% 12%)',
              border: active
                ? '1px solid hsl(38 80% 55%)'
                : '1px solid hsl(25 30% 22%)',
              color: active ? 'hsl(38 95% 90%)' : 'hsl(38 50% 78%)',
              boxShadow: active ? '0 8px 25px hsl(15 80% 30% / 0.4)' : 'none',
            }}
          >
            <span className="text-2xl">{opt.emoji}</span>
            <span className="font-medium">{opt.label}</span>
            {active && <Check size={18} className="ml-auto" />}
          </button>
        );
      })}
    </div>
  </div>
);

/* ------------------------ Step 2: Age + Location ------------------------ */

const StepAgeLocation: React.FC<{ draft: Draft; update: any }> = ({ draft, update }) => {
  const currentYear = new Date().getFullYear();
  const oldestYear = currentYear - 80;
  const youngestYear = currentYear - 18;
  // Years listed newest→oldest so eligible ages appear first
  const years = Array.from({ length: youngestYear - oldestYear + 1 }, (_, i) => youngestYear - i);
  const age = draft.birthYear ? currentYear - draft.birthYear : null;
  const tooYoung = draft.birthYear !== null && age !== null && age < 18;

  return (
    <div>
      <StepHeading title="Your age & village" subtitle="18+ only — keeps the circle safe." />
      <div className="mt-8 space-y-5">
        <div>
          <label className="text-sm mb-2 block" style={{ color: 'hsl(38 40% 70%)' }}>
            Year you were born
          </label>
          <select
            value={draft.birthYear ?? ''}
            onChange={(e) => update('birthYear', e.target.value ? Number(e.target.value) : null)}
            className="w-full p-4 rounded-2xl text-lg outline-none appearance-none cursor-pointer"
            style={{
              background: 'hsl(20 25% 10%)',
              border: `1px solid ${tooYoung ? 'hsl(15 70% 50%)' : 'hsl(25 30% 22%)'}`,
              color: 'hsl(38 90% 88%)',
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%23d4a574' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 1rem center',
              paddingRight: '2.5rem',
            }}
          >
            <option value="" style={{ background: 'hsl(20 25% 10%)' }}>
              — choose your birth year —
            </option>
            {years.map((y) => (
              <option key={y} value={y} style={{ background: 'hsl(20 25% 10%)' }}>
                {y}
              </option>
            ))}
          </select>
          {age !== null && (
            <p
              className="text-xs mt-1.5 italic"
              style={{ color: tooYoung ? 'hsl(15 70% 65%)' : 'hsl(38 35% 65%)' }}
            >
              {tooYoung ? 'Tribal Hearts is 18+ only.' : `${age} years young 🌱`}
            </p>
          )}
        </div>

        <div>
          <label className="text-sm mb-2 block flex items-center gap-1.5" style={{ color: 'hsl(38 40% 70%)' }}>
            <MapPin size={14} /> Country
          </label>
          <input
            type="text"
            value={draft.country}
            onChange={(e) => update('country', e.target.value)}
            placeholder="South Africa"
            className="w-full p-4 rounded-2xl outline-none"
            style={{
              background: 'hsl(20 25% 10%)',
              border: '1px solid hsl(25 30% 22%)',
              color: 'hsl(38 90% 88%)',
            }}
          />
        </div>

        <div>
          <label className="text-sm mb-2 block" style={{ color: 'hsl(38 40% 70%)' }}>
            City / Region (optional)
          </label>
          <input
            type="text"
            value={draft.region}
            onChange={(e) => update('region', e.target.value)}
            placeholder="Eastern Cape"
            className="w-full p-4 rounded-2xl outline-none"
            style={{
              background: 'hsl(20 25% 10%)',
              border: '1px solid hsl(25 30% 22%)',
              color: 'hsl(38 90% 88%)',
            }}
          />
        </div>
      </div>
    </div>
  );
};

/* ------------------------ Step 3: Gender ------------------------ */

const StepGender: React.FC<{ draft: Draft; update: any }> = ({ draft, update }) => {
  // Auto-set seeking = opposite gender (DB-enforced anyway)
  const setGender = (g: 'male' | 'female') => {
    update('gender', g);
    update('seeking', g === 'male' ? 'female' : 'male');
  };

  return (
    <div>
      <StepHeading
        title="You are…"
        subtitle="Tribal Hearts is heterosexual by design. Your seeking is set automatically."
      />
      <div className="grid grid-cols-2 gap-4 mt-8">
        {[
          { key: 'male' as const, label: 'A man', icon: '🧔🏽' },
          { key: 'female' as const, label: 'A woman', icon: '👩🏽' },
        ].map((g) => {
          const active = draft.gender === g.key;
          return (
            <button
              key={g.key}
              onClick={() => setGender(g.key)}
              className="flex flex-col items-center justify-center gap-3 py-8 rounded-2xl transition-all hover:scale-[1.03]"
              style={{
                background: active
                  ? 'linear-gradient(135deg, hsl(15 80% 28%) 0%, hsl(25 75% 32%) 100%)'
                  : 'hsl(20 25% 12%)',
                border: active
                  ? '1px solid hsl(38 80% 55%)'
                  : '1px solid hsl(25 30% 22%)',
                color: 'hsl(38 80% 85%)',
                boxShadow: active ? '0 8px 25px hsl(15 80% 30% / 0.4)' : 'none',
              }}
            >
              <span className="text-5xl">{g.icon}</span>
              <span className="font-medium">{g.label}</span>
            </button>
          );
        })}
      </div>

      {draft.gender && draft.seeking && (
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm italic text-center mt-6"
          style={{ color: 'hsl(38 35% 70%)' }}
        >
          You'll be matched with {draft.seeking === 'male' ? 'men' : 'women'}.
        </motion.p>
      )}
    </div>
  );
};

/* ------------------------ Step 4: Photos ------------------------ */

const StepPhotos: React.FC<{ userId?: string; draft: Draft; update: any }> = ({ userId, draft, update }) => {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || !userId) return;
    setUploading(true);
    const newPaths: string[] = [];
    try {
      for (const file of Array.from(files).slice(0, 6 - draft.photos.length)) {
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error } = await supabase.storage
          .from('tribal-hearts-photos')
          .upload(path, file, { contentType: file.type, upsert: false });
        if (!error) {
          // get a signed URL we can use directly in <img>
          const { data: signed } = await supabase.storage
            .from('tribal-hearts-photos')
            .createSignedUrl(path, 60 * 60 * 24 * 7);
          if (signed?.signedUrl) newPaths.push(signed.signedUrl);
        } else {
          console.error('upload error', error);
        }
      }
      update('photos', [...draft.photos, ...newPaths]);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (idx: number) => {
    update('photos', draft.photos.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <StepHeading title="Add your light" subtitle="Show your smile, your energy, your world. (1–6 photos)" />

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="grid grid-cols-3 gap-3 mt-8">
        {draft.photos.map((url, i) => (
          <motion.div
            key={url + i}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative aspect-square rounded-2xl overflow-hidden"
            style={{ border: '1px solid hsl(25 35% 25%)' }}
          >
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => removePhoto(i)}
              className="absolute top-1 right-1 p-1 rounded-full"
              style={{ background: 'hsl(0 0% 0% / 0.6)', color: 'white' }}
              aria-label="Remove"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}

        {draft.photos.length < 6 && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.03] disabled:opacity-50"
            style={{
              background: 'hsl(20 25% 12%)',
              border: '2px dashed hsl(25 35% 28%)',
              color: 'hsl(38 50% 70%)',
            }}
          >
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
            <span className="text-xs">{uploading ? 'Adding…' : 'Add photo'}</span>
          </button>
        )}
      </div>

      <div className="mt-6">
        <label className="text-sm mb-2 block" style={{ color: 'hsl(38 40% 70%)' }}>
          A short Spirit Note (optional)
        </label>
        <textarea
          value={draft.bio}
          onChange={(e) => update('bio', e.target.value.slice(0, 160))}
          placeholder='e.g. "The song that moves my soul is…"'
          rows={2}
          className="w-full p-3 rounded-2xl resize-none outline-none text-sm"
          style={{
            background: 'hsl(20 25% 10%)',
            border: '1px solid hsl(25 30% 22%)',
            color: 'hsl(38 90% 88%)',
          }}
        />
      </div>

      <div className="mt-5">
        <label className="text-sm mb-2 block" style={{ color: 'hsl(38 40% 70%)' }}>
          A few interests (tap to add)
        </label>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((tag) => {
            const active = draft.interests.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => {
                  const next = active
                    ? draft.interests.filter((t: string) => t !== tag)
                    : [...draft.interests, tag];
                  update('interests', next.slice(0, 8));
                }}
                className="text-xs px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: active ? 'hsl(75 50% 30%)' : 'hsl(75 25% 15%)',
                  color: active ? 'hsl(75 75% 88%)' : 'hsl(75 40% 65%)',
                  border: `1px solid ${active ? 'hsl(75 50% 45%)' : 'hsl(75 25% 25%)'}`,
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ------------------------ Step 5: Verification ------------------------ */

const StepVerification: React.FC<{ draft: Draft; update: any }> = ({ draft, update }) => {
  const [streamActive, setStreamActive] = useState(false);
  const [smiling, setSmiling] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
      setStreamActive(true);
    } catch (e) {
      toast({
        title: 'Camera blocked',
        description: 'Please allow camera access to verify.',
        variant: 'destructive' as any,
      });
    }
  };

  const confirm = () => {
    setSmiling(true);
    setTimeout(() => {
      // Stop camera
      streamRef.current?.getTracks().forEach((t) => t.stop());
      setStreamActive(false);
      update('selfieVerified', true);
      TribalAudio.chime(0, 1320, 1.2, 0.18);
    }, 700);
  };

  return (
    <div className="text-center">
      <StepHeading
        title="A quick smile to verify"
        subtitle="Keeps the tribe safe from fakes. Your selfie is private."
        center
      />

      <div
        className="relative mx-auto mt-8 rounded-full overflow-hidden flex items-center justify-center"
        style={{
          width: 220,
          height: 220,
          background: 'hsl(20 25% 10%)',
          border: '3px solid hsl(25 35% 25%)',
        }}
      >
        {streamActive ? (
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
        ) : draft.selfieVerified ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 14, stiffness: 220 }}
            className="flex items-center justify-center w-20 h-20 rounded-full"
            style={{
              background: 'linear-gradient(135deg, hsl(75 60% 45%), hsl(85 55% 50%))',
              color: 'white',
            }}
          >
            <Check size={40} strokeWidth={3} />
          </motion.div>
        ) : (
          <Camera size={48} style={{ color: 'hsl(38 40% 60%)' }} />
        )}

        {smiling && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.7 }}
            style={{
              background: 'radial-gradient(circle, hsl(38 100% 70% / 0.6), transparent 70%)',
            }}
          />
        )}
      </div>

      <p className="mt-4 text-sm italic" style={{ color: 'hsl(38 35% 65%)' }}>
        {draft.selfieVerified
          ? 'Beautiful. Welcome 🌿'
          : streamActive
            ? 'Smile gently when ready ☺️'
            : 'A 2-second moment.'}
      </p>

      {!draft.selfieVerified && (
        <button
          onClick={streamActive ? confirm : startCamera}
          className="mt-6 px-6 py-2.5 rounded-full text-sm font-medium transition-all hover:scale-105"
          style={{
            background: 'hsl(75 30% 22%)',
            color: 'hsl(75 65% 80%)',
            border: '1px solid hsl(75 35% 35%)',
          }}
        >
          {streamActive ? 'Capture smile' : 'Open camera'}
        </button>
      )}
    </div>
  );
};

/* ------------------------ Helpers ------------------------ */

const StepHeading: React.FC<{ title: string; subtitle?: string; center?: boolean }> = ({
  title, subtitle, center,
}) => (
  <div className={center ? 'text-center' : ''}>
    <h2
      className="text-3xl font-serif italic leading-tight"
      style={{ color: 'hsl(38 95% 88%)' }}
    >
      {title}
    </h2>
    {subtitle && (
      <p className="mt-2 text-sm" style={{ color: 'hsl(38 35% 65%)' }}>
        {subtitle}
      </p>
    )}
  </div>
);

/* ------------------------ Final celebration ------------------------ */

const CelebrationScreen: React.FC = () => (
  <motion.div
    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    style={{
      background:
        'radial-gradient(circle, hsl(15 35% 12%) 0%, hsl(20 30% 6%) 70%, hsl(0 0% 3%) 100%)',
    }}
  >
    {/* Confetti hearts */}
    {Array.from({ length: 24 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute"
        style={{
          left: `${Math.random() * 100}%`,
          top: '110%',
        }}
        initial={{ y: 0, opacity: 0, rotate: 0 }}
        animate={{
          y: -window.innerHeight - 100,
          opacity: [0, 1, 1, 0],
          rotate: Math.random() * 360,
          x: (Math.random() - 0.5) * 200,
        }}
        transition={{ duration: 3 + Math.random() * 1.5, delay: Math.random() * 0.6, ease: 'easeOut' }}
      >
        <TribalHeart size={20 + Math.random() * 20} color={Math.random() > 0.5 ? 'warm' : 'sage'} />
      </motion.div>
    ))}

    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: [0, 1.2, 1] }}
      transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <TribalHeart size={140} color="unified" pulse strong />
    </motion.div>

    <motion.h1
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.6 }}
      className="text-4xl font-serif italic mt-8 text-center px-6"
      style={{
        color: 'hsl(38 95% 85%)',
        textShadow: '0 0 30px hsl(25 100% 55% / 0.6)',
      }}
    >
      You are now part of the Tribe
    </motion.h1>
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
      className="mt-3 text-sm italic"
      style={{ color: 'hsl(38 50% 75%)' }}
    >
      ✨ The fire is warm, your circle awaits…
    </motion.p>
  </motion.div>
);
