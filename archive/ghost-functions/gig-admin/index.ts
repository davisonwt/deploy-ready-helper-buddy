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

  // Check admin role
  const { data: roleData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) {
    return new Response(
      JSON.stringify({ success: false, error: "Admin access required" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const url = new URL(req.url);
  const path = url.pathname.replace("/gig-admin", "");

  try {
    // GET /drivers - List drivers with filters
    if (req.method === "GET" && path === "/drivers") {
      const status = url.searchParams.get("status");
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");

      let query = supabaseAdmin
        .from("community_drivers")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (status) query = query.eq("status", status);

      const { data, count, error } = await query;
      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true, data,
          meta: { page, limit, total: count, total_pages: Math.ceil((count || 0) / limit) },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT /drivers/verify
    if (req.method === "PUT" && path === "/drivers/verify") {
      const { driver_id, action, notes } = await req.json();
      const newStatus = action === "approve" ? "approved" : "rejected";

      const { data, error } = await supabaseAdmin
        .from("community_drivers")
        .update({ status: newStatus, background_check_status: newStatus })
        .eq("id", driver_id)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data, message: `Driver ${newStatus}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /providers - List service providers
    if (req.method === "GET" && path === "/providers") {
      const status = url.searchParams.get("status");
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");

      let query = supabaseAdmin
        .from("service_providers")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (status) query = query.eq("status", status);

      const { data, count, error } = await query;
      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true, data,
          meta: { page, limit, total: count, total_pages: Math.ceil((count || 0) / limit) },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /bookings - All bookings
    if (req.method === "GET" && path === "/bookings") {
      const status = url.searchParams.get("status");
      const bookingType = url.searchParams.get("type");
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");

      let query = supabaseAdmin
        .from("gig_bookings")
        .select("*", { count: "exact" })
        .is("parent_booking_id", null)
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (status) query = query.eq("status", status);
      if (bookingType) query = query.eq("booking_type", bookingType);

      const { data, count, error } = await query;
      if (error) throw error;

      return new Response(
        JSON.stringify({
          success: true, data,
          meta: { page, limit, total: count, total_pages: Math.ceil((count || 0) / limit) },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /financials - Revenue reports
    if (req.method === "GET" && path === "/financials") {
      const dateFrom = url.searchParams.get("date_from");
      const dateTo = url.searchParams.get("date_to");

      let query = supabaseAdmin
        .from("gig_transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (dateFrom) query = query.gte("created_at", dateFrom);
      if (dateTo) query = query.lte("created_at", dateTo);

      const { data, error } = await query;
      if (error) throw error;

      const totalRevenue = (data || [])
        .filter((t: any) => t.transaction_type === "platform_fee" || t.transaction_type === "admin_fee")
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      const platformFees = (data || [])
        .filter((t: any) => t.transaction_type === "platform_fee")
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      const adminFees = (data || [])
        .filter((t: any) => t.transaction_type === "admin_fee")
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      const totalPayouts = (data || [])
        .filter((t: any) => t.transaction_type === "payout")
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            transactions: data,
            summary: {
              total_revenue: totalRevenue,
              platform_fees_10pct: platformFees,
              admin_fees_5pct: adminFees,
              total_payouts: totalPayouts,
              transaction_count: data?.length || 0,
            },
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT /zones - Update zone pricing
    if (req.method === "PUT" && path === "/zones") {
      const { zone_id, base_fare_per_km, surge_multiplier, min_trip_minutes } = await req.json();

      const updateData: Record<string, unknown> = {};
      if (base_fare_per_km !== undefined) updateData.base_fare_per_km = base_fare_per_km;
      if (surge_multiplier !== undefined) updateData.surge_multiplier = surge_multiplier;
      if (min_trip_minutes !== undefined) updateData.min_trip_minutes = min_trip_minutes;

      const { data, error } = await supabaseAdmin
        .from("service_zones")
        .update(updateData)
        .eq("id", zone_id)
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
