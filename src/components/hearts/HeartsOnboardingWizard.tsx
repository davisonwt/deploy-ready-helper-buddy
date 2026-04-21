/**
 * HeartsOnboardingWizard — Fireside sanctuary onboarding.
 * Sacred 3-act flow: 1) Name & origin   2) Soul Path (element + warm questions)   3) Bestowal Pact + commit.
 * Same backend; Soul Name → display_first_name; element/origin → lifestyle jsonb.
 */
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Heart, ArrowLeft, ArrowRight } from 'lucide-react';
import { onboardingQuestions, heartsAgentLines } from '@/lib/heartsAgentLines';
import { supabase } from '@/integrations/supabase/client';
import { useTribalHeartsProfile } from '@/hooks/useTribalHeartsProfile';
import { toast } from 'sonner';
import { AgentNudgeBubble } from './AgentNudgeBubble';
import { ElementGlyph, type Element } from './atoms/ElementGlyph';
import { GlowButton } from './atoms/GlowButton';
import { LotusHeartLogo } from './atoms/LotusHeartLogo';

const ORIGINS = [
  { key: 'heritage',  label: 'Heritage',  desc: 'A name from my ancestors or culture' },
  { key: 'nature',    label: 'Nature',    desc: 'A name born of land, sky, or flame' },
  { key: 'mythology', label: 'Mythology', desc: 'A name from sacred story' },
  { key: 'real',      label: 'Real Name', desc: 'My first name as it is' },
];

export function HeartsOnboardingWizard({ onDone }: { onDone: () => void }) {
  const { save } = useTribalHeartsProfile();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [element, setElement] = useState<Element | null>(null);
  const [origin, setOrigin] = useState<string>('heritage');
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState<{ bio: string; values: string[]; interests: string[]; lifestyle: any } | null>(null);
  const [saving, setSaving] = useState(false);

  const q = onboardingQuestions[step];
  const isLast = step === onboardingQuestions.length - 1;
  const progress = ((step + 1) / onboardingQuestions.length) * 100;

  function next() {
    if (!answers[q.key]?.trim()) { toast.error('Please share a quick answer 🌱'); return; }
    if (step === 0 && !element) { toast.error('Choose your element to walk the Soul Path 🔥'); return; }
    if (isLast) draftProfile();
    else setStep(s => s + 1);
  }

  async function draftProfile() {
    setDrafting(true);
    try {
      const payload = onboardingQuestions
        .filter(qq => answers[qq.key])
        .map(qq => ({ question_key: qq.key, question_text: qq.text, answer: answers[qq.key] }));
      const { data, error } = await supabase.functions.invoke('tribal-hearts-onboard', { body: { answers: payload } });
      if (error) throw error;
      setDraft(data.draft);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not draft your profile');
    } finally { setDrafting(false); }
  }

  async function commit() {
    if (!draft) return;
    setSaving(true);
    try {
      const gender = (answers.gender ?? '').toLowerCase().includes('woman') ? 'female' : 'male';
      const enrichedLifestyle = {
        ...(draft.lifestyle ?? {}),
        element,
        soul_name_origin: origin,
      };
      await save({
        display_first_name: answers.first_name,
        gender: gender as 'male' | 'female',
        seeking: gender === 'male' ? 'female' : 'male',
        birthdate: answers.birthdate,
        bio: draft.bio,
        values_list: draft.values,
        interests: draft.interests,
        lifestyle: enrichedLifestyle,
        location_country: answers.country,
        location_region: answers.region,
        distance_pref_km: parseInt(answers.distance) || null as any,
        status: 'active',
        age_verified: true,
      } as any);
      toast.success('🔥 Your flame has joined the fireside!');
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not save profile');
    } finally { setSaving(false); }
  }

  if (draft) {
    return (
      <div className="space-y-5 animate-fade-in">
        <AgentNudgeBubble agent="gentoo" message="Here's your draft — make it yours, then plant it in the fireside 🔥" />
        <div>
          <Label className="th-serif text-sm font-medium text-[hsl(var(--th-gold-bright))]">Your story</Label>
          <Textarea
            rows={6}
            value={draft.bio}
            onChange={e => setDraft({ ...draft, bio: e.target.value })}
            className="mt-1.5 resize-none rounded-xl border-[hsl(var(--th-gold)/0.3)] bg-[hsl(var(--th-walnut-dark)/0.5)] text-[hsl(var(--th-cream))] backdrop-blur-sm"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label className="th-serif text-sm font-medium text-[hsl(var(--th-gold-bright))]">Values</Label>
            <Input
              value={draft.values.join(', ')}
              onChange={e => setDraft({ ...draft, values: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              className="mt-1.5 rounded-xl border-[hsl(var(--th-gold)/0.3)] bg-[hsl(var(--th-walnut-dark)/0.5)] text-[hsl(var(--th-cream))] backdrop-blur-sm"
            />
          </div>
          <div>
            <Label className="th-serif text-sm font-medium text-[hsl(var(--th-gold-bright))]">Interests</Label>
            <Input
              value={draft.interests.join(', ')}
              onChange={e => setDraft({ ...draft, interests: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              className="mt-1.5 rounded-xl border-[hsl(var(--th-gold)/0.3)] bg-[hsl(var(--th-walnut-dark)/0.5)] text-[hsl(var(--th-cream))] backdrop-blur-sm"
            />
          </div>
        </div>

        {/* Bestowal Pact reminder */}
        <div
          className="rounded-2xl border p-4 text-sm leading-relaxed text-[hsl(var(--th-cream)/0.85)]"
          style={{
            background: 'var(--th-wood-gradient-soft)',
            borderColor: 'hsl(var(--th-gold) / 0.35)',
          }}
        >
          <div className="th-serif mb-1 text-[11px] uppercase tracking-[0.22em] text-[hsl(var(--th-gold-bright))]">
            ✦ Your Bestowal Pact
          </div>
          As a Tribe Ambassador you've already pledged $5/mo, with 10% tithing & 5% admin contributing to
          the gardens of others. The fireside opens for you — no extra fee, only sacred reciprocity.
        </div>

        <GlowButton onClick={commit} disabled={saving} size="lg" className="w-full">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Heart className="h-5 w-5" fill="currentColor" />}
          Plant my flame in the fireside
        </GlowButton>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Sacred banner */}
      <div
        className="relative -mx-5 -mt-5 overflow-hidden rounded-t-2xl px-5 pt-5"
        style={{ background: 'var(--th-wood-gradient)' }}
      >
        <div className="flex items-center gap-3">
          <LotusHeartLogo size={48} />
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--th-gold)/0.4)] bg-[hsl(var(--th-walnut-dark)/0.6)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[hsl(var(--th-gold-bright))]">
              <Sparkles className="h-3 w-3" /> Walking the Soul Path
            </div>
            <p className="th-serif mt-1 text-sm italic text-[hsl(var(--th-cream)/0.8)]">A few warm questions by the fire.</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4 space-y-1.5 pb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[hsl(var(--th-cream)/0.8)]">Step {step + 1} of {onboardingQuestions.length}</span>
            <span className="font-semibold text-[hsl(var(--th-gold-bright))]">{Math.round(progress)}%</span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-[hsl(var(--th-walnut-dark))]">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: 'var(--th-gold-gradient)',
                boxShadow: '0 0 12px hsl(var(--th-gold) / 0.6)',
              }}
            />
          </div>
        </div>
      </div>

      <AgentNudgeBubble agent="gentoo" message={heartsAgentLines.gentoo.welcome} />

      {/* Step 0: also pick element + origin */}
      {step === 0 && (
        <>
          <div
            className="rounded-2xl border p-4"
            style={{ background: 'var(--th-wood-gradient-soft)', borderColor: 'hsl(var(--th-gold) / 0.3)' }}
          >
            <div className="th-serif mb-3 text-center text-sm text-[hsl(var(--th-gold-bright))]">
              Choose your Element — the soul your flame walks with
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(['earth', 'air', 'fire', 'water'] as Element[]).map(el => (
                <ElementGlyph key={el} element={el} selected={element === el} onClick={() => setElement(el)} />
              ))}
            </div>
          </div>

          <div
            className="rounded-2xl border p-4"
            style={{ background: 'var(--th-wood-gradient-soft)', borderColor: 'hsl(var(--th-gold) / 0.3)' }}
          >
            <div className="th-serif mb-3 text-center text-sm text-[hsl(var(--th-gold-bright))]">
              Origin of your shared name
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ORIGINS.map(o => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setOrigin(o.key)}
                  className={`rounded-xl border p-2.5 text-left text-xs transition ${
                    origin === o.key
                      ? 'border-[hsl(var(--th-gold-bright))] bg-[hsl(var(--th-walnut-dark)/0.7)] shadow-[0_0_16px_hsl(var(--th-gold)/0.4)]'
                      : 'border-[hsl(var(--th-gold)/0.25)] bg-[hsl(var(--th-walnut-dark)/0.4)] hover:border-[hsl(var(--th-gold)/0.5)]'
                  }`}
                >
                  <div className="th-serif font-semibold text-[hsl(var(--th-gold-bright))]">{o.label}</div>
                  <div className="mt-0.5 text-[hsl(var(--th-cream)/0.7)]">{o.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Question card */}
      <div
        key={step}
        className="space-y-3 rounded-2xl border p-4 animate-scale-in"
        style={{ background: 'var(--th-wood-gradient-soft)', borderColor: 'hsl(var(--th-gold) / 0.3)' }}
      >
        <Label className="th-serif text-lg leading-snug text-[hsl(var(--th-cream))]">
          {step === 0 ? 'What name shall the fireside call you by?' : q.text}
        </Label>
        <Input
          placeholder={q.placeholder}
          value={answers[q.key] ?? ''}
          onChange={e => setAnswers(a => ({ ...a, [q.key]: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && next()}
          autoFocus
          className="h-12 rounded-xl border-[hsl(var(--th-gold)/0.3)] bg-[hsl(var(--th-walnut-dark)/0.5)] text-base text-[hsl(var(--th-cream))] placeholder:text-[hsl(var(--th-cream)/0.4)] backdrop-blur-sm focus-visible:ring-[hsl(var(--th-gold)/0.5)]"
        />
      </div>

      <div className="flex gap-2">
        {step > 0 && (
          <GlowButton variant="ghost" onClick={() => setStep(s => s - 1)} size="md">
            <ArrowLeft className="h-4 w-4" /> Back
          </GlowButton>
        )}
        <GlowButton onClick={next} disabled={drafting} size="md" className="flex-1">
          {drafting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isLast ? (
            <Sparkles className="h-5 w-5" />
          ) : null}
          {isLast ? 'Let Gentoo weave my story' : 'Continue Journey'}
          {!isLast && !drafting && <ArrowRight className="h-4 w-4" />}
        </GlowButton>
      </div>
    </div>
  );
}
