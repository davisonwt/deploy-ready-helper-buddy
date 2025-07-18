import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[EFT-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("EFT payment creation started");

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

    // Generate unique reference number for EFT
    const referenceNumber = `SOW${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    
    // Get bank details from payment config
    const { data: paymentConfig, error: configError } = await supabaseClient
      .from("payment_config")
      .select("*")
      .single();

    if (configError || !paymentConfig) {
      logStep("Payment config error", configError);
      throw new Error("Payment configuration not found");
    }

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
        payment_method: "eft",
        payment_reference: referenceNumber,
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
        payment_method: "eft",
        payment_provider_id: referenceNumber,
        amount: amount,
        currency: currency || "USD",
        status: "pending",
        provider_response: {
          reference_number: referenceNumber,
          bank_details: paymentConfig,
          instructions: "Please use the reference number when making your EFT payment",
        },
      });

    if (transactionError) {
      logStep("Transaction record error", transactionError);
    }

    logStep("EFT payment record created", { referenceNumber, bestowId: bestowal.id });

    return new Response(JSON.stringify({
      referenceNumber: referenceNumber,
      bankDetails: {
        bankName: paymentConfig.bank_name,
        accountName: paymentConfig.bank_account_name,
        accountNumber: paymentConfig.bank_account_number,
        swiftCode: paymentConfig.bank_swift_code,
        businessEmail: paymentConfig.business_email,
      },
      amount: amount,
      currency: currency || "USD",
      bestowId: bestowal.id,
      instructions: [
        "Use the reference number as your payment reference",
        "Allow 1-3 business days for processing",
        "You will receive a confirmation email once payment is verified",
      ],
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in EFT payment creation", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});