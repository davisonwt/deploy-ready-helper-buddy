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
import { Loader2, Store, ExternalLink } from 'lucide-react';

interface Business {
  id: string;
  name: string;
  slug: string;
  is_store: boolean;
  store_tagline: string | null;
  store_categories: string[] | null;
  collect_address: string | null;
}

const SELECT = 'id, name, slug, is_store, store_tagline, store_categories, collect_address';

/**
 * Profile → My businesses, spec-storefronts.md — the "Storefront" toggle
 * and shop fields (tagline, categories, collect address) live here, one
 * card per companies row the member owns. Every member currently has
 * exactly one (spec-books.md's default-set backfill), so in practice this
 * renders as a single card today; built to list all of them regardless,
 * since the schema already allows more than one per owner.
 */
export default function MyBusinessesSection() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase.from('companies').select(SELECT).eq('owner_user_id', user.id).order('created_at', { ascending: true });
      if (!alive) return;
      setBusinesses((data as any) ?? []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user]);

  if (loading) {
    return (
      <Card className="bg-card/95 backdrop-blur-md border-border/30 shadow-xl">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (businesses.length === 0) return null;

  return (
    <Card className="bg-card/95 backdrop-blur-md border-border/30 shadow-xl">
      <CardHeader>
        <CardTitle className="text-foreground text-xl flex items-center gap-2">
          <Store className="w-5 h-5" /> My businesses
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {businesses.map((b) => (
          <BusinessCard key={b.id} business={b} onChange={(updated) => setBusinesses((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))} />
        ))}
      </CardContent>
    </Card>
  );
}

function BusinessCard({ business, onChange }: { business: Business; onChange: (b: Business) => void }) {
  const [isStore, setIsStore] = useState(business.is_store);
  const [tagline, setTagline] = useState(business.store_tagline ?? '');
  const [categories, setCategories] = useState((business.store_categories ?? []).join(', '));
  const [collectAddress, setCollectAddress] = useState(business.collect_address ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const store_categories = categories
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      const patch = {
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
        <div className="min-w-0">
          <p className="font-semibold truncate">{business.name}</p>
          {isStore && business.slug && (
            <Link to={`/store/${business.slug}`} target="_blank" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              View your shop <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Label htmlFor={`store-${business.id}`} className="text-sm text-muted-foreground">Storefront</Label>
          <Switch id={`store-${business.id}`} checked={isStore} onCheckedChange={setIsStore} />
        </div>
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
