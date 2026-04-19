import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Heart } from 'lucide-react';
import { onboardingQuestions, heartsAgentLines } from '@/lib/heartsAgentLines';
import { supabase } from '@/integrations/supabase/client';
import { useTribalHeartsProfile } from '@/hooks/useTribalHeartsProfile';
import { toast } from 'sonner';
import { AgentNudgeBubble } from './AgentNudgeBubble';

export function HeartsOnboardingWizard({ onDone }: { onDone: () => void }) {
  const { save } = useTribalHeartsProfile();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState<{ bio: string; values: string[]; interests: string[]; lifestyle: any } | null>(null);
  const [saving, setSaving] = useState(false);

  const q = onboardingQuestions[step];
  const isLast = step === onboardingQuestions.length - 1;

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
      <div className="space-y-4">
        <AgentNudgeBubble agent="gentoo" message="Here's your draft — make it yours, then plant it 🌱" />
        <div>
          <Label>Bio</Label>
          <Textarea rows={6} value={draft.bio} onChange={e => setDraft({ ...draft, bio: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Values</Label>
            <Input value={draft.values.join(', ')} onChange={e => setDraft({ ...draft, values: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
          </div>
          <div>
            <Label>Interests</Label>
            <Input value={draft.interests.join(', ')} onChange={e => setDraft({ ...draft, interests: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} />
          </div>
        </div>
        <Button onClick={commit} disabled={saving} className="w-full">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Heart className="mr-2 h-4 w-4" fill="currentColor" />}
          Plant my profile
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Step {step + 1} of {onboardingQuestions.length}</span>
        <span>{Math.round(((step + 1) / onboardingQuestions.length) * 100)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / onboardingQuestions.length) * 100}%` }} />
      </div>
      <AgentNudgeBubble agent="gentoo" message={heartsAgentLines.gentoo.welcome} />
      <div>
        <Label>{q.text}</Label>
        <Input
          placeholder={q.placeholder}
          value={answers[q.key] ?? ''}
          onChange={e => setAnswers(a => ({ ...a, [q.key]: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && next()}
          autoFocus
        />
      </div>
      <div className="flex gap-2">
        {step > 0 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>Back</Button>}
        <Button onClick={next} disabled={drafting} className="flex-1">
          {drafting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          {isLast ? 'Draft my profile with Gentoo' : 'Next'}
        </Button>
      </div>
    </div>
  );
}
