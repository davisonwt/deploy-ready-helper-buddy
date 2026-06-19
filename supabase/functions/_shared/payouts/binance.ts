// Binance Pay payout strategy. Wraps the existing BinancePayClient.createTransfer
// call that previously lived inline in _shared/distribution.ts → executeTransfer().

import { BinancePayClient } from "../binance.ts";
import type {
  PayoutContext,
  PayoutLeg,
  PayoutResult,
  PayoutStrategy,
} from "./types.ts";

const REMARK_BY_ROLE: Record<PayoutLeg["role"], string> = {
  sower: "Bestowal distribution - sower",
  tithing: "Bestowal distribution - tithing & admin",
  grower: "Bestowal distribution - product whispers",
};

export class BinancePayoutStrategy implements PayoutStrategy {
  readonly provider = "binance" as const;

  constructor(private readonly client: BinancePayClient = new BinancePayClient()) {}

  async dispatch(leg: PayoutLeg, ctx: PayoutContext): Promise<PayoutResult> {
    try {
      const response = await this.client.createTransfer({
        requestId: `${ctx.bestowalId}-${leg.role}-${crypto.randomUUID()}`,
        payeeId: leg.destination,
        amount: leg.amount,
        currency: leg.currency,
        remark: REMARK_BY_ROLE[leg.role],
      });
      return {
        status: "sent",
        reference: extractReference(response),
        raw: response,
      };
    } catch (err) {
      return {
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

function extractReference(response: unknown): string | undefined {
  if (response && typeof response === "object") {
    const r = response as Record<string, unknown>;
    const data = r.data as Record<string, unknown> | undefined;
    const candidate = data?.transferId ?? data?.tranId ?? r.transferId ?? r.tranId;
    if (typeof candidate === "string") return candidate;
  }
  return undefined;
}
