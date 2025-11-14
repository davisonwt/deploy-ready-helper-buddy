import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { BinancePayClient } from "../_shared/binance.ts";
import {
  DistributionData,
  executeDistribution,
} from "../_shared/distribution.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const successResponse = {
  code: "SUCCESS",
  message: "SUCCESS",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase configuration for webhook handler.");
    return jsonResponse({ code: "ERROR", message: "Server misconfigured" }, 500);
  }

  const rawBody = await req.text();
  const binanceClient = new BinancePayClient();

  const isValidSignature = await binanceClient.verifyWebhookSignature(
    rawBody,
    req.headers,
  );

  if (!isValidSignature) {
    console.error("Invalid Binance Pay webhook signature");
    return jsonResponse({ code: "ERROR", message: "Invalid signature" }, 400);
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    console.error("Failed to parse webhook payload:", error);
    return jsonResponse({ code: "ERROR", message: "Invalid payload" }, 400);
  }

  const data = payload?.data ?? {};
  const merchantTradeNo = data?.merchantTradeNo;
  const status = String(
    data?.status ?? data?.orderStatus ?? "",
  ).toUpperCase();

  if (!merchantTradeNo) {
    console.error("Webhook payload missing merchantTradeNo");
    return jsonResponse({ code: "ERROR", message: "Missing order reference" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

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
      return jsonResponse({ code: "ERROR", message: "Bestowal not found" }, 404);
    }

    if (status === "SUCCESS" || status === "PAY_SUCCESS") {
        await supabase
        .from("bestowals")
        .update({
          payment_status: "completed",
          payment_reference: data?.transactionId ?? data?.prepayId ?? bestowal
            .payment_reference,
        })
        .eq("id", bestowal.id);

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

        if (
          distributionMode === "automatic" &&
          bestowal.payment_status !== "distributed"
        ) {
          if (!distribution) {
            console.error(
              "Distribution data missing for bestowal:",
              bestowal.id,
            );
            return jsonResponse(successResponse);
          }

          try {
            const distributionResult = await executeDistribution(
              supabase,
              binanceClient,
              bestowal.id,
              distribution,
            );

            console.log(
              "Distribution completed for bestowal:",
              bestowal.id,
              distributionResult,
            );
          } catch (distributionError) {
            console.error(
              "Failed to execute distribution for bestowal:",
              bestowal.id,
              distributionError,
            );
            return jsonResponse(
              {
                code: "ERROR",
                message: "Distribution failed",
              },
              500,
            );
          }
        } else if (distributionMode === "manual") {
          console.log(
            "Bestowal requires manual distribution. Holding funds in s2gholding:",
            bestowal.id,
          );
      }

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

      return jsonResponse(successResponse);
    }

    if (status === "PAY_CLOSED" || status === "PAY_FAIL" || status === "FAILED") {
      await supabase
        .from("bestowals")
        .update({
          payment_status: "failed",
          payment_reference: data?.transactionId ?? bestowal.payment_reference,
        })
        .eq("id", bestowal.id);

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

      return jsonResponse(successResponse);
    }

    console.log(
      "Unhandled Binance Pay webhook status:",
      status,
      "payload:",
      payload,
    );
    return jsonResponse(successResponse);
  } catch (error) {
    console.error("Binance Pay webhook processing error:", error);
    return jsonResponse({ code: "ERROR", message: "Internal error" }, 500);
  }
};

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

    if (gosatError) {
      throw gosatError;
    }

    if (!gosatUser?.user_id) {
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

    if (roomError) {
      throw roomError;
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
      "🧾 Bestowal Proof",
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

    await supabase
      .from("chat_messages")
      .insert({
        room_id: roomIdValue,
        sender_id: gosatUser.user_id,
        content: messageContent,
        message_type: "system",
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

function jsonResponse(body: unknown, status = 200): Response {
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
