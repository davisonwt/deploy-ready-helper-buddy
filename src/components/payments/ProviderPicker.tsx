import { PAYOUT_PROVIDERS, PayoutProviderId, quoteFee } from '@/lib/payments/providerFees';
import { cn } from '@/lib/utils';

interface ProviderPickerProps {
  value: PayoutProviderId;
  onChange: (v: PayoutProviderId) => void;
  /** Amount the buyer is about to pay (for the fee preview). */
  amount: number;
  /** Currency symbol prepended to the fee preview. Defaults to "$". */
  currencySymbol?: string;
  /**
   * 'buyer' frames copy as "fee on this payment", 'payee' as "fee at payout".
   * In feature A we use 'buyer'. Reused by features B/D in 'payee' mode.
   */
  mode?: 'buyer' | 'payee';
  disabled?: boolean;
}

/**
 * Shared payment-provider selector.
 * Fee figures come from `src/lib/payments/providerFees.ts` so there is one
 * place to edit them across checkout, onboarding, and the wallet dashboard.
 */
export default function ProviderPicker({
  value,
  onChange,
  amount,
  currencySymbol = '$',
  mode = 'buyer',
  disabled,
}: ProviderPickerProps) {
  return (
    <div role="radiogroup" className="space-y-2">
      {PAYOUT_PROVIDERS.map((p) => {
        const fee = quoteFee(p.id, amount, currencySymbol);
        const selected = value === p.id;
        const feeLine =
          mode === 'buyer'
            ? `Estimated processor fee: ${fee.display} (≈ ${p.feePct[0]}–${p.feePct[1]}%) — comes out of the total.`
            : `${p.note}`;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(p.id)}
            className={cn(
              'w-full text-left rounded-md border p-3 transition-colors',
              selected
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border bg-muted/30 hover:bg-muted/50',
              disabled && 'opacity-60 cursor-not-allowed',
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center',
                  selected ? 'border-primary' : 'border-muted-foreground/40',
                )}
                aria-hidden
              >
                {selected && <div className="h-2 w-2 rounded-full bg-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{p.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{feeLine}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
