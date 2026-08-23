import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpenCheck, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BooksCurrencyProvider, useBooksCurrency } from '@/lib/books/currency';
import { dateLabel, toNumber } from '@/lib/books/format';
import { useBooksBusiness } from '@/hooks/useBooksBusiness';
import type { CatalogSaleRow } from '@/components/books/catalogTypes';

interface ItemState {
  id: string;
  name: string;
  kind: string;
  sku: string | null;
  unit_price: number;
  product_id: string | null;
  category: string | null;
  whisperer_pct: number | null;
}

const S2G_PCT = 15;

function Breakdown({ item, sales }: { item: ItemState; sales: CatalogSaleRow[] }) {
  const { fmt } = useBooksCurrency();

  const totals = useMemo(
    () =>
      sales.reduce(
        (acc, s) => {
          acc.gross += s.amount;
          acc.fee += s.platform_fee;
          acc.whisper += s.whisperer_amount;
          acc.net += s.amount - s.platform_fee - s.whisperer_amount;
          return acc;
        },
        { gross: 0, fee: 0, whisper: 0, net: 0 }
      ),
    [sales]
  );

  const stats = [
    { label: 'Times sold', value: String(sales.length), tone: '' },
    { label: 'Gross bestowed', value: fmt(totals.gross), tone: '' },
    { label: `S2G fee (${S2G_PCT}%)`, value: `-${fmt(totals.fee)}`, tone: 'text-orange-400' },
    {
      label: `Whisperer (${item.whisperer_pct ?? 0}%)`,
      value: `-${fmt(totals.whisper)}`,
      tone: totals.whisper > 0 ? 'text-primary' : 'text-muted-foreground',
    },
    { label: 'Sower total', value: fmt(totals.net), tone: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="border-border/60 bg-card/50 backdrop-blur">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className={`text-lg font-semibold ${s.tone}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Every bestowal on this seed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sales.length === 0 && (
            <p className="text-sm text-muted-foreground">No completed bestowals for this item yet.</p>
          )}
          {sales.map((s) => (
            <div key={s.id} className="rounded-lg border border-border/50 bg-background/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{dateLabel(s.created_at)}</p>
                <p className="text-sm font-semibold">{fmt(s.amount)}</p>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">S2G fee</dt>
                  <dd className="text-orange-400">-{fmt(s.platform_fee)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Whisperer</dt>
                  <dd className={s.whisperer_amount > 0 ? 'text-primary' : 'text-muted-foreground'}>
                    {s.whisperer_amount > 0 ? `-${fmt(s.whisperer_amount)}` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Sower</dt>
                  <dd className="text-emerald-400">
                    {fmt(s.amount - s.platform_fee - s.whisperer_amount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="uppercase">{s.income_type}</dd>
                </div>
              </dl>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BooksCatalogItemPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { business, businessId, loading: bizLoading } = useBooksBusiness();
  const [item, setItem] = useState<ItemState | null>(null);
  const [sales, setSales] = useState<CatalogSaleRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!itemId || !businessId) return;
    (async () => {
      setLoading(true);
      const { data: row } = await supabase
        .from('books_items' as any)
        .select('id, name, kind, sku, unit_price, product_id')
        .eq('id', itemId)
        .eq('business_id', businessId)
        .maybeSingle();
      if (cancelled) return;
      if (!row) {
        setItem(null);
        setLoading(false);
        return;
      }
      const r = row as any;
      let category: string | null = null;
      let whispererPct: number | null = null;
      let rows: CatalogSaleRow[] = [];
      if (r.product_id) {
        const [prod, best] = await Promise.all([
          supabase
            .from('products')
            .select('category, whisperer_commission_percent')
            .eq('id', r.product_id)
            .maybeSingle(),
          supabase
            .from('product_bestowals')
            .select('id, product_id, amount, s2g_fee, whisperer_id, whisperer_amount, created_at')
            .eq('product_id', r.product_id)
            .eq('status', 'completed')
            .order('created_at', { ascending: false }),
        ]);
        if (cancelled) return;
        const p = prod.data as any;
        category = p?.category ?? null;
        whispererPct =
          p?.whisperer_commission_percent == null ? null : toNumber(p.whisperer_commission_percent);
        rows = ((best.data as any[]) ?? []).map((b) => ({
          id: b.id,
          product_id: b.product_id,
          amount: toNumber(b.amount),
          platform_fee: toNumber(b.s2g_fee),
          whisperer_amount: b.whisperer_id ? toNumber(b.whisperer_amount) : 0,
          whisperer_id: b.whisperer_id ?? null,
          income_type: 'sale' as const,
          created_at: b.created_at,
        }));
      }
      setItem({
        id: r.id,
        name: r.name,
        kind: r.kind,
        sku: r.sku,
        unit_price: toNumber(r.unit_price),
        product_id: r.product_id,
        category,
        whisperer_pct: whispererPct,
      });
      setSales(rows);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [itemId, businessId]);

  return (
    <BooksCurrencyProvider currency={business?.currency}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/books')}>
              <BookOpenCheck className="mr-2 h-4 w-4" /> Books
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{item?.name ?? 'Catalog item'}</h1>
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {item?.category || item?.kind}
              {item?.sku ? ` · ${item.sku}` : ''}
              {item?.whisperer_pct ? (
                <Badge variant="outline" className="border-primary/40 text-[10px] text-primary">
                  Whisperer offer: {item.whisperer_pct}%
                </Badge>
              ) : null}
            </p>
          </div>
        </div>

        {loading || bizLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading breakdown…
          </div>
        ) : item ? (
          <Breakdown item={item} sales={sales} />
        ) : (
          <p className="text-sm text-muted-foreground">This catalog item was not found in your books.</p>
        )}
      </div>
    </BooksCurrencyProvider>
  );
}
