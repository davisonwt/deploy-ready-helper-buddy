import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { CryptomusClient } from "../_shared/cryptomus.ts";
import { executeDistribution } from "../_shared/distribution.ts";

// Inline CORS headers (secure)
const getSecureCorsHeaders = (req: Request): Record<string, string> => {
  const origin = req.headers.get("origin");
  const allowedOrigins = [
    "https://sow2growapp.com",
    "https://www.sow2growapp.com",
    "https://app.sow2grow.com",
  ];

  if (!origin) {
    return {
      "Content-Type": "application/json",
    };
  }

  if (allowedOrigins.includes(origin)) {
    return {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, merchant, sign",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Credentials": "true",
    };
  }

  return {
    "Content-Type": "application/json",
  };
};

const successResponse = {
  state: 0,
  result: "SUCCESS",
};

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getSecureCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase configuration for webhook handler.");
    return jsonResponse({ state: 1, result: "Server misconfigured" }, 500, req);
  }

  const rawBody = await req.text();
  
  // Get Cryptomus credentials from environment
  const merchantId = Deno.env.get("CRYPTOMUS_MERCHANT_ID");
  const paymentApiKey = Deno.env.get("CRYPTOMUS_PAYMENT_API_KEY");
  
  if (!merchantId || !paymentApiKey) {
    console.error("CRYPTOMUS_MERCHANT_ID or CRYPTOMUS_PAYMENT_API_KEY not configured");
    return jsonResponse({ state: 1, result: "Server misconfigured" }, 500, req);
  }

  const cryptomusClient = new CryptomusClient({
    merchantId,
    paymentApiKey,
    apiBaseUrl: Deno.env.get("CRYPTOMUS_API_BASE_URL") ?? "https://api.cryptomus.com/v1",
  });

  const isValidSignature = await cryptomusClient.verifyWebhookSignature(
    rawBody,
    req.headers,
  );

  if (!isValidSignature) {
    console.error("Invalid Cryptomus webhook signature");
    return jsonResponse({ state: 1, result: "Invalid signature" }, 400, req);
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    console.error("Failed to parse webhook payload:", error);
    return jsonResponse({ state: 1, result: "Invalid payload" }, 400, req);
  }

  const orderId = payload?.orderId;
  const paymentStatus = payload?.paymentStatus ?? payload?.status;
  const paymentState = payload?.state ?? (paymentStatus === "paid" ? 1 : 0);

  // Replay attack protection - check if webhook was already processed
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Create hash of payload for verification
  const payloadHash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(rawBody)
  ).then(hash => Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(''));

  const { data: alreadyProcessed } = await supabase.rpc('check_webhook_processed', {
    webhook_id_param: orderId || payload?.uuid,
    provider_param: 'cryptomus'
  }).catch(() => ({ data: null }));

  if (alreadyProcessed) {
    console.log("Webhook already processed, returning success (idempotent)", { orderId });
    return jsonResponse(successResponse, 200, req);
  }

  if (!orderId) {
    console.error("Webhook payload missing orderId");
    return jsonResponse({ state: 1, result: "Missing order reference" }, 400, req);
  }

  try {
    const { data: bestowal, error: bestowalError } = await supabase
      .from("bestowals")
      .select(`
        id,
        payment_status,
        payment_reference,
        distribution_data,
        currency,
        amount,
        pockets_count,
        orchard_id,
        bestower_id,
        created_at,
        orchards (
          title,
          orchard_type
        )
      `)
      .eq("id", orderId)
      .single();

    if (bestowalError || !bestowal) {
      console.error(
        "Bestowal not found for webhook:",
        orderId,
        bestowalError,
      );
      return jsonResponse({ state: 1, result: "Bestowal not found" }, 404, req);
    }

    // Payment state: 0 = pending, 1 = paid, 2 = expired, 3 = failed
    if (paymentState === 1 || paymentStatus === "paid" || paymentStatus === "confirm_check") {
      // Mark webhook as processed BEFORE processing to prevent race conditions
      await supabase.rpc('mark_webhook_processed', {
        webhook_id_param: orderId || payload?.uuid,
        provider_param: 'cryptomus',
        payload_hash_param: payloadHash
      }).catch(err => console.warn("Failed to mark webhook as processed:", err));

      // Verify amount matches (prevent tampering)
      const webhookAmount = parseFloat(payload?.amount ?? payload?.paymentAmount ?? bestowal.amount);
      if (Math.abs(bestowal.amount - webhookAmount) > 0.01) {
        console.error('Amount mismatch detected!', {
          stored: bestowal.amount,
          webhook: webhookAmount,
          bestowalId: bestowal.id
        });
        await supabase.rpc('log_payment_audit', {
          user_id_param: bestowal.bestower_id,
          action_param: 'amount_verification_failed',
          payment_method_param: 'cryptomus',
          amount_param: webhookAmount,
          currency_param: bestowal.currency,
          bestowal_id_param: bestowal.id,
          transaction_id_param: payload?.uuid || orderId,
          metadata_param: { storedAmount: bestowal.amount, webhookAmount }
        }).catch(err => console.warn("Failed to log audit:", err));
        return jsonResponse({ state: 1, result: "Amount verification failed" }, 400, req);
      }

      await supabase
        .from("bestowals")
        .update({
          payment_status: "completed",
          payment_reference: payload?.uuid ?? payload?.txId ?? bestowal.payment_reference,
        })
        .eq("id", bestowal.id);

      // Update payment transaction
      try {
        await supabase
          .from("payment_transactions")
          .update({
            status: "completed",
            payment_provider_id: payload?.uuid ?? payload?.txId,
            provider_response: payload,
          })
          .eq("bestowal_id", bestowal.id)
          .eq("status", "pending");
      } catch (transactionError) {
        console.warn("Failed to update payment transaction:", transactionError);
      }

      // Execute distribution if automatic
      const distributionData = bestowal.distribution_data as any;
      if (distributionData?.mode === "automatic") {
        try {
          await executeDistribution(supabase, {
            bestowalId: bestowal.id,
            distributionData,
            currency: bestowal.currency,
            totalAmount: bestowal.amount,
          });
          console.log(`Automatic distribution executed for bestowal ${bestowal.id}`);
        } catch (distError) {
          console.error("Failed to execute automatic distribution:", distError);
          // Don't fail the webhook if distribution fails - it can be retried manually
        }
      } else {
        console.log(`Bestowal ${bestowal.id} marked for manual distribution`);
      }

      // Send notification to bestower
      try {
        await supabase.rpc('send-bestowal-notifications', {
          bestowal_id_param: bestowal.id,
        });
      } catch (notifError) {
        console.warn("Failed to send notifications:", notifError);
      }

      console.log(`Cryptomus payment confirmed for bestowal ${bestowal.id}`);
      return jsonResponse(successResponse, 200, req);
    } else if (paymentState === 2 || paymentStatus === "expired") {
      // Payment expired
      await supabase
        .from("bestowals")
        .update({
          payment_status: "expired",
        })
        .eq("id", bestowal.id);

      await supabase
        .from("payment_transactions")
        .update({
          status: "expired",
        })
        .eq("bestowal_id", bestowal.id)
        .eq("status", "pending");

      return jsonResponse(successResponse, 200, req);
    } else if (paymentState === 3 || paymentStatus === "fail" || paymentStatus === "failed") {
      // Payment failed
      await supabase
        .from("bestowals")
        .update({
          payment_status: "failed",
        })
        .eq("id", bestowal.id);

      await supabase
        .from("payment_transactions")
        .update({
          status: "failed",
        })
        .eq("bestowal_id", bestowal.id)
        .eq("status", "pending");

      return jsonResponse(successResponse, 200, req);
    } else {
      // Payment still pending
      console.log(`Cryptomus payment still pending for bestowal ${bestowal.id}`);
      return jsonResponse(successResponse, 200, req);
    }
  } catch (error) {
    console.error("Error processing Cryptomus webhook:", error);
    return jsonResponse(
      { state: 1, result: "Internal server error" },
      500,
      req
    );
  }
};

function jsonResponse(body: unknown, status = 200, req?: Request): Response {
  const corsHeaders = req ? getSecureCorsHeaders(req) : {};
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    },
  );
}

serve(handler);

