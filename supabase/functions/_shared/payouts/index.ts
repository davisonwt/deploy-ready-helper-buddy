// Strategy resolver. Maps a PayoutProvider to a concrete strategy instance.
// Strategies are stateless (or cheap to construct) so we instantiate per call.

import { BinancePayoutStrategy } from "./binance.ts";
import { ManualPayoutStrategy } from "./manual.ts";
import { NowPaymentsPayoutStrategy } from "./nowpayments.ts";
import { PayPalPayoutStrategy } from "./paypal.ts";
import type { PayoutProvider, PayoutStrategy } from "./types.ts";

export function getPayoutStrategy(provider: PayoutProvider): PayoutStrategy {
  switch (provider) {
    case "nowpayments":
      return new NowPaymentsPayoutStrategy();
    case "paypal":
      return new PayPalPayoutStrategy();
    case "binance":
      return new BinancePayoutStrategy();
    case "manual":
    default:
      return new ManualPayoutStrategy();
  }
}

export * from "./types.ts";
