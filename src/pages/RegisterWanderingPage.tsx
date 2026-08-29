import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type Role = 'hand' | 'wheel' | 'pillow';

const ROLE_META: Record<Role, { label: string; emoji: string }> = {
  hand: { label: 'Wandering Hand', emoji: '🤲' },
  wheel: { label: 'Wandering Wheel', emoji: '🚗' },
  pillow: { label: 'Wandering Pillow', emoji: '🛏️' },
};

const SELF_OPERATION_DECLARATION =
  "I own this and I operate it myself. I am not sub-letting, sub-contracting or renting on someone else's behalf.";

/**
 * The role-unlock screen, spec-service-seeds.md §4. A one-time unlock per
 * role: display name, base town, and two required checkboxes (the lawyer's
 * self-operation declaration, and terms) — after this, that Wandering
 * role's badge shows on the profile and its seed form (built separately)
 * is reachable. Heart never lands here — it keeps its own onboarding at
 * /tribal-hearts.
 */
export default function RegisterWanderingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const roleParam = searchParams.get('role');
  const role: Role | null = roleParam === 'hand' || roleParam === 'wheel' || roleParam === 'pillow' ? roleParam : null;

  const [displayName, setDisplayName] = useState('');
  const [baseTown, setBaseTown] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [selfOperated, setSelfOperated] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

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
        setBaseTown(data.location || '');
        setLat(data.latitude ?? null);
        setLng(data.longitude ?? null);
      }
      setLoadingProfile(false);
    })();
    return () => { alive = false; };
  }, [user]);

  if (!role) {
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
  const canSubmit = !!displayName.trim() && !!baseTown.trim() && selfOperated && acceptedTerms && !submitting;

  const handleSubmit = async () => {
    if (!user) { toast.error('Please log in to unlock this role.'); return; }
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase.from('wandering_roles').upsert(
        {
          user_id: user.id,
          role,
          display_name: displayName.trim(),
          base_town: baseTown.trim(),
          lat,
          lng,
          status: 'active',
          declared_self_operated_at: now,
          accepted_terms_at: now,
        },
        { onConflict: 'user_id,role' }
      );
      if (error) throw error;
      toast.success(`${meta.label} unlocked!`);
      navigate(`/sow/${role}`);
    } catch (err) {
      console.error('Role unlock failed:', err);
      toast.error(err instanceof Error ? err.message : 'Could not unlock this role. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container max-w-md mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" onClick={() => navigate('/sow')} className="mb-4 -ml-2">
        <ArrowLeft className="w-4 h-4 mr-2" /> Sow
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <span aria-hidden>{meta.emoji}</span> Become a {meta.label}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="wandering-name">Display name for this role</Label>
            <Input
              id="wandering-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loadingProfile}
              placeholder="How you'll show up to growers"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wandering-town">Base town / area</Label>
            <Input
              id="wandering-town"
              value={baseTown}
              onChange={(e) => setBaseTown(e.target.value)}
              disabled={loadingProfile}
              placeholder="e.g. Bethlehem, Free State"
            />
          </div>

          <div className="flex items-start gap-2.5 rounded-lg border p-3">
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

          <div className="flex items-start gap-2.5">
            <Checkbox
              id="accept-terms"
              checked={acceptedTerms}
              onCheckedChange={(v) => setAcceptedTerms(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="accept-terms" className="text-sm font-normal leading-snug cursor-pointer">
              I accept Sow2Grow's <Link to="/terms" className="underline" target="_blank">Terms</Link>.
            </Label>
          </div>

          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
            {submitting ? 'Unlocking…' : `Unlock ${meta.label}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
