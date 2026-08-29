import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Store, ExternalLink, Star, Plus } from 'lucide-react';

interface Business {
  id: string;
  name: string;
  slug: string;
  currency: string;
  is_default: boolean;
  registration_no: string | null;
  vat_no: string | null;
  address: string | null;
  is_store: boolean;
  store_tagline: string | null;
  store_categories: string[] | null;
  collect_address: string | null;
  books_enabled: boolean;
}

const SELECT =
  'id, name, slug, currency, is_default, registration_no, vat_no, address, is_store, store_tagline, store_categories, collect_address, books_enabled';

const slugify = (name: string, userId: string) =>
  (name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'business') + `-${userId.slice(0, 6)}`;

/**
 * Profile → My businesses, spec-books.md §3. A business is a `companies`
 * row and IS its own set of books — adding one here opens it, no separate
 * step. Also carries the Storefront fields (spec-storefronts.md) added to
 * the same section earlier. Copy always says "business" / "set of books",
 * never "company" or "workspace".
 */
export default function MyBusinessesSection() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingOpen, setAddingOpen] = useState(false);

  const load = async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from('companies').select(SELECT).eq('owner_user_id', user.id).order('created_at', { ascending: true });
    setBusinesses((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const makeDefault = async (id: string) => {
    if (!user) return;
    // Two-step: the partial unique index only allows one is_default=true
    // per owner, so the old default must clear before the new one sets.
    const prevDefault = businesses.find((b) => b.is_default);
    try {
      if (prevDefault && prevDefault.id !== id) {
        const { error: clearErr } = await supabase.from('companies').update({ is_default: false }).eq('id', prevDefault.id);
        if (clearErr) throw clearErr;
      }
      const { error } = await supabase.from('companies').update({ is_default: true }).eq('id', id);
      if (error) throw error;
      setBusinesses((prev) => prev.map((b) => ({ ...b, is_default: b.id === id })));
      toast.success('Default business updated');
    } catch (err) {
      console.error('Failed to change default business:', err);
      toast.error(err instanceof Error ? err.message : 'Could not change default. Please try again.');
      load();
    }
  };

  const defaultBusiness = businesses.find((b) => b.is_default) ?? businesses[0] ?? null;

  if (loading) {
    return (
      <Card className="bg-card/95 backdrop-blur-md border-border/30 shadow-xl">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/95 backdrop-blur-md border-border/30 shadow-xl">
      <CardHeader>
        <CardTitle className="text-foreground text-xl flex items-center gap-2">
          <Store className="w-5 h-5" /> My businesses
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {businesses.map((b) => (
          <BusinessCard
            key={b.id}
            business={b}
            onChange={(updated) => setBusinesses((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))}
            onMakeDefault={() => makeDefault(b.id)}
          />
        ))}

        {addingOpen ? (
          <AddBusinessForm
            defaultCurrency={defaultBusiness?.currency || 'USD'}
            defaultBooksEnabled={defaultBusiness?.books_enabled ?? false}
            onCancel={() => setAddingOpen(false)}
            onAdded={(b) => {
              setBusinesses((prev) => [...prev, b]);
              setAddingOpen(false);
            }}
          />
        ) : (
          <Button variant="outline" onClick={() => setAddingOpen(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" /> Add a business
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function AddBusinessForm({
  defaultCurrency,
  defaultBooksEnabled,
  onCancel,
  onAdded,
}: {
  defaultCurrency: string;
  defaultBooksEnabled: boolean;
  onCancel: () => void;
  onAdded: (b: Business) => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [registrationNo, setRegistrationNo] = useState('');
  const [vatNo, setVatNo] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      // Adding a business opens its own set of books immediately — no
      // separate "create books" step. books_enabled matches the default
      // business so a new one behaves the same as the one it was added
      // alongside, rather than silently starting with Books off.
      const { data, error } = await supabase
        .from('companies')
        .insert({
          owner_user_id: user.id,
          name: name.trim(),
          slug: slugify(name, user.id),
          currency: currency.trim().toUpperCase() || 'USD',
          registration_no: registrationNo.trim() || null,
          vat_no: vatNo.trim() || null,
          address: address.trim() || null,
          is_default: false,
          books_enabled: defaultBooksEnabled,
        } as any)
        .select(
          'id, name, slug, currency, is_default, registration_no, vat_no, address, is_store, store_tagline, store_categories, collect_address, books_enabled'
        )
        .single();
      if (error) throw error;
      toast.success(`${name.trim()} added — its set of books is ready`);
      onAdded(data as any);
    } catch (err) {
      console.error('Failed to add business:', err);
      toast.error(err instanceof Error ? err.message : 'Could not add this business. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-border p-4 space-y-3">
      <p className="text-sm font-semibold">Add a business</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="new-biz-name">Business name</Label>
          <Input id="new-biz-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Louw Music" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-biz-currency">Currency</Label>
          <Input id="new-biz-currency" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="new-biz-reg">Registration no. (optional)</Label>
          <Input id="new-biz-reg" value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-biz-vat">VAT no. (optional)</Label>
          <Input id="new-biz-vat" value={vatNo} onChange={(e) => setVatNo(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-biz-address">Address (optional)</Label>
        <Textarea id="new-biz-address" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
      </div>
      <div className="flex gap-2">
        <Button onClick={create} disabled={saving || !name.trim()} size="sm">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Add business
        </Button>
        <Button variant="ghost" onClick={onCancel} size="sm" disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function BusinessCard({
  business,
  onChange,
  onMakeDefault,
}: {
  business: Business;
  onChange: (b: Business) => void;
  onMakeDefault: () => void;
}) {
  const [name, setName] = useState(business.name);
  const [currency, setCurrency] = useState(business.currency);
  const [registrationNo, setRegistrationNo] = useState(business.registration_no ?? '');
  const [vatNo, setVatNo] = useState(business.vat_no ?? '');
  const [address, setAddress] = useState(business.address ?? '');
  const [isStore, setIsStore] = useState(business.is_store);
  const [tagline, setTagline] = useState(business.store_tagline ?? '');
  const [categories, setCategories] = useState((business.store_categories ?? []).join(', '));
  const [collectAddress, setCollectAddress] = useState(business.collect_address ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast.error('Business name is required'); return; }
    setSaving(true);
    try {
      const store_categories = categories.split(',').map((c) => c.trim()).filter(Boolean);
      const patch = {
        name: name.trim(),
        currency: currency.trim().toUpperCase() || 'USD',
        registration_no: registrationNo.trim() || null,
        vat_no: vatNo.trim() || null,
        address: address.trim() || null,
        is_store: isStore,
        store_tagline: tagline.trim() || null,
        store_categories: store_categories.length ? store_categories : null,
        collect_address: collectAddress.trim() || null,
      };
      const { error } = await supabase.from('companies').update(patch).eq('id', business.id);
      if (error) throw error;
      onChange({ ...business, ...patch, store_categories: patch.store_categories ?? [] });
      toast.success('Saved');
    } catch (err) {
      console.error('Failed to save business:', err);
      toast.error(err instanceof Error ? err.message : 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border/60 p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-2">
          <p className="font-semibold truncate">{business.name}</p>
          {business.is_default && (
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">Default</Badge>
          )}
        </div>
        {!business.is_default && (
          <Button variant="ghost" size="sm" onClick={onMakeDefault}>
            <Star className="w-3.5 h-3.5 mr-1.5" /> Make default
          </Button>
        )}
      </div>

      {isStore && business.slug && (
        <Link to={`/store/${business.slug}`} target="_blank" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
          View your shop <ExternalLink className="w-3 h-3" />
        </Link>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`name-${business.id}`}>Business name</Label>
          <Input id={`name-${business.id}`} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`currency-${business.id}`}>Currency</Label>
          <Input id={`currency-${business.id}`} value={currency} onChange={(e) => setCurrency(e.target.value)} />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`reg-${business.id}`}>Registration no.</Label>
          <Input id={`reg-${business.id}`} value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} placeholder="Optional" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`vat-${business.id}`}>VAT no.</Label>
          <Input id={`vat-${business.id}`} value={vatNo} onChange={(e) => setVatNo(e.target.value)} placeholder="Optional" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`address-${business.id}`}>Address</Label>
        <Textarea id={`address-${business.id}`} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional" rows={2} />
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40">
        <Label htmlFor={`store-${business.id}`} className="text-sm">Storefront</Label>
        <Switch id={`store-${business.id}`} checked={isStore} onCheckedChange={setIsStore} />
      </div>

      {isStore && (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`tagline-${business.id}`}>Tagline</Label>
            <Input
              id={`tagline-${business.id}`}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="A short line under your shop's name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`categories-${business.id}`}>Categories</Label>
            <Input
              id={`categories-${business.id}`}
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              placeholder="Comma-separated, e.g. Pain relief, Vitamins, First aid"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`collect-${business.id}`}>Collect address</Label>
            <Textarea
              id={`collect-${business.id}`}
              value={collectAddress}
              onChange={(e) => setCollectAddress(e.target.value)}
              placeholder="Where buyers collect an order from"
              rows={2}
            />
          </div>
        </div>
      )}

      <Button onClick={save} disabled={saving} size="sm">
        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Save
      </Button>
    </div>
  );
}
