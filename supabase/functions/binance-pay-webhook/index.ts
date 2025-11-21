import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Inline Binance signature verification (to avoid shared file dependency)
const encoder = new TextEncoder();

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

async function verifyBinanceWebhookSignature(
  rawBody: string,
  headers: Headers,
  apiSecret: string,
): Promise<boolean> {
  const timestamp = headers.get("BinancePay-Timestamp");
  const nonce = headers.get("BinancePay-Nonce");
  const signature = headers.get("BinancePay-Signature");
  const certificateSn = headers.get("BinancePay-Certificate-SN");
  const apiKey = Deno.env.get("BINANCE_PAY_API_KEY");

  if (!timestamp || !nonce || !signature || !certificateSn) {
    return false;
  }

  // Verify certificate matches API key
  if (apiKey && certificateSn !== apiKey) {
    console.error("Binance Pay certificate mismatch", certificateSn);
    return false;
  }

  // Check timestamp (prevent replay attacks)
  const now = Date.now();
  const requestTime = Number(timestamp);
  const toleranceMs = 5 * 60 * 1000; // 5 minutes

  if (Number.isFinite(requestTime) && Math.abs(now - requestTime) > toleranceMs) {
    console.warn(
      `Binance Pay webhook timestamp outside tolerance: now=${now}, timestamp=${requestTime}`,
    );
    return false;
  }

  // Verify signature
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(apiSecret),
    {
      name: "HMAC",
      hash: "SHA-512",
    },
    false,
    ["sign"],
  );

  const payload = `${timestamp}\n${nonce}\n${rawBody}\n`;
  const computedSignature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );

  const computedHex = toHex(computedSignature);
  return computedHex === signature.toUpperCase();
}

// Import distribution types (we'll need to inline executeDistribution too, but for now let's try a simpler approach)
interface DistributionData {
  mode: "automatic" | "manual";
  [key: string]: unknown;
}

// Inline CORS headers (secure) - to avoid shared file dependency in Dashboard deployment
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
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-idempotency-key, x-csrf-token, x-my-custom-header",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Credentials": "true",
    };
  }

  return {
    "Content-Type": "application/json",
  };
};

const successResponse = {
  code: "SUCCESS",
  message: "SUCCESS",
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
    return jsonResponse({ code: "ERROR", message: "Server misconfigured" }, 500, req);
  }

  const rawBody = await req.text();
  
  // Get Binance API secret from environment
  const binanceApiSecret = Deno.env.get("BINANCE_PAY_API_SECRET");
  if (!binanceApiSecret) {
    console.error("BINANCE_PAY_API_SECRET not configured");
    return jsonResponse({ code: "ERROR", message: "Server misconfigured" }, 500, req);
  }

  const isValidSignature = await verifyBinanceWebhookSignature(
    rawBody,
    req.headers,
    binanceApiSecret,
  );

  if (!isValidSignature) {
    console.error("Invalid Binance Pay webhook signature");
    return jsonResponse({ code: "ERROR", message: "Invalid signature" }, 400, req);
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    console.error("Failed to parse webhook payload:", error);
    return jsonResponse({ code: "ERROR", message: "Invalid payload" }, 400, req);
  }

  const data = payload?.data ?? {};
  const merchantTradeNo = data?.merchantTradeNo;
  const webhookId = data?.transactionId ?? data?.prepayId ?? merchantTradeNo;
  const status = String(
    data?.status ?? data?.orderStatus ?? "",
  ).toUpperCase();

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
    webhook_id_param: webhookId || merchantTradeNo,
    provider_param: 'binance_pay'
  });

  if (alreadyProcessed) {
    console.log("Webhook already processed, returning success (idempotent)", { webhookId });
    return jsonResponse(successResponse, 200, req);
  }

  if (!merchantTradeNo) {
    console.error("Webhook payload missing merchantTradeNo");
    return jsonResponse({ code: "ERROR", message: "Missing order reference" }, 400, req);
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
        .eq("id", merchantTradeNo)
        .single();

    if (bestowalError || !bestowal) {
      console.error(
        "Bestowal not found for webhook:",
        merchantTradeNo,
        bestowalError,
      );
      return jsonResponse({ code: "ERROR", message: "Bestowal not found" }, 404, req);
    }

    if (status === "SUCCESS" || status === "PAY_SUCCESS") {
        // Mark webhook as processed BEFORE processing to prevent race conditions
        await supabase.rpc('mark_webhook_processed', {
          webhook_id_param: webhookId || merchantTradeNo,
          provider_param: 'binance_pay',
          payload_hash_param: payloadHash
        });

        // Verify amount matches (prevent tampering)
        const webhookAmount = parseFloat(data?.totalAmount ?? data?.amount ?? bestowal.amount);
        if (Math.abs(bestowal.amount - webhookAmount) > 0.01) {
          console.error('Amount mismatch detected!', {
            stored: bestowal.amount,
            webhook: webhookAmount,
            bestowalId: bestowal.id
          });
          await supabase.rpc('log_payment_audit', {
            user_id_param: bestowal.bestower_id,
            action_param: 'amount_verification_failed',
            payment_method_param: 'binance_pay',
            amount_param: webhookAmount,
            currency_param: bestowal.currency,
            bestowal_id_param: bestowal.id,
            transaction_id_param: webhookId,
            metadata_param: { storedAmount: bestowal.amount, webhookAmount }
          });
          return jsonResponse({ code: "ERROR", message: "Amount verification failed" }, 400, req);
        }

        await supabase
        .from("bestowals")
        .update({
          payment_status: "completed",
          payment_reference: data?.transactionId ?? data?.prepayId ?? bestowal
            .payment_reference,
        })
        .eq("id", bestowal.id);

        // Deduct balance from bestower's wallet when they send payment
        try {
          const { data: bestowerWallet } = await supabase
            .from("user_wallets")
            .select("wallet_address")
            .eq("user_id", bestowal.bestower_id)
            .eq("wallet_type", "binance_pay")
            .eq("is_active", true)
            .order("is_primary", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (bestowerWallet?.wallet_address) {
            const { data: currentBalance } = await supabase
              .from("wallet_balances")
              .select("usdc_balance")
              .eq("user_id", bestowal.bestower_id)
              .eq("wallet_address", bestowerWallet.wallet_address)
              .maybeSingle();

            const current = Number(currentBalance?.usdc_balance ?? 0);
            const newBalance = Math.max(0, current - bestowal.amount);

            await supabase.rpc("update_wallet_balance_secure", {
              target_user_id: bestowal.bestower_id,
              target_wallet_address: bestowerWallet.wallet_address,
              new_balance: newBalance,
            });

            console.log(`Deducted ${bestowal.amount} from bestower ${bestowal.bestower_id} balance. New balance: ${newBalance}`);
          }
        } catch (balanceError) {
          console.error("Failed to deduct balance from bestower:", balanceError);
          // Don't fail the webhook if balance update fails
        }

      try {
        await supabase
          .from("payment_transactions")
          .update({
            status: "completed",
            payment_provider_id: data?.transactionId ?? data?.prepayId,
            provider_response: payload,
          })
          .eq("bestowal_id", bestowal.id)
          .eq("payment_method", "binance_pay");
      } catch (transactionError) {
        console.warn(
          "Failed to update payment transaction for bestowal:",
          bestowal.id,
          transactionError,
        );
      }

        const distribution = bestowal.distribution_data as DistributionData | null;
        const distributionMode = distribution?.mode ?? "automatic";

        // Note: Distribution is handled by a separate function that uses shared files
        // For Dashboard deployment, we'll mark it for manual distribution if automatic fails
        if (
          distributionMode === "automatic" &&
          bestowal.payment_status !== "distributed"
        ) {
          if (!distribution) {
            console.error(
              "Distribution data missing for bestowal:",
              bestowal.id,
            );
            return jsonResponse(successResponse, 200, req);
          }

          // Try to call distribution via edge function (if available)
          try {
            const distributionUrl = `${supabaseUrl}/functions/v1/execute-distribution`;
            const distributionResponse = await fetch(distributionUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                bestowalId: bestowal.id,
                distributionData: distribution,
              }),
            });

            if (distributionResponse.ok) {
              console.log(
                "Distribution completed for bestowal:",
                bestowal.id,
              );
            } else {
              console.warn(
                "Distribution function not available or failed. Bestowal will require manual distribution:",
                bestowal.id,
              );
              // Mark for manual distribution
              await supabase
                .from("bestowals")
                .update({ payment_status: "pending_distribution" })
                .eq("id", bestowal.id);
            }
          } catch (distributionError) {
            console.warn(
              "Distribution service unavailable. Bestowal marked for manual distribution:",
              bestowal.id,
              distributionError,
            );
            // Mark for manual distribution instead of failing
            await supabase
              .from("bestowals")
              .update({ payment_status: "pending_distribution" })
              .eq("id", bestowal.id);
          }
        } else if (distributionMode === "manual") {
          console.log(
            "Bestowal requires manual distribution. Holding funds in s2gholding:",
            bestowal.id,
          );
      }

        // Audit log
        await supabase.rpc('log_payment_audit', {
          user_id_param: bestowal.bestower_id,
          action_param: 'webhook_processed',
          payment_method_param: 'binance_pay',
          amount_param: bestowal.amount,
          currency_param: bestowal.currency,
          bestowal_id_param: bestowal.id,
          transaction_id_param: webhookId,
          metadata_param: { status, distributionMode }
        });

        // Send all three required messages:
        // 1. Gosat → Bestower (Invoice/Proof)
        await sendBestowalProofMessage(supabase, {
          bestowalId: bestowal.id,
          bestowerId: bestowal.bestower_id,
          amount: bestowal.amount,
          currency: bestowal.currency,
          pocketsCount: bestowal.pockets_count,
          paymentReference: data?.transactionId ?? data?.prepayId ?? bestowal.payment_reference,
          distributionMode,
          orchardTitle: bestowal.orchards?.title ?? null,
          orchardType: bestowal.orchards?.orchard_type ?? null,
          createdAt: bestowal.created_at,
          distributionData: distribution,
        });

        // 2. Sower → Bestower (Thank You)
        await sendSowerThankYouMessage(supabase, {
          bestowalId: bestowal.id,
          bestowerId: bestowal.bestower_id,
          orchardId: bestowal.orchard_id,
          amount: bestowal.amount,
          currency: bestowal.currency,
          orchardTitle: bestowal.orchards?.title ?? null,
        });

        // 3. Gosat → Sower (Bestowal Notification)
        await sendSowerBestowalNotification(supabase, {
          bestowalId: bestowal.id,
          orchardId: bestowal.orchard_id,
          bestowerId: bestowal.bestower_id,
          amount: bestowal.amount,
          currency: bestowal.currency,
          pocketsCount: bestowal.pockets_count,
          paymentReference: data?.transactionId ?? data?.prepayId ?? bestowal.payment_reference,
          orchardTitle: bestowal.orchards?.title ?? null,
        });

      return jsonResponse(successResponse, 200, req);
    }

    if (status === "PAY_CLOSED" || status === "PAY_FAIL" || status === "FAILED") {
      // Mark webhook as processed
      await supabase.rpc('mark_webhook_processed', {
        webhook_id_param: webhookId || merchantTradeNo,
        provider_param: 'binance_pay',
        payload_hash_param: payloadHash
      });

      await supabase
        .from("bestowals")
        .update({
          payment_status: "failed",
          payment_reference: data?.transactionId ?? bestowal.payment_reference,
        })
        .eq("id", bestowal.id);

      // Audit log
      await supabase.rpc('log_payment_audit', {
        user_id_param: bestowal.bestower_id,
        action_param: 'webhook_processed',
        payment_method_param: 'binance_pay',
        amount_param: bestowal.amount,
        currency_param: bestowal.currency,
        bestowal_id_param: bestowal.id,
        transaction_id_param: webhookId,
        metadata_param: { status, reason: 'payment_failed' }
      });

      try {
        await supabase
          .from("payment_transactions")
          .update({
            status: "failed",
            provider_response: payload,
          })
          .eq("bestowal_id", bestowal.id)
          .eq("payment_method", "binance_pay");
      } catch (transactionFailError) {
        console.warn(
          "Failed to update payment transaction (failure path):",
          bestowal.id,
          transactionFailError,
        );
      }

      return jsonResponse(successResponse, 200, req);
    }

    console.log(
      "Unhandled Binance Pay webhook status:",
      status,
      "payload:",
      payload,
    );
    return jsonResponse(successResponse, 200, req);
  } catch (error) {
    console.error("Binance Pay webhook processing error:", error);
    return jsonResponse({ code: "ERROR", message: "Internal error" }, 500, req);
  }
};

// 1. Gosat → Bestower: Send invoice/proof message
async function sendBestowalProofMessage(
  supabase: ReturnType<typeof createClient>,
  params: {
    bestowalId: string;
    bestowerId: string;
    amount: number;
    currency: string;
    pocketsCount: number;
    paymentReference?: string | null;
    distributionMode: "automatic" | "manual";
    orchardTitle?: string | null;
    orchardType?: string | null;
    createdAt?: string | null;
    distributionData?: DistributionData | null;
  },
) {
  try {
    if (params.distributionData?.proof_sent_at) {
      console.log("Bestowal proof already sent. Skipping:", params.bestowalId);
      return;
    }

    const { data: gosatUser, error: gosatError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "gosat")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (gosatError || !gosatUser?.user_id) {
      console.warn("No gosat user found to deliver bestowal proof.");
      return;
    }

    const { data: roomId, error: roomError } = await supabase.rpc(
      "get_or_create_direct_room",
      {
        user1_id: gosatUser.user_id,
        user2_id: params.bestowerId,
      },
    );

    if (roomError || !roomId) {
      console.error("Failed to create/get room for bestowal proof:", roomError);
      return;
    }

    const roomIdValue = typeof roomId === "string"
      ? roomId
      : Array.isArray(roomId)
      ? roomId[0]
      : roomId;

    if (!roomIdValue) {
      console.warn("Unable to resolve chat room for bestowal proof:", params.bestowalId);
      return;
    }

    const createdAt = params.createdAt
      ? new Date(params.createdAt)
      : new Date();

    const summaryLines = [
      "🧾 Bestowal Proof & Invoice",
      "",
      `Orchard: ${params.orchardTitle ?? 'Unknown orchard'}`,
      `Amount: ${params.amount.toFixed(2)} ${params.currency}`,
      `Pockets: ${params.pocketsCount}`,
      `Reference: ${params.paymentReference ?? 'N/A'}`,
      `Distribution: ${
        params.distributionMode === "manual"
          ? "Waiting for Gosat release from s2gholding."
          : "Automatically distributed to recipients."
      }`,
      `Date: ${createdAt.toLocaleString('en-US')}`,
    ];

    if (params.orchardType) {
      summaryLines.splice(3, 0, `Orchard Type: ${params.orchardType}`);
    }

    const messageContent = summaryLines.join("\n");

    // Use secure system message function
    await supabase.rpc('insert_system_chat_message', {
      p_room_id: roomIdValue,
      p_content: messageContent,
      p_message_type: 'text',
      p_system_metadata: {
        type: 'bestowal_invoice',
        bestowal_id: params.bestowalId,
        user_id: params.bestowerId,
        is_system: true,
        sender_name: 's2g gosat'
      }
    });

    await supabase
      .from("chat_rooms")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", roomIdValue);

    if (params.distributionData) {
      const updatedDistribution = {
        ...params.distributionData,
        proof_sent_at: new Date().toISOString(),
      };

      await supabase
        .from("bestowals")
        .update({ distribution_data: updatedDistribution })
        .eq("id", params.bestowalId);
    }
  } catch (error) {
    console.error("Failed to send bestowal proof message:", error);
  }
}

// 2. Sower → Bestower: Send thank you message
async function sendSowerThankYouMessage(
  supabase: ReturnType<typeof createClient>,
  params: {
    bestowalId: string;
    bestowerId: string;
    orchardId: string;
    amount: number;
    currency: string;
    orchardTitle?: string | null;
  },
) {
  try {
    // Get sower (orchard owner)
    const { data: orchard, error: orchardError } = await supabase
      .from("orchards")
      .select("user_id, title")
      .eq("id", params.orchardId)
      .single();

    if (orchardError || !orchard?.user_id) {
      console.warn("Orchard not found for thank you message:", params.orchardId);
      return;
    }

    const sowerId = orchard.user_id;

    // Get sower and bestower profiles for personalized message
    const { data: sowerProfile } = await supabase
      .from("profiles")
      .select("first_name, display_name")
      .eq("user_id", sowerId)
      .single();

    const { data: bestowerProfile } = await supabase
      .from("profiles")
      .select("first_name, display_name")
      .eq("user_id", params.bestowerId)
      .single();

    const sowerName = sowerProfile?.display_name || sowerProfile?.first_name || "Sower";
    const bestowerName = bestowerProfile?.display_name || bestowerProfile?.first_name || "Friend";

    // Create or get direct room between sower and bestower
    const { data: roomId, error: roomError } = await supabase.rpc(
      "get_or_create_direct_room",
      {
        user1_id: sowerId,
        user2_id: params.bestowerId,
      },
    );

    if (roomError || !roomId) {
      console.error("Failed to create/get room for thank you message:", roomError);
      return;
    }

    const roomIdValue = typeof roomId === "string"
      ? roomId
      : Array.isArray(roomId)
      ? roomId[0]
      : roomId;

    if (!roomIdValue) {
      console.warn("Unable to resolve chat room for thank you message:", params.bestowalId);
      return;
    }

    const thankYouMessage = [
      `🙏 Thank You, ${bestowerName}!`,
      "",
      `I am deeply grateful for your generous bestowal of ${params.amount.toFixed(2)} ${params.currency} to my orchard "${params.orchardTitle || 'my project'}".`,
      "",
      `Your support means the world to me and helps bring this vision to life. Every contribution, no matter the size, makes a difference.`,
      "",
      `Blessings and gratitude,`,
      `${sowerName}`
    ].join("\n");

    // Use secure system message function (sent on behalf of sower)
    await supabase.rpc('insert_system_chat_message', {
      p_room_id: roomIdValue,
      p_content: thankYouMessage,
      p_message_type: 'text',
      p_system_metadata: {
        type: 'sower_thank_you',
        bestowal_id: params.bestowalId,
        user_id: params.bestowerId,
        sower_id: sowerId,
        is_system: true,
        sender_name: sowerName
      }
    });

    await supabase
      .from("chat_rooms")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", roomIdValue);
  } catch (error) {
    console.error("Failed to send sower thank you message:", error);
  }
}

// 3. Gosat → Sower: Send bestowal notification
async function sendSowerBestowalNotification(
  supabase: ReturnType<typeof createClient>,
  params: {
    bestowalId: string;
    orchardId: string;
    bestowerId: string;
    amount: number;
    currency: string;
    pocketsCount: number;
    paymentReference?: string | null;
    orchardTitle?: string | null;
  },
) {
  try {
    // Get sower (orchard owner)
    const { data: orchard, error: orchardError } = await supabase
      .from("orchards")
      .select("user_id, title")
      .eq("id", params.orchardId)
      .single();

    if (orchardError || !orchard?.user_id) {
      console.warn("Orchard not found for sower notification:", params.orchardId);
      return;
    }

    const sowerId = orchard.user_id;

    // Get gosat user
    const { data: gosatUser, error: gosatError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "gosat")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (gosatError || !gosatUser?.user_id) {
      console.warn("No gosat user found to deliver sower notification.");
      return;
    }

    // Get bestower profile
    const { data: bestowerProfile } = await supabase
      .from("profiles")
      .select("first_name, display_name")
      .eq("user_id", params.bestowerId)
      .single();

    const bestowerName = bestowerProfile?.display_name || bestowerProfile?.first_name || "A bestower";

    // Create or get direct room between gosat and sower
    const { data: roomId, error: roomError } = await supabase.rpc(
      "get_or_create_direct_room",
      {
        user1_id: gosatUser.user_id,
        user2_id: sowerId,
      },
    );

    if (roomError || !roomId) {
      console.error("Failed to create/get room for sower notification:", roomError);
      return;
    }

    const roomIdValue = typeof roomId === "string"
      ? roomId
      : Array.isArray(roomId)
      ? roomId[0]
      : roomId;

    if (!roomIdValue) {
      console.warn("Unable to resolve chat room for sower notification:", params.bestowalId);
      return;
    }

    const notificationMessage = [
      "🎉 New Bestowal Received!",
      "",
      `Great news! Your orchard "${params.orchardTitle || 'your project'}" has received a new bestowal.`,
      "",
      `Bestower: ${bestowerName}`,
      `Amount: ${params.amount.toFixed(2)} ${params.currency}`,
      `Pockets Filled: ${params.pocketsCount}`,
      `Payment Reference: ${params.paymentReference ?? 'N/A'}`,
      "",
      `This brings you closer to your orchard goal! Keep nurturing your vision and engaging with your community.`,
      "",
      `Blessings,`,
      `s2g gosat`
    ].join("\n");

    // Use secure system message function
    await supabase.rpc('insert_system_chat_message', {
      p_room_id: roomIdValue,
      p_content: notificationMessage,
      p_message_type: 'text',
      p_system_metadata: {
        type: 'sower_bestowal_notification',
        bestowal_id: params.bestowalId,
        user_id: sowerId,
        is_system: true,
        sender_name: 's2g gosat'
      }
    });

    await supabase
      .from("chat_rooms")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", roomIdValue);
  } catch (error) {
    console.error("Failed to send sower bestowal notification:", error);
  }
}

function jsonResponse(body: unknown, status = 200, req?: Request): Response {
  const headers = req ? getSecureCorsHeaders(req) : {
    "Content-Type": "application/json",
  };
  
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    },
  );
}

serve(handler);
