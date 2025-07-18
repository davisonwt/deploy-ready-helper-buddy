import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYPAL-ORDER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("PayPal order creation started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { amount, currency, orchardId, pocketsCount, pocketNumbers } = await req.json();
    logStep("Request data received", { amount, currency, orchardId, pocketsCount });

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
      logStep("PayPal token error", tokenData);
      throw new Error("Failed to get PayPal access token");
    }

    logStep("PayPal access token obtained");

    // Create PayPal order
    const orderData = {
      intent: "CAPTURE",
      purchase_units: [{
        amount: {
          currency_code: currency || "USD",
          value: amount.toString(),
        },
        description: `Sow2Grow Orchard Bestowal - ${pocketsCount} pockets`,
        custom_id: `orchard_${orchardId}_user_${user.id}`,
      }],
      application_context: {
        return_url: `${req.headers.get("origin")}/payment-success`,
        cancel_url: `${req.headers.get("origin")}/payment-cancelled`,
        brand_name: "Sow2Grow",
        user_action: "PAY_NOW",
      },
    };

    const orderResponse = await fetch("https://api-m.sandbox.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderData),
    });

    const order = await orderResponse.json();
    if (!orderResponse.ok) {
      logStep("PayPal order creation error", order);
      throw new Error("Failed to create PayPal order");
    }

    logStep("PayPal order created", { orderId: order.id });

    // Create bestowal record
    const { data: bestowal, error: bestowError } = await supabaseClient
      .from("bestowals")
      .insert({
        orchard_id: orchardId,
        bestower_id: user.id,
        amount: amount,
        currency: currency || "USD",
        pockets_count: pocketsCount || 0,
        pocket_numbers: pocketNumbers || [],
        payment_status: "pending",
        payment_method: "paypal",
        payment_reference: order.id,
      })
      .select()
      .single();

    if (bestowError) {
      logStep("Bestowal creation error", bestowError);
      throw new Error("Failed to create bestowal record");
    }

    // Create payment transaction record
    const { error: transactionError } = await supabaseClient
      .from("payment_transactions")
      .insert({
        bestowal_id: bestowal.id,
        payment_method: "paypal",
        payment_provider_id: order.id,
        amount: amount,
        currency: currency || "USD",
        status: "pending",
        provider_response: order,
      });

    if (transactionError) {
      logStep("Transaction record error", transactionError);
    }

    const approvalUrl = order.links.find((link: any) => link.rel === "approve")?.href;
    
    logStep("PayPal order process completed", { orderId: order.id, approvalUrl });

    return new Response(JSON.stringify({
      orderId: order.id,
      approvalUrl: approvalUrl,
      bestowId: bestowal.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in PayPal order creation", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});