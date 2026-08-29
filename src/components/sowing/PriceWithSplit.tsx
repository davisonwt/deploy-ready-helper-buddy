import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { priceBreakdown } from '@/lib/pricing/platformFee';

interface Props {
  /** Base price the sower sets — what they receive before any split shown below. Ignored while free. */
  price: number | null;
  isFree: boolean;
  onChangePrice: (base: number | null) => void;
  onChangeFree: (free: boolean) => void;
  /** Defaults to "Price" — e.g. "Album price" when the whole form is priced as one unit. */
  label?: string;
}

/**
 * One number field, the live split underneath, and the Free toggle that
 * replaces the old License Type dropdown — spec-sowing-forms.md's "Price
 * with live split". Always priceBreakdown(); never a second copy of the
 * maths.
 */
export default function PriceWithSplit({ price, isFree, onChangePrice, onChangeFree, label = 'Price' }: Props) {
  const split = !isFree && price != null && price > 0 ? priceBreakdown(price) : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="sow-price">{label}</Label>
        <div className="flex items-center gap-2">
          <Label htmlFor="sow-free" className="text-sm text-muted-foreground font-normal cursor-pointer">Free</Label>
          <Switch id="sow-free" checked={isFree} onCheckedChange={onChangeFree} />
        </div>
      </div>

      {!isFree && (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            id="sow-price"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            className="pl-6"
            value={price ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              onChangePrice(v === '' ? null : Number(v));
            }}
          />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {isFree
          ? 'Free — no charge to the grower, nothing to split.'
          : split
          ? `Buyer pays $${split.total.toFixed(2)} · you receive $${split.base.toFixed(2)} · Sow2Grow $${split.s2gFee.toFixed(2)}`
          : 'Set a price to see what you’ll receive.'}
      </p>
    </div>
  );
}
