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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase configuration missing for distribution handler");
    }

    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      { auth: { persistSession: false } },
    );

    const { bestowId } = await req.json();

    if (!bestowId) {
      throw new Error("bestowId is required");
    }

    const { data: bestowal, error: bestowError } = await supabaseClient
      .from("bestowals")
      .select("id, payment_status, amount, currency, distribution_data")
      .eq("id", bestowId)
      .single();

    if (bestowError || !bestowal) {
      throw new Error(`Bestowal not found: ${bestowId}`);
    }

    if (bestowal.payment_status === "distributed") {
      return jsonResponse({
        success: true,
        message: "Bestowal already distributed",
        bestowId,
      });
    }

    if (bestowal.payment_status !== "completed") {
      throw new Error(
        `Bestowal status must be 'completed' before distribution. Current status: ${bestowal.payment_status}`,
      );
    }

    const distribution = bestowal.distribution_data as DistributionData | null;

    if (!distribution) {
      throw new Error("Distribution data is missing for this bestowal");
    }

    const binanceClient = new BinancePayClient();

    const result = await executeDistribution(
      supabaseClient,
      binanceClient,
      bestowal.id,
      distribution,
    );

    return jsonResponse({
      success: true,
      message: "Bestowal distributed successfully",
      bestowId,
      transfers: result.transfers,
    });
  } catch (error) {
    console.error("Error distributing bestowal:", error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      400,
    );
  }
});

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
