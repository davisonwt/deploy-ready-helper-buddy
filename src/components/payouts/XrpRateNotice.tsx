import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, TrendingUp } from 'lucide-react';
import { useXrpRate, usdToXrp } from '@/hooks/useXrpRate';

interface Props {
  /** Optional USD amount to show the live XRP equivalent of. */
  usdAmount?: number | null;
  /** 'payout' wording for sowers/whisperers being paid, 'checkout' for bestowers paying. */
  context?: 'payout' | 'checkout';
}

/**
 * Explains the one thing every member needs to understand about the XRP rail:
 * XRP is not a stablecoin, so USD stays the unit of account and XRP is only how
 * the money travels.
 */
export default function XrpRateNotice({ usdAmount = null, context = 'payout' }: Props) {
  const { rate, sources, loading, error, refresh, quoteTtlSeconds } = useXrpRate();

  const minutes = Math.round(quoteTtlSeconds / 60);

  return (
    <Alert>
      <TrendingUp className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        XRP is not a stablecoin
        {rate && (
          <Badge variant="secondary" className="font-mono">
            1 XRP ≈ ${rate.toFixed(4)}
          </Badge>
        )}
      </AlertTitle>
      <AlertDescription className="space-y-2 text-sm">
        <p>
          {context === 'payout' ? (
            <>
              Your earnings are always held and counted in US dollars. When you withdraw, we convert
              your dollar balance to XRP at the live rate at that moment — so a price swing never
              changes what you are owed.
            </>
          ) : (
            <>
              Seeds are priced in US dollars. At checkout we show you the exact XRP amount and hold
              that rate for {minutes} minutes — send within the window and the bestowal settles at
              the price you saw.
            </>
          )}
        </p>
        <p className="text-muted-foreground">
          The S2G share and any whisperer commission are calculated on the dollar value too, so
          every split stays exactly as agreed.
        </p>

        {usdAmount && rate ? (
          <p className="font-medium">
            ${usdAmount.toFixed(2)} ≈ {usdToXrp(usdAmount, rate).toFixed(6)} XRP right now
          </p>
        ) : null}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {loading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Checking live price…
            </>
          ) : error ? (
            <span className="text-destructive">{error}</span>
          ) : (
            <span>
              Median of {sources.length} exchange{sources.length === 1 ? '' : 's'}
              {sources.length ? `: ${sources.map((s) => s.name).join(', ')}` : ''}
            </span>
          )}
          <Button size="sm" variant="ghost" className="h-6 px-2" onClick={refresh}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
