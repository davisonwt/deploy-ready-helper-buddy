import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useTribalHeartsProfile } from '@/hooks/useTribalHeartsProfile';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function ProfileEditor() {
  const { profile, save } = useTribalHeartsProfile();
  const [bio, setBio] = useState('');
  const [values, setValues] = useState('');
  const [interests, setInterests] = useState('');
  const [country, setCountry] = useState('');
  const [region, setRegion] = useState('');
  const [distance, setDistance] = useState<string>('');
  const [intent, setIntent] = useState<'friendship' | 'courtship' | 'connection'>('connection');
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
    }
  }, [profile]);

  if (!profile) return null;

  async function handleSave() {
    setSaving(true);
    try {
      await save({
        bio,
        values_list: values.split(',').map(s => s.trim()).filter(Boolean),
        interests: interests.split(',').map(s => s.trim()).filter(Boolean),
        location_country: country,
        location_region: region,
        distance_pref_km: distance ? parseInt(distance) : null as any,
        seeking_intent: intent,
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
      <Button onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save profile
      </Button>
    </div>
  );
}
