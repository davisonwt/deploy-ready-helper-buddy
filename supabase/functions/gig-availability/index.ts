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
  const path = url.pathname.replace("/gig-availability", "");

  try {
    // GET /calendar - Monthly calendar view
    if (req.method === "GET" && path === "/calendar") {
      const userId = url.searchParams.get("user_id") || user.id;
      const month = parseInt(url.searchParams.get("month") || String(new Date().getMonth() + 1));
      const year = parseInt(url.searchParams.get("year") || String(new Date().getFullYear()));

      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = new Date(year, month, 0).toISOString().split("T")[0];

      const { data, error } = await supabaseAdmin
        .from("availability_calendar")
        .select("*")
        .eq("user_id", userId)
        .gte("available_date", startDate)
        .lte("available_date", endDate)
        .order("available_date");

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /set-dates - Set available dates
    if (req.method === "POST" && path === "/set-dates") {
      const { dates, user_type, time_slots, max_distance_km, max_hours, location_zone } = await req.json();

      if (!dates?.length || !user_type) {
        return new Response(
          JSON.stringify({ success: false, error: "dates array and user_type required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const records = dates.map((date: string) => ({
        user_id: user.id,
        user_type,
        available_date: date,
        time_slots: time_slots || [{ start_time: "08:00", end_time: "18:00", is_booked: false }],
        max_distance_km_remaining: max_distance_km || 200,
        estimated_hours_remaining: max_hours || 12,
        location_zone: location_zone || null,
        is_available: true,
      }));

      const { data, error } = await supabaseAdmin
        .from("availability_calendar")
        .upsert(records, { onConflict: "user_id,available_date" })
        .select();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data, message: `${dates.length} dates set` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /check - Check if provider is available
    if (req.method === "GET" && path === "/check") {
      const providerId = url.searchParams.get("provider_id");
      const date = url.searchParams.get("date");
      const durationMin = parseInt(url.searchParams.get("duration_min") || "60");
      const distanceKm = parseFloat(url.searchParams.get("distance_km") || "10");

      if (!providerId || !date) {
        return new Response(
          JSON.stringify({ success: false, error: "provider_id and date required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabaseAdmin.rpc("check_provider_availability", {
        p_provider_id: providerId,
        p_date: date,
        p_duration_min: durationMin,
        p_distance_km: distanceKm,
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT /date - Update specific date
    if (req.method === "PUT" && path === "/date") {
      const { date, is_available, time_slots, max_distance_km, max_hours } = await req.json();

      const updateData: Record<string, unknown> = {};
      if (is_available !== undefined) updateData.is_available = is_available;
      if (time_slots) updateData.time_slots = time_slots;
      if (max_distance_km) updateData.max_distance_km_remaining = max_distance_km;
      if (max_hours) updateData.estimated_hours_remaining = max_hours;

      const { data, error } = await supabaseAdmin
        .from("availability_calendar")
        .update(updateData)
        .eq("user_id", user.id)
        .eq("available_date", date)
        .select()
        .single();

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
