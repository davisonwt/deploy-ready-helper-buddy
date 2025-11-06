import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Stripe payment creation started");

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

    const requestBody = await req.json();
    const { amount, currency, orchardId, pocketsCount, pocketNumbers } = requestBody;
    
    // Input validation
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (amount < 1 || amount > 1000000) {
      return new Response(JSON.stringify({ error: 'Amount must be between $1 and $1,000,000' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const allowedCurrencies = ['usd', 'eur', 'gbp', 'zar'];
    if (!currency || !allowedCurrencies.includes(currency.toLowerCase())) {
      return new Response(JSON.stringify({ error: 'Invalid currency' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!orchardId || typeof orchardId !== 'string') {
      return new Response(JSON.stringify({ error: 'Orchard ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (pocketsCount && (typeof pocketsCount !== 'number' || pocketsCount < 1 || pocketsCount > 1000)) {
      return new Response(JSON.stringify({ error: 'Invalid pockets count' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    logStep("Request data validated", { amount, currency, orchardId, pocketsCount });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe secret key not configured");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: currency?.toLowerCase() || "usd",
            product_data: {
              name: `Sow2Grow Orchard Bestowal`,
              description: `Support for orchard with ${pocketsCount} pockets`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/payment-cancelled`,
      metadata: {
        orchard_id: orchardId,
        user_id: user.id,
        pockets_count: pocketsCount?.toString() || "0",
      },
    });

    logStep("Stripe checkout session created", { sessionId: session.id });

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
        payment_method: "stripe",
        payment_reference: session.id,
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
        payment_method: "stripe",
        payment_provider_id: session.id,
        amount: amount,
        currency: currency || "USD",
        status: "pending",
        provider_response: { session_id: session.id, payment_status: session.payment_status },
      });

    if (transactionError) {
      logStep("Transaction record error", transactionError);
    }

    logStep("Stripe payment process completed", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({
      sessionId: session.id,
      url: session.url,
      bestowId: bestowal.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Log detailed error server-side
    logStep("ERROR in Stripe payment creation", { message: errorMessage });
    if (error instanceof Error && error.stack) {
      console.error("Error stack:", error.stack);
    }
    
    // Return generic error to client
    return new Response(JSON.stringify({ 
      error: 'Payment processing failed. Please try again or contact support.',
      requestId: crypto.randomUUID()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});