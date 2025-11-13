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
      .select("id, payment_status, payment_reference, distribution_data, currency")
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

      if (bestowal.payment_status !== "distributed") {
        const distribution = bestowal.distribution_data as DistributionData | null;

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
      }

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
