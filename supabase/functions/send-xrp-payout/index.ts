// Sends XRP on the XRP Ledger to a member's stored payout address.
//
// SERVER-SIDE ONLY. The sending wallet seed is read from the XRP_SENDER_SEED
// secret (Project Settings -> Secrets) and never leaves this function.
// See supabase/functions/_shared/cryptoNetworks.ts for all config/secret notes.
//
// Defaults to the XRP Ledger TESTNET. Set XRP_NETWORK=mainnet only after a
// successful testnet dry run.
//
// DestinationTag is included ONLY when the recipient's wallet_type is
// 'custodial' (an exchange account) and a tag is stored. It is omitted
// entirely for personal / self-custody wallets.
//
// Caller must be an admin/gosat user, or the service role.
// Body: { recipient_user_id?: string, destination_address?: string,
//         destination_tag?: number|null, wallet_type?: 'personal'|'custodial',
//         amount: number (XRP), reference?: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Client, Wallet, xrpToDrops } from "https://esm.sh/xrpl@4.0.0";
import { validateDestinationTag, validateXrpAddress } from "../_shared/cryptoAddress.ts";
import { getXrpNetwork, getXrpRpcUrl } from "../_shared/cryptoNetworks.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  let transferId: string | null = null;
  let client: InstanceType<typeof Client> | null = null;

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) return json({ error: "unauthorized" }, 401);
    const token = authHeader.slice(7).trim();

    let callerId: string | null = null;
    if (token !== SERVICE_ROLE_KEY) {
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: u } = await userClient.auth.getUser();
      if (!u?.user) return json({ error: "unauthorized" }, 401);
      callerId = u.user.id;
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", callerId);
      if (!roles?.some((r: any) => ["admin", "gosat"].includes(r.role))) {
        return json({ error: "forbidden" }, 403);
      }
    }

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "invalid JSON body" }, 400);

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return json({ error: "amount must be > 0" }, 400);

    let destination: string | null = typeof body.destination_address === "string"
      ? body.destination_address.trim()
      : null;
    let tag: number | null = body.destination_tag === null || body.destination_tag === undefined
      ? null
      : Number(body.destination_tag);
    let walletType: string | null = body.wallet_type ?? null;
    const recipientUserId: string | null = body.recipient_user_id ?? null;

    if (!destination && recipientUserId) {
      const { data: profile } = await admin
        .from("profiles")
        .select("payout_network, payout_address, payout_tag, payout_wallet_type")
        .eq("user_id", recipientUserId)
        .maybeSingle();
      if (!profile?.payout_address || profile.payout_network !== "xrp") {
        return json({ error: "Recipient has no XRP payout address configured." }, 400);
      }
      destination = profile.payout_address;
      tag = profile.payout_tag === null || profile.payout_tag === undefined
        ? null
        : Number(profile.payout_tag);
      walletType = profile.payout_wallet_type;
    }
    if (!destination) return json({ error: "destination_address or recipient_user_id required" }, 400);

    const addrErr = validateXrpAddress(destination);
    if (addrErr) return json({ error: addrErr }, 400);

    // Tag policy: required for custodial, forbidden for personal.
    if (walletType === "custodial") {
      const tagErr = validateDestinationTag(tag);
      if (tagErr) return json({ error: `Exchange (custodial) destination: ${tagErr}` }, 400);
    } else {
      tag = null;
    }

    const seed = Deno.env.get("XRP_SENDER_SEED");
    // TODO(operator): add XRP_SENDER_SEED in Project Settings -> Secrets.
    if (!seed) throw new Error("XRP_SENDER_SEED secret is not configured yet.");

    const network = getXrpNetwork();

    const { data: row, error: rowErr } = await admin
      .from("crypto_payout_transfers")
      .insert({
        recipient_user_id: recipientUserId,
        network: "xrp",
        cluster: network,
        destination_address: destination,
        destination_tag: tag,
        amount,
        status: "pending",
        reference: body.reference ?? null,
        created_by: callerId,
      })
      .select("id")
      .single();
    if (rowErr) return json({ error: rowErr.message }, 400);
    transferId = row.id;

    const wallet = Wallet.fromSeed(seed.trim());
    client = new Client(getXrpRpcUrl());
    await client.connect();

    const payment: Record<string, unknown> = {
      TransactionType: "Payment",
      Account: wallet.address,
      Destination: destination,
      Amount: xrpToDrops(amount.toString()),
    };
    if (tag !== null) payment.DestinationTag = tag;

    const prepared = await client.autofill(payment as any);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    await client.disconnect();
    client = null;

    const engineResult = (result.result.meta as any)?.TransactionResult;
    if (engineResult !== "tesSUCCESS") {
      throw new Error(`XRP Ledger rejected the payment: ${engineResult ?? "unknown result"}`);
    }

    await admin
      .from("crypto_payout_transfers")
      .update({ status: "sent", tx_hash: result.result.hash, updated_at: new Date().toISOString() })
      .eq("id", transferId);

    return json({ success: true, network, hash: result.result.hash, transfer_id: transferId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    console.error("send-xrp-payout error", message);
    try { await client?.disconnect(); } catch { /* ignore */ }
    if (transferId) {
      await admin
        .from("crypto_payout_transfers")
        .update({ status: "failed", error_message: message.slice(0, 500), updated_at: new Date().toISOString() })
        .eq("id", transferId);
    }
    return json({ error: message }, 500);
  }
});
