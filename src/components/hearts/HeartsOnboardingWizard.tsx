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

const COMPLEXION_CHOICES: Array<{ key: string; label: string }> = [
  { key: 'open_all',         label: 'Open to all' },
  { key: 'no_preference',    label: 'No strong preference' },
  { key: 'similar_to_mine',  label: 'Prefer similar to mine' },
  { key: 'describe',         label: 'Prefer to describe in my own words' },
];

const PHYSICAL_TAGS: Array<{ key: string; label: string }> = [
  { key: 'height', label: 'Height' },
  { key: 'build',  label: 'Build' },
  { key: 'style',  label: 'Style' },
  { key: 'energy', label: 'Energy (calm / outgoing)' },
];

function encodeComplexion(choice: string, custom: string) {
  return JSON.stringify({ choice, custom: custom.trim() || undefined });
}
function decodeComplexion(raw?: string): { choice: string; custom: string } {
  if (!raw) return { choice: '', custom: '' };
  try { const p = JSON.parse(raw); return { choice: p.choice ?? '', custom: p.custom ?? '' }; }
  catch { return { choice: '', custom: '' }; }
}
function encodePhysical(tags: string[], custom: string) {
  return JSON.stringify({ tags, custom: custom.trim() || undefined });
}
function decodePhysical(raw?: string): { tags: string[]; custom: string } {
  if (!raw) return { tags: [], custom: '' };
  try { const p = JSON.parse(raw); return { tags: Array.isArray(p.tags) ? p.tags : [], custom: p.custom ?? '' }; }
  catch { return { tags: [], custom: '' }; }
}

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
    const raw = answers[q.key];
    if (q.key === 'complexion_pref') {
      const { choice, custom } = decodeComplexion(raw);
      if (!choice) { toast.error('Please pick one option 🌱'); return; }
      if (choice === 'describe' && !custom.trim()) { toast.error('Please share a few words 🌱'); return; }
    } else if (q.key === 'physical_prefs') {
      const { tags, custom } = decodePhysical(raw);
      if (tags.length === 0 && !custom.trim()) { toast.error('Pick at least one or describe in your own words 🌱'); return; }
    } else if (!raw?.trim()) {
      toast.error('Please share a quick answer 🌱'); return;
    }
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
      const complexion = decodeComplexion(answers.complexion_pref);
      const physical = decodePhysical(answers.physical_prefs);
      const enrichedLifestyle = {
        ...(draft.lifestyle ?? {}),
        element,
        soul_name_origin: origin,
        complexion_pref: complexion.choice
          ? { choice: complexion.choice, ...(complexion.custom ? { custom: complexion.custom } : {}) }
          : undefined,
        physical_prefs: (physical.tags.length || physical.custom)
          ? { tags: physical.tags, ...(physical.custom ? { custom: physical.custom } : {}) }
          : undefined,
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
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {ORIGINS.map(o => {
                const isSel = origin === o.key;
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setOrigin(o.key)}
                    style={{
                      background: isSel
                        ? 'linear-gradient(135deg, hsl(var(--th-walnut-mid)), hsl(var(--th-walnut)))'
                        : 'linear-gradient(135deg, hsl(var(--th-walnut)/0.85), hsl(var(--th-walnut-dark)/0.85))',
                      borderColor: isSel ? 'hsl(var(--th-gold-bright))' : 'hsl(var(--th-gold) / 0.3)',
                      boxShadow: isSel
                        ? '0 0 18px hsl(var(--th-gold) / 0.45), inset 0 1px 0 hsl(var(--th-gold) / 0.25)'
                        : 'inset 0 1px 0 hsl(var(--th-gold) / 0.1)',
                    }}
                    className="group flex flex-col items-start gap-1 rounded-xl border-2 px-3.5 py-3 text-left transition-all hover:scale-[1.015]"
                  >
                    <span
                      className="th-serif text-[15px] font-semibold leading-tight"
                      style={{
                        color: 'hsl(var(--th-gold-bright))',
                        textShadow: '0 1px 6px hsl(var(--th-ember) / 0.45)',
                      }}
                    >
                      {o.label}
                    </span>
                    <span className="text-[12px] leading-snug text-[hsl(var(--th-cream)/0.78)]">
                      {o.desc}
                    </span>
                  </button>
                );
              })}
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

        {q.key === 'complexion_pref' ? (
          (() => {
            const { choice, custom } = decodeComplexion(answers.complexion_pref);
            return (
              <>
                <p className="text-xs italic text-[hsl(var(--th-cream)/0.65)]">
                  This only softly broadens or focuses your matches — no one is ever excluded based on appearance.
                </p>
                <div className="flex flex-wrap gap-2">
                  {COMPLEXION_CHOICES.map(c => {
                    const sel = choice === c.key;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setAnswers(a => ({ ...a, complexion_pref: encodeComplexion(c.key, custom) }))}
                        className={`rounded-full border px-3.5 py-2 text-sm transition ${
                          sel
                            ? 'border-[hsl(var(--th-gold-bright))] bg-[hsl(var(--th-walnut-mid))] text-[hsl(var(--th-gold-bright))] shadow-[0_0_14px_hsl(var(--th-gold)/0.35)]'
                            : 'border-[hsl(var(--th-gold)/0.3)] bg-[hsl(var(--th-walnut-dark)/0.5)] text-[hsl(var(--th-cream)/0.85)] hover:border-[hsl(var(--th-gold)/0.6)]'
                        }`}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
                {choice === 'describe' && (
                  <Input
                    autoFocus
                    placeholder="In a few words…"
                    maxLength={200}
                    value={custom}
                    onChange={e => setAnswers(a => ({ ...a, complexion_pref: encodeComplexion(choice, e.target.value) }))}
                    className="h-12 rounded-xl border-[hsl(var(--th-gold)/0.3)] bg-[hsl(var(--th-walnut-dark)/0.5)] text-base text-[hsl(var(--th-cream))] placeholder:text-[hsl(var(--th-cream)/0.4)] backdrop-blur-sm focus-visible:ring-[hsl(var(--th-gold)/0.5)]"
                  />
                )}
              </>
            );
          })()
        ) : q.key === 'physical_prefs' ? (
          (() => {
            const { tags, custom } = decodePhysical(answers.physical_prefs);
            const toggle = (k: string) => {
              const next = tags.includes(k) ? tags.filter(t => t !== k) : [...tags, k];
              setAnswers(a => ({ ...a, physical_prefs: encodePhysical(next, custom) }));
            };
            return (
              <>
                <p className="text-xs italic text-[hsl(var(--th-cream)/0.65)]">
                  Pick any that resonate, or describe in your own words. Choose what feels true.
                </p>
                <div className="flex flex-wrap gap-2">
                  {PHYSICAL_TAGS.map(t => {
                    const sel = tags.includes(t.key);
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => toggle(t.key)}
                        className={`rounded-full border px-3.5 py-2 text-sm transition ${
                          sel
                            ? 'border-[hsl(var(--th-gold-bright))] bg-[hsl(var(--th-walnut-mid))] text-[hsl(var(--th-gold-bright))] shadow-[0_0_14px_hsl(var(--th-gold)/0.35)]'
                            : 'border-[hsl(var(--th-gold)/0.3)] bg-[hsl(var(--th-walnut-dark)/0.5)] text-[hsl(var(--th-cream)/0.85)] hover:border-[hsl(var(--th-gold)/0.6)]'
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
                <Input
                  placeholder="Describe in your own words (optional)"
                  maxLength={250}
                  value={custom}
                  onChange={e => setAnswers(a => ({ ...a, physical_prefs: encodePhysical(tags, e.target.value) }))}
                  className="h-12 rounded-xl border-[hsl(var(--th-gold)/0.3)] bg-[hsl(var(--th-walnut-dark)/0.5)] text-base text-[hsl(var(--th-cream))] placeholder:text-[hsl(var(--th-cream)/0.4)] backdrop-blur-sm focus-visible:ring-[hsl(var(--th-gold)/0.5)]"
                />
              </>
            );
          })()
        ) : (
          <Input
            placeholder={q.placeholder}
            value={answers[q.key] ?? ''}
            onChange={e => setAnswers(a => ({ ...a, [q.key]: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && next()}
            autoFocus
            className="h-12 rounded-xl border-[hsl(var(--th-gold)/0.3)] bg-[hsl(var(--th-walnut-dark)/0.5)] text-base text-[hsl(var(--th-cream))] placeholder:text-[hsl(var(--th-cream)/0.4)] backdrop-blur-sm focus-visible:ring-[hsl(var(--th-gold)/0.5)]"
          />
        )}
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
