import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseKey);
  const supabaseUser = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const url = new URL(req.url);
  const path = url.pathname.replace("/gig-tracking", "");

  try {
    // POST /update - Driver location update
    if (req.method === "POST" && path === "/update") {
      const { booking_id, lat, lng, speed, heading, accuracy, status } = await req.json();

      if (!booking_id || !lat || !lng || !status) {
        return new Response(
          JSON.stringify({ success: false, error: "booking_id, lat, lng, status required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Insert tracking point
      const { data, error } = await supabaseAdmin
        .from("gig_live_tracking")
        .insert({
          booking_id,
          provider_id: user.id,
          lat, lng, speed, heading, accuracy, status,
        })
        .select()
        .single();

      if (error) throw error;

      // Also update driver's current location
      await supabaseAdmin
        .from("community_drivers")
        .update({ current_lat: lat, current_lng: lng })
        .eq("user_id", user.id);

      // Broadcast via Supabase Realtime (channel name = booking_id)
      // Client subscribes to channel: `tracking:${booking_id}`

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /latest - Get latest tracking for a booking
    if (req.method === "GET" && path === "/latest") {
      const bookingId = url.searchParams.get("booking_id");
      if (!bookingId) {
        return new Response(
          JSON.stringify({ success: false, error: "booking_id required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabaseAdmin
        .from("gig_live_tracking")
        .select("*")
        .eq("booking_id", bookingId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /history - Full tracking history for a booking
    if (req.method === "GET" && path === "/history") {
      const bookingId = url.searchParams.get("booking_id");
      const { data, error } = await supabaseAdmin
        .from("gig_live_tracking")
        .select("*")
        .eq("booking_id", bookingId)
        .order("recorded_at", { ascending: true });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
