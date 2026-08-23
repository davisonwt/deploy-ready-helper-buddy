import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useBooksCurrency } from '@/lib/books/currency';
import { dateLabel } from '@/lib/books/format';
import type { BooksItemRow } from '@/hooks/useBooksData';
import type { CatalogSaleRow } from './catalogTypes';

interface Props {
  item: (BooksItemRow & { category?: string | null; whisperer_pct?: number | null }) | null;
  sales: CatalogSaleRow[];
  onOpenChange: (open: boolean) => void;
}

export default function CatalogItemDetailDialog({ item, sales, onOpenChange }: Props) {
  const { fmt } = useBooksCurrency();
  if (!item) return null;

  const totals = sales.reduce(
    (acc, s) => {
      acc.gross += s.amount;
      acc.fee += s.platform_fee;
      acc.whisper += s.whisperer_amount;
      acc.net += s.amount - s.platform_fee - s.whisperer_amount;
      return acc;
    },
    { gross: 0, fee: 0, whisper: 0, net: 0 }
  );

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            {item.name}
            {item.whisperer_pct ? (
              <Badge variant="outline" className="border-primary/40 text-primary">
                Whisperer offer: {item.whisperer_pct}%
              </Badge>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border/60 bg-background/40 p-3">
            <p className="text-xs text-muted-foreground">Bestowal value</p>
            <p className="text-sm font-semibold">{fmt(totals.gross)}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/40 p-3">
            <p className="text-xs text-muted-foreground">Platform fees</p>
            <p className="text-sm font-semibold text-orange-400">{fmt(totals.fee)}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/40 p-3">
            <p className="text-xs text-muted-foreground">Whisperer commission</p>
            <p className="text-sm font-semibold text-primary">{fmt(totals.whisper)}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-background/40 p-3">
            <p className="text-xs text-muted-foreground">Net to sower</p>
            <p className="text-sm font-semibold text-emerald-400">{fmt(totals.net)}</p>
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <p className="text-sm font-medium">Per-sale breakdown</p>
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
                  <dt className="text-muted-foreground">Platform fee</dt>
                  <dd className="text-orange-400">-{fmt(s.platform_fee)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Whisperer</dt>
                  <dd className={s.whisperer_amount > 0 ? 'text-primary' : 'text-muted-foreground'}>
                    {s.whisperer_amount > 0 ? `-${fmt(s.whisperer_amount)}` : 'none'}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Net to sower</dt>
                  <dd className="text-emerald-400">
                    {fmt(s.amount - s.platform_fee - s.whisperer_amount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Type</dt>
                  <dd>{s.income_type}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
