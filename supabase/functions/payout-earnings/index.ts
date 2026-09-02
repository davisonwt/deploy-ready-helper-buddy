// payout-earnings — the ONE weekly payout run, replacing both
// payout-sower-earnings (daily, NOWPayments crypto rails, product_bestowals
// only) and dispatchPayouts() (immediate-dispatch at gift/orchard finalize).
// Also absorbs payout-whisperer-earnings — sower and whisperer balances now
// pay out together, one PayPal batch per run.
//
// SOURCE OF TRUTH: public.owed_payout_balances() (see the migration this
// shipped with) — unions product_bestowals/content_purchases/bestowals
// (sower_amount, completed + payout_status='pending', same source tables
// and sower-id resolution as sower_earnings_v) with whisperer_earnings
// (amount, status='payable'), grouped by the recipient's real auth user id.
//
// RULES:
//   - Two rails, chosen per recipient from their own profiles.payout_network
//     (spec-payments.md section 4: "recipient rail comes from their own
//     stored payout config", never a second place to configure it):
//       * payout_network = 'solana_usdc' → Solana USDC, sent directly from
//         the hot wallet (see _shared/solanaPayout.ts). NO minimum — a
//         Solana transfer costs a fraction of a cent, so nothing is held
//         back. Hard per-transaction/daily caps still apply (below) as the
//         circuit breaker for a bug or a compromised key. A 48h cooling-off
//         also applies after any payout_details change (see
//         PAYOUT_ADDRESS_COOLING_OFF_HOURS below) — the classic account-
//         takeover payday is changing the payout address, so a freshly
//         changed one doesn't get paid until the owner has had time to see
//         update-crypto-payout's notification and react if it wasn't them.
//       * everyone else → PayPal Payouts, unchanged: $20 minimum per
//         recipient (PayPal charges a real per-item fee), requires an
//         ACTIVE, VERIFIED PayPal email in user_wallets
//         (wallet_type='paypal_email', verified_at IS NOT NULL). No email,
//         or an unverified one, skips with a reason — never blocks the sale.
//   - A recipient with no payout method configured at all keeps accruing;
//     nothing here ever blocks or fails a sale over the recipient's own
//     incomplete setup.
//   - PAYPAL_PAYOUTS_ENABLED must be 'true' for the PayPal leg, same flag
//     paypal-payout used. The Solana leg has no equivalent flag — it's
//     gated by SOLANA_HOT_WALLET_SECRET_KEY / SOLANA_HOT_WALLET_ADDRESS
//     existing at all (see _shared/solanaPayout.ts), and defaults to
//     devnet unless SOLANA_CLUSTER=mainnet-beta is set.
//   - One PayPal Payouts batch call per run, covering every eligible PayPal
//     recipient (sowers and whisperers together) as separate items. One
//     `payouts` row per recipient, sender_item_id = that row's id, so the
//     webhook can find it directly. paypal_item_id is filled in once
//     PayPal's PAYMENT.PAYOUTS-ITEM.* webhook arrives — batch creation
//     alone doesn't return real per-item ids, only the batch id.
//   - Solana sends are synchronous and per-recipient (not batched): send
//     FIRST, wait for FINALIZED commitment, THEN mark the payouts row and
//     its covered source rows paid. If the send succeeds but that DB
//     update fails, this logs loudly as a needs-a-human case and leaves
//     the row at 'processing' rather than risking a double-send on retry
//     (same idempotency shape as the PayPal leg: owed_payout_balances()
//     only ever returns rows still payout_status='pending', so a row
//     marked 'processing' can't be picked up again by a later run).
//
// dry_run:true computes and returns the exact same eligible/skipped
// breakdown (for the admin "next run preview") without touching anything —
// no payouts rows, no covered-row status changes, no PayPal call, no
// notifications.
//
// NOTIFICATIONS: on a real (non-dry) run, every owed recipient gets exactly
// one chat message via deliverPayoutNotification (messaging.ts) — "paid"
// once the batch is actually created, "below_minimum"/"not_connected" for
// everyone skipped. Payout notifications go to chat now, not email — see
// the retired paypal-email-verify for why.
//
// Auth: CRON_SECRET (Authorization: Bearer, or legacy x-cron-secret),
// service-role bearer, or an admin/gosat user session.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { paypalFetch } from "../_shared/paypal/client.ts";
import {
  markCoveredRowsPaid,
  markCoveredRowsPending,
  markCoveredRowsProcessing,
  type CoveredRow,
} from "../_shared/payoutLedger.ts";
import { deliverPayoutNotification } from "../_shared/postFinalize/messaging.ts";
import { validateSolanaAddress } from "../_shared/cryptoAddress.ts";
import { getSolanaCluster } from "../_shared/cryptoNetworks.ts";
// No @solana/web3.js here (or anywhere in the Solana rail now) -- see
// _shared/solanaPayout.ts's file header for why (measured ~3s CPU import
// cost vs. the edge runtime's hard, non-configurable 2s ceiling) and what
// replaced it (micro-sol-signer, measured at 80ms). loadHotWalletKeypair/
// verifyHotWallet/checkHotWalletConfig are synchronous now -- no dynamic
// import to await, the replacement is cheap enough to import statically.
import {
  checkHotWalletConfig,
  getHotWalletUsdcBalance,
  loadHotWalletKeypair,
  sendUsdcPayout,
  verifyHotWallet,
} from "../_shared/solanaPayout.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";

const MIN_PAYOUT_USD = 20; // PayPal only — Solana has no minimum.

// Hard circuit-breaker caps for the Solana leg, per spec-payments.md
// section 2. Anything over either cap does NOT send; it's flagged for
// manual Squad approval instead (see solanaOutcomes below). Real balances
// today are $2-$4 per person, ~$12 total owed — these defaults sit roughly
// 10x above current real per-person amounts and give meaningful headroom
// for organic growth while still catching a bug or a compromised key long
// before it could drain anything close to the hot wallet's actual float.
// Overridable via env without a redeploy, in case the operator wants to
// tune them as volume grows; the hardcoded fallback is the real limit if
// the env var is unset or unparseable.
const SOLANA_MAX_PER_TX_USD = Number(Deno.env.get("SOLANA_MAX_PER_TX_USD")) || 50;
const SOLANA_MAX_DAILY_USD = Number(Deno.env.get("SOLANA_MAX_DAILY_USD")) || 200;

// Wallet-hardening audit item 2: a freshly-changed payout address (the
// classic account-takeover payday) doesn't become eligible for a payout
// for this many hours after the change -- see update-crypto-payout, which
// sets payout_details_updated_at on every change and now also requires a
// fresh password re-check and emails the owner. 48h gives a real owner
// time to see and react to that email if the change wasn't theirs; it
// barely delays a legitimate change given payouts already run about
// weekly. Applies to every eligible Solana recipient regardless of
// whether this is their first payout on the address or their hundredth --
// the risk is "was this address just changed," not "is it new."
const PAYOUT_ADDRESS_COOLING_OFF_HOURS = Number(Deno.env.get("PAYOUT_ADDRESS_COOLING_OFF_HOURS")) || 48;

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface OwedRow {
  recipient_type: "sower" | "whisperer";
  recipient_user_id: string;
  amount_usd: number;
  covered_rows: CoveredRow[];
}

interface RecipientOutcome {
  recipient_type: "sower" | "whisperer";
  recipient_user_id: string;
  amount_usd: number;
  rail: "paypal" | "solana_usdc";
  eligible: boolean;
  reason?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  try {
    const cronHeader = req.headers.get("x-cron-secret") ?? "";
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";

    let authorized = false;
    if (CRON_SECRET && token && token === CRON_SECRET) authorized = true;
    if (!authorized && CRON_SECRET && cronHeader && cronHeader === CRON_SECRET) authorized = true;
    if (!authorized && token && token === SERVICE_ROLE_KEY) authorized = true;
    if (!authorized && token) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: u } = await userClient.auth.getUser();
      if (u?.user) {
        const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
        authorized = !!roles?.some((r: any) => ["admin", "gosat"].includes(r.role));
      }
    }
    if (!authorized) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;

    // --- Load owed balances, every recipient, regardless of threshold -----
    const { data: owedRaw, error: owedErr } = await admin.rpc("owed_payout_balances");
    if (owedErr) return json({ error: "owed_lookup_failed", detail: owedErr.message }, 500);
    const owed = (owedRaw ?? []) as OwedRow[];

    const totalFloatUsd = round2(owed.reduce((s, r) => s + Number(r.amount_usd || 0), 0));

    // --- Split by rail, from each recipient's own stored payout config ----
    // spec-payments.md section 4: reuse the existing profiles fields rather
    // than a second place a person can configure where their money goes.
    const allUserIds = [...new Set(owed.map((r) => r.recipient_user_id))];
    const { data: profileRows } = allUserIds.length > 0
      ? await admin
        .from("profiles")
        .select("user_id, payout_network, payout_address, payout_details_updated_at")
        .in("user_id", allUserIds)
      : { data: [] as any[] };
    const railByUser = new Map<string, { network: string | null; address: string | null; updatedAt: string | null }>();
    for (const p of (profileRows ?? []) as any[]) {
      railByUser.set(p.user_id, {
        network: p.payout_network ?? null,
        address: p.payout_address ?? null,
        updatedAt: p.payout_details_updated_at ?? null,
      });
    }

    const solanaOwed = owed.filter((r) => railByUser.get(r.recipient_user_id)?.network === "solana_usdc");
    const paypalOwed = owed.filter((r) => railByUser.get(r.recipient_user_id)?.network !== "solana_usdc");

    // --- Resolve verified PayPal emails, one query per PayPal recipient ---
    const userIds = [...new Set(paypalOwed.map((r) => r.recipient_user_id))];
    const { data: wallets } = userIds.length > 0
      ? await admin
        .from("user_wallets")
        .select("user_id, wallet_address, is_primary, updated_at")
        .in("user_id", userIds)
        .eq("wallet_type", "paypal_email")
        .eq("is_active", true)
        .not("verified_at", "is", null)
      : { data: [] as any[] };

    const emailByUser = new Map<string, string>();
    const bestByUser = new Map<string, { primary: number; updated: number }>();
    for (const w of (wallets ?? []) as any[]) {
      const score = { primary: w.is_primary ? 1 : 0, updated: w.updated_at ? new Date(w.updated_at).getTime() : 0 };
      const cur = bestByUser.get(w.user_id);
      if (!cur || score.primary > cur.primary || (score.primary === cur.primary && score.updated > cur.updated)) {
        bestByUser.set(w.user_id, score);
        emailByUser.set(w.user_id, w.wallet_address);
      }
    }

    // --- PayPal eligibility: $20 minimum, verified PayPal email required --
    const paypalOutcomes: RecipientOutcome[] = paypalOwed.map((r) => {
      const amount = round2(Number(r.amount_usd || 0));
      const base = {
        recipient_type: r.recipient_type,
        recipient_user_id: r.recipient_user_id,
        amount_usd: amount,
        rail: "paypal" as const,
      };
      if (amount < MIN_PAYOUT_USD) return { ...base, eligible: false, reason: "below_minimum" };
      if (!emailByUser.has(r.recipient_user_id)) return { ...base, eligible: false, reason: "no_verified_paypal_email" };
      return { ...base, eligible: true };
    });

    // --- Solana eligibility: no minimum, but hard per-tx/daily caps -------
    // Daily headroom is computed against everything already marked paid on
    // this rail today (across any earlier run today, not just this one),
    // then reserved provisionally as each recipient in this run is approved
    // so two recipients in the same run can't together blow the daily cap.
    const solanaOutcomes: RecipientOutcome[] = [];
    if (solanaOwed.length > 0) {
      const todayStartIso = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString();
      const { data: sentTodayRows } = await admin
        .from("payouts")
        .select("amount")
        .eq("rail", "solana_usdc")
        .eq("status", "paid")
        .gte("created_at", todayStartIso);
      let dailySpent = round2((sentTodayRows ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0));

      for (const r of solanaOwed) {
        const amount = round2(Number(r.amount_usd || 0));
        const base = {
          recipient_type: r.recipient_type,
          recipient_user_id: r.recipient_user_id,
          amount_usd: amount,
          rail: "solana_usdc" as const,
        };
        const rail = railByUser.get(r.recipient_user_id);
        if (!rail?.address) {
          solanaOutcomes.push({ ...base, eligible: false, reason: "no_solana_address" });
          continue;
        }
        const addrErr = validateSolanaAddress(rail.address);
        if (addrErr) {
          solanaOutcomes.push({ ...base, eligible: false, reason: "invalid_solana_address" });
          continue;
        }
        if (rail.updatedAt) {
          const hoursSinceChange = (Date.now() - new Date(rail.updatedAt).getTime()) / (1000 * 60 * 60);
          if (hoursSinceChange < PAYOUT_ADDRESS_COOLING_OFF_HOURS) {
            solanaOutcomes.push({ ...base, eligible: false, reason: "payout_address_cooling_off" });
            continue;
          }
        }
        if (amount > SOLANA_MAX_PER_TX_USD) {
          solanaOutcomes.push({ ...base, eligible: false, reason: "exceeds_per_tx_cap_needs_squad_approval" });
          continue;
        }
        if (dailySpent + amount > SOLANA_MAX_DAILY_USD) {
          solanaOutcomes.push({ ...base, eligible: false, reason: "exceeds_daily_cap_needs_squad_approval" });
          continue;
        }
        dailySpent = round2(dailySpent + amount);
        solanaOutcomes.push({ ...base, eligible: true });
      }
    }

    const outcomes: RecipientOutcome[] = [...paypalOutcomes, ...solanaOutcomes];

    if (dryRun) {
      // Config check only, never a send: decode the hot wallet secret,
      // derive its public key, compare against the configured address --
      // report match/mismatch instead of throwing, so a dry run can surface
      // a bad config instead of just looking clean and failing for real
      // later. Still gated on solanaOwed -- not for import cost anymore
      // (checkHotWalletConfig is synchronous, the import is static and
      // cheap), just because there's no reason to decode a private key on
      // a run with no Solana recipient to check it against.
      let hotWalletCheck: ReturnType<typeof checkHotWalletConfig> | { configured: false; error: string } | null = null;
      if (solanaOwed.length > 0) {
        try {
          hotWalletCheck = checkHotWalletConfig();
        } catch (e) {
          hotWalletCheck = { configured: false, error: e instanceof Error ? e.message : String(e) };
        }
      }
      return json({
        dry_run: true,
        totalFloatUsd,
        solana: { cluster: getSolanaCluster(), hot_wallet_check: hotWalletCheck },
        recipients: outcomes,
      });
    }

    // Every non-eligible PayPal recipient gets exactly one chat notification
    // this run — "paid" fires separately, once the batch actually goes out,
    // for the eligible subset only. Solana notification copy isn't wired up
    // here — messaging.ts's PayoutNotification union is PayPal-shaped
    // ("paid" requires an email); out of scope for this pass, flagged as a
    // follow-up rather than bent to fit.
    for (const o of paypalOutcomes) {
      if (o.eligible) continue;
      await deliverPayoutNotification(admin, o.recipient_user_id, {
        kind: o.reason === "below_minimum" ? "below_minimum" : "not_connected",
        amount: o.amount_usd,
      });
    }

    const eligiblePaypal = paypalOwed.filter((r) => {
      const amount = round2(Number(r.amount_usd || 0));
      return amount >= MIN_PAYOUT_USD && emailByUser.has(r.recipient_user_id);
    });
    const eligibleSolana = solanaOwed.filter(
      (r) => solanaOutcomes.find((o) => o.recipient_user_id === r.recipient_user_id)?.eligible,
    );

    // --- Solana leg: send FIRST, then mark paid ----------------------------
    // Runs before PayPal and is fully independent of it — a Solana problem
    // (bad config, insufficient balance, a failed send) never blocks or
    // delays the PayPal batch below, and vice versa.
    let solanaPaidCount = 0;
    if (eligibleSolana.length > 0) {
      // Setup is isolated from the send loop below on purpose: if setup
      // fails, nothing has been attempted yet, so it's safe to mark every
      // Solana outcome not-configured. Once sends start, a later failure
      // must never retroactively mislabel an earlier recipient who was
      // already successfully paid — see the per-recipient try/catch below.
      let setup: {
        sender: ReturnType<typeof loadHotWalletKeypair>;
        hotWalletAddress: string;
        cluster: ReturnType<typeof getSolanaCluster>;
      } | null = null;
      try {
        const sender = loadHotWalletKeypair();
        const { address: hotWalletAddress } = verifyHotWallet(sender);
        const cluster = getSolanaCluster();
        setup = { sender, hotWalletAddress, cluster };
        console.log(
          `payout-earnings: Solana leg starting — cluster=${cluster} hotWallet=${hotWalletAddress} ` +
            `recipients=${eligibleSolana.length}`,
        );
      } catch (setupErr) {
        // Hot wallet secret/address missing or inconsistent — refuse the
        // whole Solana leg for this run rather than guessing. PayPal below
        // is entirely unaffected.
        const reason = setupErr instanceof Error ? setupErr.message : String(setupErr);
        console.error("payout-earnings: Solana leg not attempted —", reason);
        for (const o of solanaOutcomes) {
          if (o.eligible) {
            o.eligible = false;
            o.reason = "solana_not_configured";
          }
        }
      }

      if (setup) {
        const { sender, hotWalletAddress, cluster } = setup;
        try {
          // Preflight: never half-complete a run because the wallet ran dry
          // partway through — check the total needed against the actual
          // balance before sending anything.
          const totalNeeded = round2(eligibleSolana.reduce((s, r) => s + round2(Number(r.amount_usd || 0)), 0));
          const balance = await getHotWalletUsdcBalance(sender, cluster);
          if (balance < totalNeeded) {
            console.error(
              `payout-earnings: SOLANA BALANCE INSUFFICIENT — hot wallet (${hotWalletAddress}, ${cluster}) has ` +
                `${balance} USDC, this run needs ${totalNeeded} USDC across ${eligibleSolana.length} recipient(s). ` +
                `Skipping the entire Solana leg rather than half-completing it. Top up the hot wallet and re-run.`,
            );
            for (const o of solanaOutcomes) {
              if (o.eligible) {
                o.eligible = false;
                o.reason = "insufficient_hot_wallet_balance";
              }
            }
          } else {
            for (const r of eligibleSolana) {
              const rail = railByUser.get(r.recipient_user_id)!;
              const amount = round2(Number(r.amount_usd || 0));

              const { data: prow, error: insErr } = await admin
                .from("payouts")
                .insert({
                  run_id: crypto.randomUUID(),
                  recipient_type: r.recipient_type,
                  recipient_user_id: r.recipient_user_id,
                  amount,
                  currency: "USD",
                  rail: "solana_usdc",
                  solana_cluster: cluster,
                  status: "processing",
                  covered_rows: r.covered_rows,
                })
                .select("id")
                .single();
              if (insErr || !prow) {
                console.error("payout-earnings: solana payouts insert failed", r.recipient_user_id, insErr?.message);
                continue;
              }
              // Lock the covered rows immediately so an overlapping run
              // can't double-pick them, same pattern as the PayPal leg.
              await markCoveredRowsProcessing(admin, r.covered_rows as CoveredRow[]);

              try {
                const { signature } = await sendUsdcPayout(sender, rail.address!, amount);
                // The transfer is now irreversible and finalized on-chain.
                // Everything from here is bookkeeping — if it fails, the
                // fix is a human reconciling the row, never an automatic
                // retry (that could double-send).
                try {
                  const { error: updErr } = await admin
                    .from("payouts")
                    .update({
                      status: "paid",
                      solana_tx_signature: signature,
                      completed_at: new Date().toISOString(),
                    })
                    .eq("id", prow.id);
                  if (updErr) throw updErr;
                  await markCoveredRowsPaid(admin, r.covered_rows as CoveredRow[]);
                  solanaPaidCount++;
                } catch (dbErr) {
                  console.error(
                    `payout-earnings: NEEDS A HUMAN — Solana send SUCCEEDED (signature=${signature}, ` +
                      `payouts.id=${prow.id}, recipient=${r.recipient_user_id}, amount=${amount} USDC, ` +
                      `cluster=${cluster}) but the DB update failed: ` +
                      `${dbErr instanceof Error ? dbErr.message : String(dbErr)}. The payouts row is left at ` +
                      `'processing' on purpose — do not retry this recipient automatically, reconcile by hand.`,
                  );
                }
              } catch (sendErr) {
                const reason = sendErr instanceof Error ? sendErr.message : String(sendErr);
                console.error("payout-earnings: solana send failed", r.recipient_user_id, reason);
                await admin.from("payouts").update({ status: "failed", error: reason }).eq("id", prow.id);
                await markCoveredRowsPending(admin, r.covered_rows as CoveredRow[], reason);
              }
            }
          }
        } catch (runErr) {
          // Something outside any per-recipient try/catch broke mid-leg
          // (e.g. the balance-check RPC call itself failed). This only
          // affects this response's summary — every payouts row and
          // covered-row update already made above is untouched and stays
          // authoritative (solanaPaidCount only counts real confirmed
          // sends), so at worst this mislabels an already-paid recipient
          // as "aborted" in the outcomes list for this one response; the
          // payouts table is the source of truth, not this summary.
          const reason = runErr instanceof Error ? runErr.message : String(runErr);
          console.error("payout-earnings: Solana leg aborted mid-run —", reason);
          for (const o of solanaOutcomes) {
            if (o.eligible) {
              o.eligible = false;
              o.reason = "solana_leg_aborted";
            }
          }
        }
      }
    }

    if (eligiblePaypal.length === 0) {
      return json({
        success: true,
        totalFloatUsd,
        paid: solanaPaidCount,
        skipped: outcomes.filter((o) => !o.eligible).length,
        outcomes,
      });
    }

    const payoutsEnabled = (Deno.env.get("PAYPAL_PAYOUTS_ENABLED") ?? "").toLowerCase() === "true";
    if (!payoutsEnabled) {
      return json({
        success: true,
        totalFloatUsd,
        paid: solanaPaidCount,
        skipped: outcomes.filter((o) => !o.eligible).length,
        reason: "paypal_payouts_not_enabled",
        outcomes,
      });
    }

    // --- PayPal dispatch: one payouts row per recipient, one batch total --
    const runId = crypto.randomUUID();
    const inserts = eligiblePaypal.map((r) => ({
      run_id: runId,
      recipient_type: r.recipient_type,
      recipient_user_id: r.recipient_user_id,
      amount: round2(Number(r.amount_usd)),
      currency: "USD",
      status: "processing",
      covered_rows: r.covered_rows,
    }));

    const { data: inserted, error: insErr } = await admin
      .from("payouts")
      .insert(inserts)
      .select("id, recipient_type, recipient_user_id, amount, covered_rows");
    if (insErr || !inserted) {
      return json({ error: "payouts_insert_failed", detail: insErr?.message }, 500);
    }

    // Mark covered source rows in-flight so an overlapping run can't double-pick them.
    for (const row of inserted) {
      await markCoveredRowsProcessing(admin, row.covered_rows as CoveredRow[]);
    }

    const items = inserted.map((row: any) => ({
      recipient_type: "EMAIL",
      receiver: emailByUser.get(row.recipient_user_id)!,
      sender_item_id: row.id,
      note: "Sow2Grow weekly payout",
      amount: { value: Number(row.amount).toFixed(2), currency: "USD" },
    }));

    try {
      const { ok, status, data } = await paypalFetch<{ batch_header?: { payout_batch_id?: string } }>(
        "/v1/payments/payouts",
        {
          method: "POST",
          body: {
            sender_batch_header: {
              sender_batch_id: `s2g-weekly-${runId}`,
              email_subject: "You have a Sow2Grow payout",
              email_message: "Your weekly Sow2Grow payout has been sent. Thank you for sowing.",
            },
            items,
          },
        },
      );

      if (!ok) {
        console.error("payout-earnings: paypal batch create failed", status, data);
        await admin.from("payouts").update({ status: "failed", error: `paypal_http_${status}` }).eq("run_id", runId);
        for (const row of inserted) {
          await markCoveredRowsPending(admin, row.covered_rows as CoveredRow[], `paypal_http_${status}`);
        }
        return json({ error: "paypal_batch_failed", detail: data }, 502);
      }

      const batchId = data?.batch_header?.payout_batch_id ?? null;
      await admin.from("payouts").update({ paypal_batch_id: batchId }).eq("run_id", runId);

      for (const row of inserted) {
        await deliverPayoutNotification(admin, row.recipient_user_id, {
          kind: "paid",
          amount: Number(row.amount),
          email: emailByUser.get(row.recipient_user_id)!,
        });
      }

      return json({
        success: true,
        runId,
        batchId,
        totalFloatUsd,
        paid: inserted.length + solanaPaidCount,
        skipped: outcomes.filter((o) => !o.eligible).length,
        outcomes,
      });
    } catch (err) {
      console.error("payout-earnings: paypal batch exception", err);
      const reason = err instanceof Error ? err.message : String(err);
      await admin.from("payouts").update({ status: "failed", error: reason }).eq("run_id", runId);
      for (const row of inserted) {
        await markCoveredRowsPending(admin, row.covered_rows as CoveredRow[], reason);
      }
      return json({ error: "paypal_batch_exception", detail: reason }, 500);
    }
  } catch (err) {
    console.error("payout-earnings error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
