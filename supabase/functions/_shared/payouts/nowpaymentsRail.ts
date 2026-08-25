// Shared NOWPayments rail for the aggregated earnings payout runners
// (payout-sower-earnings, payout-whisperer-earnings).
//
// WHY THIS EXISTS: S2G holds funds on NOWPayments and deliberately keeps NO hot
// keys of its own. So every crypto payout must leave through NOWPayments Mass
// Payouts rather than through the send-solana-usdc-payout / send-xrp-payout
// hot-key senders (which stay available as an explicit escape hatch via
// PAYOUT_PROVIDER=hotkey).
//
// TWO-STEP REALITY: creating a NOWPayments payout batch does NOT move money.
// It returns a batch id in status 'awaiting_2fa'; a human admin then verifies it
// with a 2FA code (nowpayments-verify-payout). Callers must therefore mark their
// ledger rows 'awaiting_2fa' + payout_reference, NOT 'paid'.

/** Payout network as stored on profiles.payout_network. */
export type PayoutNetwork = "solana_usdc" | "xrp";

export interface NowPaymentsRailTarget {
  /** NOWPayments payout currency ticker. */
  currency: string;
  /** NOWPayments network hint, when the ticker alone is ambiguous. */
  network: string | null;
  /** Amount denominated in `currency` (NOT in USD). */
  amount: number;
}

/**
 * Which provider the runners should use. NOWPayments is the default because the
 * platform's holding wallets live there. `hotkey` restores the legacy direct
 * on-chain senders and is only meant for controlled/manual operation.
 */
export function payoutProvider(): "nowpayments" | "hotkey" {
  const raw = (Deno.env.get("PAYOUT_PROVIDER") ?? "nowpayments").trim().toLowerCase();
  return raw === "hotkey" ? "hotkey" : "nowpayments";
}

const USDC_SOL_CURRENCY = (Deno.env.get("NOWPAYMENTS_USDC_SOL_CURRENCY") ?? "usdcsol")
  .trim()
  .toLowerCase();

function round6(n: number) {
  return Math.round((n + Number.EPSILON) * 1e6) / 1e6;
}

/**
 * Convert a USD ledger amount into the payout currency NOWPayments expects.
 * Returns null when the amount cannot be established without guessing (e.g. an
 * XRP payout with no trustworthy USD/XRP rate for this run).
 */
export function toNowPaymentsTarget(
  network: PayoutNetwork,
  amountUsd: number,
  xrpUsdRate: number | null,
): NowPaymentsRailTarget | null {
  if (!(amountUsd > 0)) return null;

  if (network === "solana_usdc") {
    // USDC is 1:1 with the USD ledger amount — no conversion, no guessing.
    return { currency: USDC_SOL_CURRENCY, network: "sol", amount: round6(amountUsd) };
  }

  if (network === "xrp") {
    if (!xrpUsdRate || !(xrpUsdRate > 0)) return null;
    return { currency: "xrp", network: "xrp", amount: round6(amountUsd / xrpUsdRate) };
  }

  return null;
}

export interface NowPaymentsRailResult {
  status: "awaiting_2fa" | "manual_required";
  reference?: string;
  error?: string;
  raw?: unknown;
}

/**
 * Create a NOWPayments payout batch for one recipient. Never writes to any
 * ledger — the calling runner records the outcome against its own rows.
 */
export async function createNowPaymentsPayout(opts: {
  supabaseUrl: string;
  serviceRoleKey: string;
  externalId: string;
  role: "sower" | "whisperer";
  address: string;
  target: NowPaymentsRailTarget;
}): Promise<NowPaymentsRailResult> {
  try {
    const res = await fetch(`${opts.supabaseUrl}/functions/v1/nowpayments-payout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.serviceRoleKey}`,
        apikey: opts.serviceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        externalId: opts.externalId,
        role: opts.role,
        address: opts.address,
        currency: opts.target.currency,
        network: opts.target.network,
        amount: opts.target.amount,
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        status: "manual_required",
        error: (body as any)?.error ?? `nowpayments_payout_http_${res.status}`,
        raw: body,
      };
    }

    const status = (body as any)?.status;
    const reference = (body as any)?.reference;
    if (status === "awaiting_2fa" && reference) {
      return { status: "awaiting_2fa", reference: String(reference), raw: body };
    }

    return {
      status: "manual_required",
      error: (body as any)?.error ?? `unexpected_status:${status ?? "none"}`,
      raw: body,
    };
  } catch (err) {
    return {
      status: "manual_required",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
