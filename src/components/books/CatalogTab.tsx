import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Info, Loader2, Package, Plus, RefreshCw, Store } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useBooksCurrency } from '@/lib/books/currency';
import { dateLabel } from '@/lib/books/format';
import type { BooksIncomeRow, BooksItemRow } from '@/hooks/useBooksData';

interface Props {
  businessId: string;
  booksEnabled: boolean;
  items: BooksItemRow[];
  income: BooksIncomeRow[];
  onChanged: () => void;
}

export default function CatalogTab({ businessId, booksEnabled, items, income, onChanged }: Props) {
  const { fmt, currency } = useBooksCurrency();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const syncMarketplace = async () => {
    setSyncing(true);
    const { data, error } = await supabase.rpc('books_backfill_products' as any, { _business_id: businessId } as any);
    setSyncing(false);
    if (error) return toast.error(error.message);
    toast.success(`${Number(data) || 0} marketplace listing(s) synced into your catalog`);
    onChanged();
  };

  const totals = useMemo(() => {
    const sales = income.filter((i) => i.income_type === 'sale');
    const gifts = income.filter((i) => i.income_type === 'gift');
    return {
      sales: sales.reduce((s, i) => s + i.amount, 0),
      gifts: gifts.reduce((s, i) => s + i.amount, 0),
      fees: income.reduce((s, i) => s + i.platform_fee, 0),
      salesCount: sales.length,
      giftsCount: gifts.length,
    };
  }, [income]);

  const addItem = async () => {
    if (!name.trim()) return toast.error('Item name is required');
    setSaving(true);
    const { error } = await supabase.from('books_items' as any).insert({
      business_id: businessId,
      name: name.trim(),
      unit_price: Number(price) || 0,
      currency,
      source: 'manual',
      kind: 'product',
    } as any);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Item added');
    setName(''); setPrice('');
    onChanged();
  };

  return (
    <div className="space-y-6">
      {!booksEnabled && (
        <div role="note" className="rounded-xl border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
          Marketplace sync is off. Turn on the Books add-on under <strong>Settings</strong> to have your listings and
          completed sales flow in here automatically.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border/60 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Sales income</p>
            <p className="text-lg font-semibold text-emerald-400">{fmt(totals.sales)}</p>
            <p className="text-xs text-muted-foreground">{totals.salesCount} recorded</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Gifts received</p>
            <p className="text-lg font-semibold text-primary">{fmt(totals.gifts)}</p>
            <p className="text-xs text-muted-foreground">{totals.giftsCount} recorded</p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/50 backdrop-blur">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Platform fees posted</p>
            <p className="text-lg font-semibold text-orange-400">{fmt(totals.fees)}</p>
            <p className="text-xs text-muted-foreground">Auto-logged as expenses</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3 rounded-xl border border-border/60 bg-background/40 p-4 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          How gifts vs. sales are treated for tax purposes depends on your country&apos;s rules — this distinction is
          kept for your records, not as tax advice.
        </p>
      </div>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><Package className="h-4 w-4" /> Catalog</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="item-name">Item name</Label>
              <Input id="item-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Add an item manually" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-price">Unit price ({currency})</Label>
              <Input id="item-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={addItem} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Add item
            </Button>
            <Button variant="outline" onClick={syncMarketplace} disabled={syncing || !booksEnabled}>
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Sync my marketplace listings
            </Button>
          </div>

          <div className="space-y-2 pt-2">
            {items.length === 0 && <p className="text-sm text-muted-foreground">No items yet.</p>}
            {items.map((it) => (
              <div key={it.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/40 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{it.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {it.kind}{it.sku ? ` · ${it.sku}` : ''}{it.active ? '' : ' · inactive'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {it.source === 'marketplace' && (
                    <Badge variant="outline" className="text-[10px] uppercase">
                      <Store className="mr-1 h-3 w-3" /> marketplace
                    </Badge>
                  )}
                  <span className="text-sm">{fmt(it.unit_price)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2"><CardTitle className="text-base">Marketplace income ledger</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {income.length === 0 && (
            <p className="text-sm text-muted-foreground">Nothing has synced in yet.</p>
          )}
          {income.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/40 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm">{r.description}</p>
                <p className="text-xs text-muted-foreground">
                  {dateLabel(r.occurred_at)}
                  {r.payment_method ? ` · ${r.payment_method}` : ''}
                  {r.buyer_reference ? ` · ref ${r.buyer_reference.slice(0, 18)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase ${r.income_type === 'gift' ? 'border-primary/40 text-primary' : 'border-emerald-400/40 text-emerald-300'}`}
                >
                  {r.income_type}
                </Badge>
                <div className="text-right">
                  <p className="text-sm text-emerald-400">+{fmt(r.amount)}</p>
                  {r.platform_fee > 0 && (
                    <p className="text-xs text-orange-400">fee {fmt(r.platform_fee)}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
