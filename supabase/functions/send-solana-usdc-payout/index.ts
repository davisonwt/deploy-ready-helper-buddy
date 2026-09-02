// Sends USDC (SPL token) on Solana to a member's stored payout address.
//
// SERVER-SIDE ONLY. The sender keypair is read from the SOLANA_SENDER_PRIVATE_KEY
// secret (Project Settings -> Secrets) and never leaves this function.
// See supabase/functions/_shared/cryptoNetworks.ts for all config/secret notes.
//
// Defaults to Solana DEVNET. Set SOLANA_CLUSTER=mainnet-beta only after a
// successful devnet dry run.
//
// Caller must be an admin/gosat user, or the service role (server-to-server).
// Body: { recipient_user_id?: string, destination_address?: string,
//         amount: number, reference?: string }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "https://esm.sh/@solana/web3.js@1.95.3";
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  getMint,
  getOrCreateAssociatedTokenAccount,
} from "https://esm.sh/@solana/spl-token@0.4.8";
import bs58 from "https://esm.sh/bs58@5.0.0";
import { validateSolanaAddress } from "../_shared/cryptoAddress.ts";
import { USDC_MINTS, getSolanaCluster, getSolanaRpcUrl } from "../_shared/cryptoNetworks.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] ?? "";
const SERVICE_ROLE_KEY = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] ?? "";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function loadSenderKeypair(): Keypair {
  const raw = Deno.env.get("SOLANA_SENDER_PRIVATE_KEY");
  // TODO(operator): add SOLANA_SENDER_PRIVATE_KEY in Project Settings -> Secrets.
  if (!raw) throw new Error("SOLANA_SENDER_PRIVATE_KEY secret is not configured yet.");
  const trimmed = raw.trim();
  const bytes = trimmed.startsWith("[")
    ? Uint8Array.from(JSON.parse(trimmed))
    : bs58.decode(trimmed);
  return Keypair.fromSecretKey(bytes);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  let transferId: string | null = null;

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
    const recipientUserId: string | null = body.recipient_user_id ?? null;

    if (!destination && recipientUserId) {
      const { data: profile } = await admin
        .from("profiles")
        .select("payout_network, payout_address")
        .eq("user_id", recipientUserId)
        .maybeSingle();
      if (!profile?.payout_address || profile.payout_network !== "solana_usdc") {
        return json({ error: "Recipient has no Solana USDC payout address configured." }, 400);
      }
      destination = profile.payout_address;
    }
    if (!destination) return json({ error: "destination_address or recipient_user_id required" }, 400);

    const addrErr = validateSolanaAddress(destination);
    if (addrErr) return json({ error: addrErr }, 400);

    const cluster = getSolanaCluster();

    // Idempotency + audit row.
    const { data: row, error: rowErr } = await admin
      .from("crypto_payout_transfers")
      .insert({
        recipient_user_id: recipientUserId,
        network: "solana_usdc",
        cluster,
        destination_address: destination,
        amount,
        status: "pending",
        reference: body.reference ?? null,
        created_by: callerId,
      })
      .select("id")
      .single();
    if (rowErr) return json({ error: rowErr.message }, 400);
    transferId = row.id;

    const sender = loadSenderKeypair();
    const connection = new Connection(getSolanaRpcUrl(), "confirmed");
    const mint = new PublicKey(USDC_MINTS[cluster]);
    const destPubkey = new PublicKey(destination);

    const mintInfo = await getMint(connection, mint);
    const rawAmount = BigInt(Math.round(amount * 10 ** mintInfo.decimals));

    const fromAta = await getAssociatedTokenAddress(mint, sender.publicKey);
    // Creates the recipient's USDC token account if it does not exist yet
    // (fee paid by the sender, standard for SPL transfers).
    const toAta = await getOrCreateAssociatedTokenAccount(connection, sender, mint, destPubkey);

    const tx = new Transaction().add(
      createTransferCheckedInstruction(
        fromAta,
        mint,
        toAta.address,
        sender.publicKey,
        rawAmount,
        mintInfo.decimals,
      ),
    );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = sender.publicKey;
    tx.sign(sender);

    const signature = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

    await admin
      .from("crypto_payout_transfers")
      .update({ status: "sent", tx_hash: signature, updated_at: new Date().toISOString() })
      .eq("id", transferId);

    return json({ success: true, cluster, signature, transfer_id: transferId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    console.error("send-solana-usdc-payout error", message);
    if (transferId) {
      await admin
        .from("crypto_payout_transfers")
        .update({ status: "failed", error_message: message.slice(0, 500), updated_at: new Date().toISOString() })
        .eq("id", transferId);
    }
    return json({ error: message }, 500);
  }
});
