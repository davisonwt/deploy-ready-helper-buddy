// Direct Solana USDC pay-in: intent creation + on-chain verification.
// spec-payments.md section 3 ("Inbound: direct Solana payment detection")
// -- "the most important piece of infrastructure in this spec and the one
// most likely to lose money if it is wrong."
//
// Solana Pay reference-key pattern (standard, not homegrown): every intent
// gets a fresh keypair whose PUBLIC key is embedded as a read-only account
// in the buyer's transfer. That makes the payment findable via
// getSignaturesForAddress without a unique deposit wallet per order. The
// reference's PRIVATE key is never generated or stored anywhere -- nothing
// ever signs with it, so there is nothing to keep secret or lose.
//
// Same "no @solana/web3.js" constraint as _shared/solanaPayout.ts (2s CPU
// ceiling on the edge runtime) -- micro-sol-signer + plain JSON-RPC only.
//
// Verification requires a `transferChecked` SPL instruction specifically
// (not the older `transfer`) -- transferChecked carries the mint in its own
// parsed instruction data, which is what lets this code confirm "USDC,
// specifically" without a second RPC round-trip to look up the token
// account's mint. Every modern wallet (Phantom included) sends
// transferChecked by default. A plain `transfer` is treated as unverifiable
// and left pending rather than guessed at -- fail closed, per the file's
// own stakes.

import * as sol from "https://esm.sh/micro-sol-signer@0.8.2";
import { USDC_MINTS, getSolanaCluster, getSolanaRpcUrl, type SolanaCluster } from "./cryptoNetworks.ts";
// Generic despite the module's name -- capture.ts's finalize step already
// branches on `kind` for every order type (basket/content/gift/orchard/
// topup/booking) and is the one place PayPal capture and Solana
// confirmation are required to converge (spec-payments.md: "reuse, do not
// fork, the finalize path"). Not renamed/moved here -- avoids churning
// every existing PayPal import for a rename with no behavior change.
import { finalizeCompletedOrder, type PaypalOrderKind } from "./paypal/capture.ts";

const USDC_DECIMALS = 6;

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(getSolanaRpcUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const body = await res.json();
  if (body.error) {
    throw new Error(`Solana RPC ${method} failed: ${body.error.message ?? JSON.stringify(body.error)}`);
  }
  return body.result as T;
}

export interface SolanaIntentPricing {
  referencePubkey: string;
  solanaPayUrl: string;
  hotWalletAddress: string;
  amountUsdc: number;
  cluster: SolanaCluster;
  expiresAt: string;
}

/**
 * Generates a fresh reference keypair and returns everything a checkout
 * screen needs to render (Solana Pay URL for QR/deep-link, raw address +
 * amount for manual copy). Does not touch the database -- callers insert
 * the solana_payment_intents row themselves alongside their own order row,
 * inside their own existing transaction/insert sequence.
 */
export function buildSolanaIntentPricing(params: {
  hotWalletAddress: string;
  amountUsdc: number;
  cluster: SolanaCluster;
  label: string;
  message: string;
  expiresInMinutes?: number;
}): SolanaIntentPricing {
  // The reference is a bare public key with no signing role -- there is
  // nothing sensitive about generating it via Web Crypto's CSPRNG and
  // discarding the seed immediately after deriving the address.
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const referencePubkey = sol.getAddress(seed);
  const mint = USDC_MINTS[params.cluster];
  const expiresAt = new Date(Date.now() + (params.expiresInMinutes ?? 30) * 60_000).toISOString();

  const url = new URL(`solana:${params.hotWalletAddress}`);
  url.searchParams.set("amount", params.amountUsdc.toFixed(6).replace(/\.?0+$/, "") || "0");
  url.searchParams.set("spl-token", mint);
  url.searchParams.set("reference", referencePubkey);
  url.searchParams.set("label", params.label);
  url.searchParams.set("message", params.message);

  return {
    referencePubkey,
    solanaPayUrl: url.toString(),
    hotWalletAddress: params.hotWalletAddress,
    amountUsdc: params.amountUsdc,
    cluster: params.cluster,
    expiresAt,
  };
}

// Reports only "was a matching USDC transfer found" + the amount actually
// received -- deciding paid vs. underpaid vs. overpaid requires the
// intent's expected amount, which this function doesn't know; that
// decision belongs to the caller (checkAndFinalizeSolanaIntent below).
export type SolanaVerifyOutcome =
  | { status: "pending" }
  | { status: "paid"; signature: string; receivedAmountUsdc: number };

interface ParsedTokenTransfer {
  type?: string;
  info?: {
    mint?: string;
    destination?: string;
    tokenAmount?: { amount?: string };
    authority?: string;
  };
}

interface ParsedInstruction {
  program?: string;
  parsed?: ParsedTokenTransfer;
}

interface JsonParsedTransaction {
  meta?: { err: unknown } | null;
  transaction?: {
    message?: { instructions?: ParsedInstruction[] };
  };
}

/**
 * Looks up every signature that has ever referenced `referencePubkey`,
 * finds one carrying a finalized USDC transferChecked into the hot
 * wallet's own USDC token account, and reports the result. Returns
 * "pending" (not an error) when nothing matching has landed yet -- the
 * normal state while a client polls or a cron sweep runs.
 *
 * Never throws on "no payment found yet" -- only on a genuine RPC failure,
 * which callers should treat as "try again next poll," not as proof of
 * anything about the payment itself.
 */
export async function verifySolanaPayment(params: {
  referencePubkey: string;
  hotWalletAddress: string;
  cluster: SolanaCluster;
}): Promise<SolanaVerifyOutcome> {
  const mint = USDC_MINTS[params.cluster];
  const hotWalletAta = sol.tokenAddress({
    mint,
    owner: params.hotWalletAddress,
    tokenProgram: sol.TOKEN_PROGRAM,
  });

  const signatures = await rpc<Array<{ signature: string; err: unknown }>>(
    "getSignaturesForAddress",
    [params.referencePubkey, { limit: 10, commitment: "finalized" }],
  );
  if (!signatures || signatures.length === 0) return { status: "pending" };

  for (const sigInfo of signatures) {
    if (sigInfo.err) continue; // failed on-chain -- not a payment

    const tx = await rpc<JsonParsedTransaction | null>("getTransaction", [
      sigInfo.signature,
      { encoding: "jsonParsed", commitment: "finalized", maxSupportedTransactionVersion: 0 },
    ]);
    // Not yet available at 'finalized' commitment -- try again on a later poll/sweep.
    if (!tx || tx.meta?.err) continue;

    const instructions = tx.transaction?.message?.instructions ?? [];
    for (const ix of instructions) {
      if (ix.program !== "spl-token") continue;
      const parsed = ix.parsed;
      if (parsed?.type !== "transferChecked") continue;
      const info = parsed.info;
      if (!info || info.mint !== mint || info.destination !== hotWalletAta) continue;

      const rawAmount = BigInt(info.tokenAmount?.amount ?? "0");
      const receivedAmountUsdc = Number(rawAmount) / 10 ** USDC_DECIMALS;
      return { status: "paid", signature: sigInfo.signature, receivedAmountUsdc };
    }
  }

  return { status: "pending" };
}

export type SolanaOrderKind = Exclude<PaypalOrderKind, "booking">;

export interface SolanaIntentRow {
  id: string;
  order_kind: SolanaOrderKind;
  order_id: string;
  amount_usdc: number;
  reference_pubkey: string;
  hot_wallet_address: string;
  status: string;
  cluster: SolanaCluster;
  expires_at: string;
}

export interface CheckIntentResult {
  status: "pending" | "paid" | "underpaid" | "expired" | "failed";
  receivedAmountUsdc?: number;
  signature?: string;
}

const ORDER_TABLE: Record<SolanaOrderKind, string> = {
  basket: "basket_orders",
  content: "content_purchases",
  gift: "bestowals",
  orchard: "bestowals",
  topup: "topups",
};
// basket_orders/topups use `status`; content_purchases/bestowals use `payment_status`.
const ORDER_STATUS_COLUMN: Record<SolanaOrderKind, string> = {
  basket: "status",
  content: "payment_status",
  gift: "payment_status",
  orchard: "payment_status",
  topup: "status",
};

/**
 * The one entry point both check-solana-payment (client poll) and
 * sweep-solana-payments (cron) call. Idempotent -- safe to call repeatedly
 * on the same still-pending intent, and a no-op once the intent has
 * already reached a terminal status.
 */
export async function checkAndFinalizeSolanaIntent(
  // deno-lint-ignore no-explicit-any
  service: any,
  intent: SolanaIntentRow,
): Promise<CheckIntentResult> {
  if (intent.status !== "pending") {
    return { status: intent.status as CheckIntentResult["status"] };
  }

  const outcome = await verifySolanaPayment({
    referencePubkey: intent.reference_pubkey,
    hotWalletAddress: intent.hot_wallet_address,
    cluster: intent.cluster,
  });

  await service.from("solana_payment_intents")
    .update({ checked_at: new Date().toISOString() })
    .eq("id", intent.id);

  if (outcome.status === "pending") {
    if (new Date(intent.expires_at).getTime() < Date.now()) {
      await expireSolanaIntent(service, intent);
      return { status: "expired" };
    }
    return { status: "pending" };
  }

  const { signature, receivedAmountUsdc } = outcome;

  // Idempotency + reuse guard: a signature must never credit two intents.
  // The UNIQUE(webhook_id, provider) constraint is the actual enforcement
  // -- fail closed on the insert itself, not on a prior SELECT (which has
  // a race between two concurrent callers, e.g. a client poll and the cron
  // sweep landing at the same moment).
  const { error: dedupeErr } = await service.from("processed_webhooks").insert({
    provider: "solana",
    webhook_id: signature,
    payload_hash: intent.id,
  });
  if (dedupeErr) {
    // Either this exact intent was just finalized by a concurrent caller
    // (benign -- re-read its now-updated status), or this signature was
    // already used by a DIFFERENT intent (the reuse case spec-payments.md
    // calls out -- refuse to also credit this one). Either way, this
    // caller must not proceed to finalize.
    console.warn("solana signature dedupe conflict", signature, intent.id, dedupeErr.message);
    const { data: fresh } = await service.from("solana_payment_intents")
      .select("status, signature, received_amount_usdc")
      .eq("id", intent.id)
      .maybeSingle();
    if (fresh?.status && fresh.status !== "pending") {
      return { status: fresh.status, signature: fresh.signature, receivedAmountUsdc: fresh.received_amount_usdc };
    }
    return { status: "pending" }; // signature belonged to another intent -- this one is still unpaid
  }

  if (receivedAmountUsdc + 1e-6 < intent.amount_usdc) {
    await service.from("solana_payment_intents").update({
      status: "underpaid",
      signature,
      received_amount_usdc: receivedAmountUsdc,
    }).eq("id", intent.id);
    return { status: "underpaid", signature, receivedAmountUsdc };
  }

  await service.from("solana_payment_intents").update({
    status: "paid",
    signature,
    received_amount_usdc: receivedAmountUsdc,
    paid_at: new Date().toISOString(),
  }).eq("id", intent.id);

  await finalizeCompletedOrder(service, intent.order_kind, intent.order_id, signature);

  return { status: "paid", signature, receivedAmountUsdc };
}

// deno-lint-ignore no-explicit-any
async function expireSolanaIntent(service: any, intent: SolanaIntentRow): Promise<void> {
  await service.from("solana_payment_intents").update({ status: "expired" }).eq("id", intent.id);
  await service.from(ORDER_TABLE[intent.order_kind])
    .update({ [ORDER_STATUS_COLUMN[intent.order_kind]]: "expired" })
    .eq("id", intent.order_id);
}

export interface SolanaPaymentResponse {
  intentId: string;
  referencePubkey: string;
  solanaPayUrl: string;
  hotWalletAddress: string;
  amountUsdc: number;
  cluster: SolanaCluster;
  expiresAt: string;
}

/**
 * Every create-*-order function's 'solana' branch calls this exactly once,
 * right after inserting its own order row (basket_orders/content_purchases/
 * bestowals/topups), passing that row's own id as `orderId`. Returns the
 * shape the client renders as the QR/deep-link screen (see
 * SolanaPaymentPanel.tsx) under a `solanaPayment` key on the create-*-order
 * response, in place of `invoiceUrl`/`approveUrl`.
 */
export async function createSolanaIntent(
  // deno-lint-ignore no-explicit-any
  service: any,
  params: { orderKind: SolanaOrderKind; orderId: string; amountUsdc: number; label: string; message: string },
): Promise<SolanaPaymentResponse> {
  const hotWalletAddress = (Deno.env.get("SOLANA_HOT_WALLET_ADDRESS") ?? "").trim();
  if (!hotWalletAddress) {
    throw new Error(
      "SOLANA_HOT_WALLET_ADDRESS secret is not configured -- add the hot wallet's public address in Project Settings -> Secrets.",
    );
  }
  const cluster = getSolanaCluster();
  const pricing = buildSolanaIntentPricing({
    hotWalletAddress,
    amountUsdc: params.amountUsdc,
    cluster,
    label: params.label,
    message: params.message,
  });

  const { data: row, error } = await service
    .from("solana_payment_intents")
    .insert({
      order_kind: params.orderKind,
      order_id: params.orderId,
      amount_usdc: pricing.amountUsdc,
      reference_pubkey: pricing.referencePubkey,
      hot_wallet_address: pricing.hotWalletAddress,
      cluster: pricing.cluster,
      expires_at: pricing.expiresAt,
    })
    .select("id")
    .single();
  if (error || !row) {
    throw new Error(`solana_payment_intent_insert_failed:${error?.message}`);
  }

  return {
    intentId: row.id,
    referencePubkey: pricing.referencePubkey,
    solanaPayUrl: pricing.solanaPayUrl,
    hotWalletAddress: pricing.hotWalletAddress,
    amountUsdc: pricing.amountUsdc,
    cluster: pricing.cluster,
    expiresAt: pricing.expiresAt,
  };
}
