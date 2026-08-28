import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ReceiptText } from 'lucide-react';
import { format } from 'date-fns';

interface SeedLine {
  title: string;
  amount: number;
}

interface BestowalReceiptMetadata {
  order_ref?: string;
  date?: string;
  provider?: string;
  currency?: string;
  seed_lines?: SeedLine[];
  sower_name?: string | null;
  sower_amount?: number | null;
  s2g_fee?: number | null;
  whisperer_amount?: number | null;
  whisperer_name?: string | null;
  buyer_total?: number;
  topup_amount?: number;
  topup_fee?: number;
}

const usd = (n: number | null | undefined) =>
  typeof n === 'number' ? `$${n.toFixed(2)}` : '—';

export function BestowalReceiptMessage({ metadata }: { metadata: BestowalReceiptMetadata }) {
  const {
    order_ref, date, provider, seed_lines, sower_name,
    sower_amount, s2g_fee, whisperer_amount, whisperer_name,
    buyer_total, topup_amount, topup_fee,
  } = metadata || {};

  const isTopup = !seed_lines || seed_lines.length === 0;
  const dateLabel = date ? format(new Date(date), 'PP') : '';

  return (
    <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-emerald-500/10 border-amber-500/20 max-w-md">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-amber-500/20">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-600 text-white shadow-lg">
          <ReceiptText className="h-4 w-4" />
          <span className="text-xs font-semibold">Sow2Grow Receipt</span>
        </div>
      </div>

      <div className="space-y-1 text-xs text-muted-foreground mb-3">
        <div className="flex justify-between"><span>Order</span><span className="font-mono">{order_ref}</span></div>
        <div className="flex justify-between"><span>Date</span><span>{dateLabel}</span></div>
        <div className="flex justify-between"><span>Provider</span><span className="capitalize">{provider}</span></div>
      </div>

      <Separator className="my-2" />

      {isTopup ? (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Wallet top-up</p>
          <div className="flex justify-between text-sm">
            <span>Amount credited</span>
            <span className="font-medium">{usd(topup_amount)}</span>
          </div>
          {!!topup_fee && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Processor fee</span>
              <span>{usd(topup_fee)}</span>
            </div>
          )}
        </div>
      ) : (
        <>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">
              Seed{(seed_lines?.length ?? 0) > 1 ? 's' : ''} — from {sower_name}
            </p>
            {seed_lines?.map((line, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="truncate pr-2">{line.title}</span>
                <span className="font-medium whitespace-nowrap">{usd(line.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Sower receives</span>
              <span>{usd(sower_amount)}</span>
            </div>
            {!!whisperer_amount && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Whisperer share{whisperer_name ? ` (${whisperer_name})` : ''}</span>
                <span>{usd(whisperer_amount)}</span>
              </div>
            )}
          </div>

          <Separator className="my-2" />

          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">
              Platform fee — Sow2Grow
            </p>
            <div className="flex justify-between text-sm">
              <span>Sow2Grow platform fee (15%)</span>
              <span className="font-medium">{usd(s2g_fee)}</span>
            </div>
          </div>
        </>
      )}

      <Separator className="my-2" />

      <div className="flex justify-between text-sm font-bold">
        <span>Total paid</span>
        <span>{usd(buyer_total)}</span>
      </div>
    </Card>
  );
}
