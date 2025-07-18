import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYPAL-CAPTURE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("PayPal capture started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { orderId } = await req.json();
    logStep("Capture request received", { orderId });

    // Get PayPal access token
    const clientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const clientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    
    if (!clientId || !clientSecret) {
      throw new Error("PayPal credentials not configured");
    }

    const auth = btoa(`${clientId}:${clientSecret}`);
    const tokenResponse = await fetch("https://api-m.sandbox.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error("Failed to get PayPal access token");
    }

    // Capture the payment
    const captureResponse = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
    });

    const captureData = await captureResponse.json();
    if (!captureResponse.ok) {
      logStep("PayPal capture error", captureData);
      throw new Error("Failed to capture PayPal payment");
    }

    logStep("PayPal payment captured", { orderId, status: captureData.status });

    // Update bestowal status
    const { error: bestowError } = await supabaseClient
      .from("bestowals")
      .update({
        payment_status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("payment_reference", orderId);

    if (bestowError) {
      logStep("Bestowal update error", bestowError);
    }

    // Update payment transaction
    const { error: transactionError } = await supabaseClient
      .from("payment_transactions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        provider_response: captureData,
      })
      .eq("payment_provider_id", orderId);

    if (transactionError) {
      logStep("Transaction update error", transactionError);
    }

    return new Response(JSON.stringify({
      success: true,
      captureId: captureData.id,
      status: captureData.status,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in PayPal capture", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});