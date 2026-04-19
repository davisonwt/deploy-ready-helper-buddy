import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Heart, ArrowLeft, ArrowRight } from 'lucide-react';
import { onboardingQuestions, heartsAgentLines } from '@/lib/heartsAgentLines';
import { supabase } from '@/integrations/supabase/client';
import { useTribalHeartsProfile } from '@/hooks/useTribalHeartsProfile';
import { toast } from 'sonner';
import { AgentNudgeBubble } from './AgentNudgeBubble';
import onboardImg from '@/assets/hearts-onboard.jpg';

export function HeartsOnboardingWizard({ onDone }: { onDone: () => void }) {
  const { save } = useTribalHeartsProfile();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState<{ bio: string; values: string[]; interests: string[]; lifestyle: any } | null>(null);
  const [saving, setSaving] = useState(false);

  const q = onboardingQuestions[step];
  const isLast = step === onboardingQuestions.length - 1;
  const progress = ((step + 1) / onboardingQuestions.length) * 100;

  function next() {
    if (!answers[q.key]?.trim()) { toast.error('Please share a quick answer 🌱'); return; }
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
      await save({
        display_first_name: answers.first_name,
        gender: gender as 'male' | 'female',
        seeking: gender === 'male' ? 'female' : 'male',
        birthdate: answers.birthdate,
        bio: draft.bio,
        values_list: draft.values,
        interests: draft.interests,
        lifestyle: draft.lifestyle,
        location_country: answers.country,
        location_region: answers.region,
        distance_pref_km: parseInt(answers.distance) || null as any,
        status: 'active',
        age_verified: true,
      } as any);
      toast.success('🌸 Welcome to the garden!');
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not save profile');
    } finally { setSaving(false); }
  }

  if (draft) {
    return (
      <div className="space-y-4 animate-fade-in">
        <AgentNudgeBubble agent="gentoo" message="Here's your draft — make it yours, then plant it 🌱" />
        <div>
          <Label className="text-sm font-medium">Your story</Label>
          <Textarea
            rows={6}
            value={draft.bio}
            onChange={e => setDraft({ ...draft, bio: e.target.value })}
            className="mt-1.5 resize-none rounded-xl border-primary/20 bg-card/60 backdrop-blur-sm"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-sm font-medium">Values</Label>
            <Input
              value={draft.values.join(', ')}
              onChange={e => setDraft({ ...draft, values: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              className="mt-1.5 rounded-xl border-primary/20 bg-card/60 backdrop-blur-sm"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Interests</Label>
            <Input
              value={draft.interests.join(', ')}
              onChange={e => setDraft({ ...draft, interests: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
              className="mt-1.5 rounded-xl border-primary/20 bg-card/60 backdrop-blur-sm"
            />
          </div>
        </div>
        <Button onClick={commit} disabled={saving} className="h-12 w-full rounded-xl text-base font-semibold shadow-lg">
          {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Heart className="mr-2 h-5 w-5" fill="currentColor" />}
          Plant my profile in the garden
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Cinematic banner */}
      <div className="relative -mx-5 -mt-5 overflow-hidden rounded-t-2xl">
        <img
          src={onboardImg}
          alt="A hand reaching out across a sunlit wildflower field"
          width={1280}
          height={832}
          loading="lazy"
          className="h-32 w-full object-cover sm:h-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
        <div className="absolute bottom-3 left-5 right-5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-foreground backdrop-blur-md">
            <Sparkles className="h-3 w-3 text-primary" /> A few warm questions
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">Step {step + 1} of {onboardingQuestions.length}</span>
          <span className="font-semibold text-primary">{Math.round(progress)}%</span>
        </div>
        <div className="relative h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(330 80% 65%))',
              boxShadow: '0 0 12px hsl(var(--primary) / 0.6)',
            }}
          />
        </div>
      </div>

      <AgentNudgeBubble agent="gentoo" message={heartsAgentLines.gentoo.welcome} />

      {/* Question card */}
      <div
        key={step}
        className="space-y-3 rounded-2xl border border-primary/15 bg-gradient-to-br from-card via-card/95 to-primary/5 p-4 shadow-sm animate-scale-in"
      >
        <Label className="font-serif text-lg leading-snug text-foreground">{q.text}</Label>
        <Input
          placeholder={q.placeholder}
          value={answers[q.key] ?? ''}
          onChange={e => setAnswers(a => ({ ...a, [q.key]: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && next()}
          autoFocus
          className="h-12 rounded-xl border-primary/20 bg-background/60 text-base backdrop-blur-sm focus-visible:ring-primary/40"
        />
      </div>

      <div className="flex gap-2">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(s => s - 1)} className="rounded-xl">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
        )}
        <Button onClick={next} disabled={drafting} className="h-12 flex-1 rounded-xl text-base font-semibold shadow-lg">
          {drafting ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : isLast ? (
            <Sparkles className="mr-2 h-5 w-5" />
          ) : null}
          {isLast ? 'Let Gentoo draft my story' : 'Continue'}
          {!isLast && !drafting && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
