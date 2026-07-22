import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  Loader2,
  Store,
  ShieldCheck,
  ExternalLink,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
  Home,
} from 'lucide-react';
import { TIERS } from '@/lib/tiers';

const REGULATED_CREDENTIALS = [
  { type: 'pharmacist_license', label: 'Pharmacist License', business: 'Pharmacy' },
  { type: 'vet_license', label: 'Veterinarian License', business: 'Veterinary Practice' },
  { type: 'herbalist_cert', label: 'Herbalist Certification', business: 'Herbalist Clinic' },
  { type: 'optometrist_license', label: 'Optometrist License', business: 'Optician / Eye Care' },
  { type: 'clinic_license', label: 'Clinic License', business: 'Medical Clinic' },
];

interface SowerProfile {
  id: string;
  display_name: string;
  slug: string | null;
  bio: string | null;
  tagline: string | null;
  seller_template: string | null;
  is_verified: boolean | null;
  logo_url: string | null;
  banner_url: string | null;
  tier: string | null;
}

interface MyCredential {
  id: string;
  credential_type: string;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function SellerBusinessSettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sower, setSower] = useState<SowerProfile | null>(null);
  const [creds, setCreds] = useState<MyCredential[]>([]);
  const [form, setForm] = useState({
    display_name: '',
    slug: '',
    bio: '',
    tagline: '',
    tier: '' as '' | 'homestead' | 'grove' | 'orchard' | 'estate' | 'harvest_works',
  });
  const [regulated, setRegulated] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const [{ data: sowerData, error: sowerError }, { data: credsData, error: credsError }] = await Promise.all([
        supabase.from('sowers').select('*').eq('user_id', user!.id).maybeSingle(),
        supabase.from('seller_credentials').select('id, credential_type, status, submitted_at, reviewed_at, rejection_reason').eq('user_id', user!.id),
      ]);

      if (sowerError) throw sowerError;
      if (credsError) throw credsError;

      if (sowerData) {
        setSower(sowerData as SowerProfile);
        setForm({
          display_name: sowerData.display_name || '',
          slug: sowerData.slug || '',
          bio: sowerData.bio || '',
          tagline: sowerData.tagline || '',
          tier: (sowerData.tier as any) || '',
        });
        setRegulated(sowerData.seller_template === 'regulated_business');
        if (sowerData.slug) {
          setPublicUrl(`${window.location.origin}/bulk/sower/${sowerData.slug}`);
        }
      } else {
        // First-time visit — pre-fill tier from registration selection if any
        try {
          const pending = localStorage.getItem('pending_business_tier');
          if (pending && ['homestead','grove','orchard','estate','harvest_works'].includes(pending)) {
            setForm((f) => ({ ...f, tier: pending as any }));
          }
        } catch { /* ignore */ }
      }
      setCreds((credsData || []) as MyCredential[]);
    } catch (e: any) {
      toast.error(e.message || 'Could not load business profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!form.display_name.trim()) {
      toast.error('Business display name is required');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        display_name: form.display_name.trim(),
        slug: form.slug.trim() || null,
        bio: form.bio.trim() || null,
        tagline: form.tagline.trim() || null,
        tier: form.tier || null,
        seller_template: regulated ? 'regulated_business' : null,
      };

      let result;
      if (sower) {
        result = await supabase.from('sowers').update(payload).eq('id', sower.id).select().single();
      } else {
        result = await supabase.from('sowers').insert({ ...payload, user_id: user.id }).select().single();
      }

      if (result.error) {
        // The trigger rejects regulated_business without an approved credential.
        if (result.error.message?.includes('regulated_business')) {
          toast.error('You need an approved professional credential before enabling Regulated Business. Upload it below first.');
        } else if (result.error.message?.includes('duplicate key') || result.error.code === '23505') {
          toast.error('That slug is already taken. Try another.');
        } else {
          throw result.error;
        }
        setSaving(false);
        return;
      }

      setSower(result.data as SowerProfile);
      if (result.data?.slug) {
        setPublicUrl(`${window.location.origin}/bulk/sower/${result.data.slug}`);
      }
      try { localStorage.removeItem('pending_business_tier'); } catch { /* ignore */ }
      toast.success(sower ? 'Business profile updated' : 'Business registered successfully');
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const matchedCred = (type: string) => creds.find((c) => c.credential_type === type);

  const canEnableRegulated = () => {
    return REGULATED_CREDENTIALS.some((r) => matchedCred(r.type)?.status === 'verified');
  };

  const copyPublicUrl = () => {
    if (!publicUrl) return;
    navigator.clipboard.writeText(publicUrl).then(() => toast.success('Public page link copied'));
  };

  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-20 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
          <Home className="w-4 h-4 mr-1" /> Home
        </Button>
      </div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
          <Store className="w-8 h-8 text-primary" /> Seller Business Settings
        </h1>
        <p className="text-muted-foreground">
          Register or update your Sower business profile. Pharmacists and other regulated sellers can enable prescription intake after their professional credential is approved.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Business profile form */}
        <Card>
          <CardHeader>
            <CardTitle>Business Profile</CardTitle>
            <CardDescription>
              This is what buyers see on your public Sower page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="display_name">Business / Display name *</Label>
              <Input
                id="display_name"
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                placeholder="e.g. Greenleaf Pharmacy"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="slug">Public page slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">/bulk/sower/</span>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                  placeholder="greenleaf-pharmacy"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Leave blank to use your business name as the URL.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tagline">Tagline</Label>
              <Input
                id="tagline"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                placeholder="e.g. Your trusted community pharmacist"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bio">Bio / About</Label>
              <Textarea
                id="bio"
                rows={4}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Tell clients what you offer, your hours, delivery areas, etc."
              />
            </div>

            {/* Business tier picker */}
            <div className="grid gap-2">
              <Label>Business type</Label>
              <p className="text-xs text-muted-foreground -mt-1">
                Choose the option that best describes your business size. Hover for a short explanation.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, tier: '' })}
                  className={`text-left rounded-lg border-2 p-3 transition-all ${
                    form.tier === ''
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="font-semibold text-sm">👤 Personal sower</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Just me — not a business</div>
                </button>
                {TIERS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setForm({ ...form, tier: t.id })}
                    title={t.explainer}
                    className={`text-left rounded-lg border-2 p-3 transition-all ${
                      form.tier === t.id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="font-semibold text-sm">
                      <span className="mr-1">{t.emoji}</span>{t.label}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{t.tagline}</div>
                  </button>
                ))}
              </div>
              {form.tier && (
                <p className="text-xs bg-muted/50 border rounded p-2">
                  {TIERS.find((t) => t.id === form.tier)?.explainer}
                </p>
              )}
            </div>


            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  <Label htmlFor="regulated" className="text-base">Regulated Business</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enable prescription intake, private consult chat, and fulfillment options.
                </p>
              </div>
              <Switch
                id="regulated"
                checked={regulated}
                onCheckedChange={setRegulated}
                disabled={!canEnableRegulated()}
              />
            </div>
            {!canEnableRegulated() && (
              <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded p-3">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Upload and get an approved professional credential below before you can enable Regulated Business.
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {sower ? 'Save changes' : 'Register business'}
              </Button>
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Back to dashboard
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Credentials */}
        <Card>
          <CardHeader>
            <CardTitle>Professional Credentials</CardTitle>
            <CardDescription>
              Regulated businesses need a verified license or certificate. Upload proof on the Seller Credentials page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {REGULATED_CREDENTIALS.map((cred) => {
                const mine = matchedCred(cred.type);
                return (
                  <div key={cred.type} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <div className="font-medium">{cred.label}</div>
                      <div className="text-xs text-muted-foreground">{cred.business}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {mine ? (
                        <Badge
                          variant="outline"
                          className={
                            mine.status === 'verified'
                              ? 'bg-green-500/15 text-green-700 border-green-500/30'
                              : mine.status === 'pending'
                              ? 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30'
                              : 'bg-red-500/15 text-red-700 border-red-500/30'
                          }
                        >
                          {mine.status === 'verified' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {mine.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                          {mine.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                          {mine.status}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Not uploaded</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {creds.some((c) => c.status === 'rejected' && c.rejection_reason) && (
              <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded p-3">
                One or more credentials were rejected. Check the Seller Credentials page for the reason and re-upload.
              </div>
            )}
            <Button asChild variant="outline">
              <Link to="/seller/credentials">
                <ShieldCheck className="w-4 h-4 mr-2" /> Manage credentials
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Public page & actions */}
        {sower && (
          <Card>
            <CardHeader>
              <CardTitle>Your Public Page</CardTitle>
              <CardDescription>
                Clients visit this page to browse products and submit prescriptions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {publicUrl ? (
                <div className="flex items-center gap-2 rounded-lg border p-3">
                  <a href={publicUrl} target="_blank" rel="noopener" className="text-primary hover:underline flex-1 truncate">
                    {publicUrl}
                  </a>
                  <Button size="sm" variant="ghost" onClick={copyPublicUrl}>
                    Copy
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={publicUrl} target="_blank" rel="noopener">
                      <ExternalLink className="w-4 h-4 mr-1" /> View
                    </a>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Save a slug above to get your public link.</p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link to="/my-products">
                    <Store className="w-4 h-4 mr-2" /> My Products
                  </Link>
                </Button>
                {sower.seller_template === 'regulated_business' && (
                  <Button asChild>
                    <Link to="/my-garden/prescriptions">
                      <ClipboardList className="w-4 h-4 mr-2" /> Prescriptions Inbox
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
