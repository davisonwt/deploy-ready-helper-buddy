import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { priceBreakdown } from "../_shared/platformFee.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, data?: any) => {
  console.log(`[purchase-music-track] ${step}`, data ? JSON.stringify(data) : '');
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting music track purchase");
    
    // Create Supabase client for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY")) ?? ""
    );

    // Create service role client for privileged operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) ?? "",
      { auth: { persistSession: false } }
    );

    // Get the user from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("Missing authorization header");
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      logStep("Authentication failed", { authError });
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    logStep("User authenticated", { userId: user.id });

    // Parse request body
    const { trackId, paymentReference } = await req.json();
    
    if (!trackId) {
      return new Response(
        JSON.stringify({ error: "Track ID is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    logStep("Processing purchase", { trackId, userId: user.id });

    // Get track details
    const { data: track, error: trackError } = await supabaseService
      .from('dj_music_tracks')
      .select('*')
      .eq('id', trackId)
      .single();

    if (trackError || !track) {
      logStep("Track not found", { trackError });
      return new Response(
        JSON.stringify({ error: "Track not found" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Pricing rule: the sower sets the price. Sow2Grow's 15% is added ON TOP
    // and carried by the bestower. A whisperer share, when one is linked,
    // comes out of the sower's base — never on top.
    const { base: baseAmount, s2gFee: platformFee, total: totalAmount } =
      priceBreakdown(track.price);
    const sow2growFee = 0;

    logStep("Calculated pricing", { baseAmount, platformFee, sow2growFee, totalAmount });

    // Create purchase record — ALWAYS pending. A separate, server-side
    // payment verifier (on-chain signature check / webhook) is the only
    // path allowed to flip status to 'completed' and trigger delivery.
    // The client-supplied paymentReference is recorded for later
    // verification but does NOT confer entitlement on its own.
    const { data: purchase, error: purchaseError } = await supabaseService
      .from('music_purchases')
      .insert({
        buyer_id: user.id,
        track_id: trackId,
        amount: baseAmount,
        platform_fee: platformFee,
        sow2grow_fee: sow2growFee,
        total_amount: totalAmount,
        payment_status: 'pending',
        payment_reference: paymentReference ?? null
      })
      .select()
      .single();

    if (purchaseError) {
      logStep("Failed to create purchase record", { purchaseError });
      return new Response(
        JSON.stringify({ error: "Failed to create purchase record" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    logStep("Purchase created (pending verification)", { purchaseId: purchase.id });

    return new Response(
      JSON.stringify({
        success: true,
        purchase: {
          id: purchase.id,
          track_title: track.track_title,
          artist_name: track.artist_name,
          total_amount: totalAmount,
          payment_status: purchase.payment_status
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    logStep("Unexpected error", { error: error.message });
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});