import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useTribalHeartsProfile } from '@/hooks/useTribalHeartsProfile';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const COMPLEXION_CHOICES = [
  { key: 'open_all',         label: 'Open to all' },
  { key: 'no_preference',    label: 'No strong preference' },
  { key: 'similar_to_mine',  label: 'Prefer similar to mine' },
  { key: 'describe',         label: 'Prefer to describe in my own words' },
];
const PHYSICAL_TAGS = [
  { key: 'height', label: 'Height' },
  { key: 'build',  label: 'Build' },
  { key: 'style',  label: 'Style' },
  { key: 'energy', label: 'Energy (calm / outgoing)' },
];

export function ProfileEditor() {
  const { profile, save } = useTribalHeartsProfile();
  const [bio, setBio] = useState('');
  const [values, setValues] = useState('');
  const [interests, setInterests] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [distance, setDistance] = useState<string>('');
  const [intent, setIntent] = useState<'friendship' | 'courtship' | 'connection'>('connection');
  const [complexionChoice, setComplexionChoice] = useState<string>('');
  const [complexionCustom, setComplexionCustom] = useState<string>('');
  const [physicalTags, setPhysicalTags] = useState<string[]>([]);
  const [physicalCustom, setPhysicalCustom] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setBio(profile.bio ?? '');
      setValues((profile.values_list ?? []).join(', '));
      setInterests((profile.interests ?? []).join(', '));
      setCountry(profile.location_country ?? '');
      setRegion(profile.location_region ?? '');
      setDistance(profile.distance_pref_km?.toString() ?? '');
      setIntent((profile.seeking_intent as any) ?? 'connection');
      const ls: any = profile.lifestyle ?? {};
      setComplexionChoice(ls.complexion_pref?.choice ?? '');
      setComplexionCustom(ls.complexion_pref?.custom ?? '');
      setPhysicalTags(Array.isArray(ls.physical_prefs?.tags) ? ls.physical_prefs.tags : []);
      setPhysicalCustom(ls.physical_prefs?.custom ?? '');
    }
  }, [profile]);

  if (!profile) return null;

  function togglePhysical(k: string) {
    setPhysicalTags(t => t.includes(k) ? t.filter(x => x !== k) : [...t, k]);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const lifestyle: any = { ...(profile.lifestyle ?? {}) };
      if (complexionChoice) {
        lifestyle.complexion_pref = {
          choice: complexionChoice,
          ...(complexionCustom.trim() ? { custom: complexionCustom.trim() } : {}),
        };
      } else {
        delete lifestyle.complexion_pref;
      }
      if (physicalTags.length || physicalCustom.trim()) {
        lifestyle.physical_prefs = {
          tags: physicalTags,
          ...(physicalCustom.trim() ? { custom: physicalCustom.trim() } : {}),
        };
      } else {
        delete lifestyle.physical_prefs;
      }
      await save({
        bio,
        values_list: values.split(',').map(s => s.trim()).filter(Boolean),
        interests: interests.split(',').map(s => s.trim()).filter(Boolean),
        location_country: country,
        location_region: region,
        distance_pref_km: distance ? parseInt(distance) : null as any,
        seeking_intent: intent,
        lifestyle,
      } as any);
      toast.success('Profile updated 🌸');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not save');
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-3">
      <div>
        <Label>Heartfelt write-up</Label>
        <Textarea
          rows={6}
          value={bio}
          onChange={e => setBio(e.target.value)}
          placeholder="Share who you are, what you treasure, and the kind of love or friendship you long for…"
        />
      </div>
      <div>
        <Label>Seeking</Label>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {(['friendship', 'courtship', 'connection'] as const).map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => setIntent(opt)}
              className={`rounded-xl border px-3 py-2 text-xs font-medium capitalize transition ${
                intent === opt
                  ? 'border-primary bg-primary/15 text-foreground shadow-sm'
                  : 'border-border/50 bg-card/40 text-muted-foreground hover:border-border'
              }`}
            >
              {opt === 'connection' ? 'Meaningful connection' : opt}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Values</Label><Input value={values} onChange={e => setValues(e.target.value)} /></div>
        <div><Label>Interests</Label><Input value={interests} onChange={e => setInterests(e.target.value)} /></div>
        <div><Label>Country</Label><Input value={country} onChange={e => setCountry(e.target.value)} /></div>
        <div><Label>Region / City</Label><Input value={region} onChange={e => setRegion(e.target.value)} /></div>
        <div><Label>Distance preference (km)</Label><Input type="number" value={distance} onChange={e => setDistance(e.target.value)} /></div>
      </div>

      <div className="space-y-2 pt-2">
        <Label>Complexion preference</Label>
        <p className="text-xs italic text-muted-foreground">
          Softly broadens or focuses matches — no one is excluded based on appearance.
        </p>
        <div className="flex flex-wrap gap-2">
          {COMPLEXION_CHOICES.map(c => {
            const sel = complexionChoice === c.key;
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setComplexionChoice(c.key)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  sel
                    ? 'border-primary bg-primary/15 text-foreground'
                    : 'border-border/50 bg-card/40 text-muted-foreground hover:border-border'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        {complexionChoice === 'describe' && (
          <Input
            placeholder="In a few words…"
            maxLength={200}
            value={complexionCustom}
            onChange={e => setComplexionCustom(e.target.value)}
          />
        )}
      </div>

      <div className="space-y-2 pt-2">
        <Label>Physical preferences</Label>
        <div className="flex flex-wrap gap-2">
          {PHYSICAL_TAGS.map(t => {
            const sel = physicalTags.includes(t.key);
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => togglePhysical(t.key)}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  sel
                    ? 'border-primary bg-primary/15 text-foreground'
                    : 'border-border/50 bg-card/40 text-muted-foreground hover:border-border'
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
          value={physicalCustom}
          onChange={e => setPhysicalCustom(e.target.value)}
        />
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save profile
      </Button>
    </div>
  );
}
