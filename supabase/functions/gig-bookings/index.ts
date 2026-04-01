import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper: get GoSat system user ID
async function getGosatUserId(supabase: any): Promise<string | null> {
  const { data } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "gosat")
    .limit(1)
    .single();
  return data?.user_id || null;
}

// Helper: send ChatApp notification to a user
async function sendChatNotification(
  supabase: any,
  fromUserId: string,
  toUserId: string,
  message: string
) {
  try {
    const { data: roomId } = await supabase.rpc("get_or_create_direct_room", {
      user1_id: fromUserId,
      user2_id: toUserId,
    });
    if (!roomId) return;

    const actualRoomId = typeof roomId === "object" ? roomId.room_id || roomId.id || roomId : roomId;

    await supabase.rpc("insert_system_chat_message", {
      p_room_id: actualRoomId,
      p_content: message,
      p_metadata: { type: "gig_booking_notification" },
    });
  } catch (err) {
    console.error("Failed to send chat notification:", err);
  }
}

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
  const path = url.pathname.replace("/gig-bookings", "");

  try {
    // POST / - Create booking
    if (req.method === "POST" && (path === "" || path === "/")) {
      const body = await req.json();
      const {
        booking_type, provider_id, provider_type,
        pickup_address, pickup_lat, pickup_lng, pickup_datetime,
        dropoff_address, dropoff_lat, dropoff_lng, dropoff_datetime,
        is_round_trip, return_pickup_datetime, return_dropoff_datetime,
        estimated_distance_km, estimated_duration_min, estimated_fare,
        service_details, is_multi_day, booking_dates, customer_notes,
      } = body;

      if (!booking_type || !provider_type) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing required fields: booking_type, provider_type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const passengerCount = service_details?.passenger_count || 1;

      // Calculate fees
      const fare = estimated_fare || 0;
      const platform_fee = Math.round(fare * 0.10 * 100) / 100;
      const admin_fee = Math.round(fare * 0.05 * 100) / 100;
      const provider_earnings = fare - platform_fee - admin_fee;

      // Get GoSat user for notifications
      const gosatUserId = await getGosatUserId(supabaseAdmin);

      // If no specific provider, find best match using fair distribution
      let assignedProviderId = provider_id;

      if (!provider_id && booking_type === "ride") {
        // Query eligible drivers sorted by booking_score (fair distribution)
        let driverQuery = supabaseAdmin
          .from("community_drivers")
          .select("user_id, full_name, max_passengers, booking_score, rating")
          .eq("status", "approved")
          .eq("is_online", true)
          .order("booking_score", { ascending: true })
          .order("rating", { ascending: false });

        if (passengerCount > 1) {
          driverQuery = driverQuery.gte("max_passengers", passengerCount);
        }

        const { data: eligibleDrivers } = await driverQuery;

        if (eligibleDrivers && eligibleDrivers.length > 0) {
          // Assign to the driver with lowest booking score
          assignedProviderId = eligibleDrivers[0].user_id;

          // Notify all eligible drivers via ChatApp
          const bookingMessage = [
            "🚗 New Ride Booking Request!",
            `📍 Pickup: ${pickup_address || "Not specified"}`,
            `📍 Dropoff: ${dropoff_address || "Not specified"}`,
            `🕐 When: ${pickup_datetime ? new Date(pickup_datetime).toLocaleString() : "ASAP"}`,
            `👥 Passengers: ${passengerCount}`,
            `💰 Estimated Fare: R${fare.toFixed(2)}`,
            customer_notes ? `📝 Notes: ${customer_notes}` : "",
          ].filter(Boolean).join("\n");

          if (gosatUserId) {
            for (const driver of eligibleDrivers) {
              await sendChatNotification(supabaseAdmin, gosatUserId, driver.user_id, bookingMessage);
            }
          }
        }
      }

      // If multi-day, validate each date
      if (is_multi_day && booking_dates?.length > 0) {
        for (const date of booking_dates) {
          const { data: avail } = await supabaseAdmin.rpc("check_provider_availability", {
            p_provider_id: assignedProviderId,
            p_date: date,
            p_duration_min: estimated_duration_min || 60,
            p_distance_km: estimated_distance_km || 10,
          });
          if (avail && !avail.available) {
            return new Response(
              JSON.stringify({ success: false, error: `Provider not available on ${date}: ${avail.reason}` }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

      // Create parent booking
      const { data: booking, error: bookingError } = await supabaseAdmin
        .from("gig_bookings")
        .insert({
          booking_type, customer_id: user.id,
          provider_id: assignedProviderId || "",
          provider_type,
          pickup_address, pickup_lat, pickup_lng, pickup_datetime,
          dropoff_address, dropoff_lat, dropoff_lng, dropoff_datetime,
          is_round_trip: is_round_trip || false,
          return_pickup_datetime, return_dropoff_datetime,
          estimated_distance_km, estimated_duration_min, estimated_fare: fare,
          service_details: { ...(service_details || {}), passenger_count: passengerCount },
          is_multi_day: is_multi_day || false,
          booking_dates: booking_dates || [],
          platform_fee_amount: platform_fee,
          admin_fee_amount: admin_fee,
          provider_earnings,
          customer_notes,
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // Increment booking_score for assigned driver (fair distribution)
      if (assignedProviderId && booking_type === "ride") {
        await supabaseAdmin.rpc("increment_booking_score", { p_user_id: assignedProviderId }).catch(() => {
          // Fallback: direct update if RPC doesn't exist
          supabaseAdmin
            .from("community_drivers")
            .update({ booking_score: (supabaseAdmin as any).raw?.("booking_score + 1") })
            .eq("user_id", assignedProviderId);
        });

        // Simple increment via raw SQL alternative
        await supabaseAdmin
          .from("community_drivers")
          .select("booking_score")
          .eq("user_id", assignedProviderId)
          .single()
          .then(async ({ data: d }) => {
            if (d) {
              await supabaseAdmin
                .from("community_drivers")
                .update({ booking_score: (d.booking_score || 0) + 1 })
                .eq("user_id", assignedProviderId);
            }
          });
      }

      // Send confirmation notification to the assigned driver
      if (assignedProviderId && gosatUserId) {
        const confirmMsg = [
          "✅ You've been assigned a new booking!",
          `🆔 Booking: ${booking.id.slice(0, 8)}...`,
          `📍 Pickup: ${pickup_address || "Not specified"}`,
          `📍 Dropoff: ${dropoff_address || "Not specified"}`,
          `🕐 When: ${pickup_datetime ? new Date(pickup_datetime).toLocaleString() : "ASAP"}`,
          `👥 Passengers: ${passengerCount}`,
          `💰 Your Earnings: R${provider_earnings.toFixed(2)}`,
        ].join("\n");

        await sendChatNotification(supabaseAdmin, gosatUserId, assignedProviderId, confirmMsg);
      }

      // Notify customer
      if (gosatUserId) {
        const customerMsg = [
          "📋 Your booking has been created!",
          `🆔 Booking: ${booking.id.slice(0, 8)}...`,
          `📍 Pickup: ${pickup_address || "Not specified"}`,
          `🕐 When: ${pickup_datetime ? new Date(pickup_datetime).toLocaleString() : "ASAP"}`,
          assignedProviderId ? "🚗 A driver has been assigned and will be in touch." : "🔍 Looking for available drivers...",
        ].join("\n");

        await sendChatNotification(supabaseAdmin, gosatUserId, user.id, customerMsg);
      }

      // If multi-day, create sub-bookings for each date
      if (is_multi_day && booking_dates?.length > 1) {
        const subBookings = booking_dates.map((date: string) => ({
          booking_type, customer_id: user.id, provider_id: assignedProviderId,
          provider_type,
          parent_booking_id: booking.id,
          pickup_address, pickup_lat, pickup_lng,
          pickup_datetime: `${date}T${new Date(pickup_datetime).toISOString().split("T")[1]}`,
          dropoff_address, dropoff_lat, dropoff_lng,
          estimated_distance_km, estimated_duration_min,
          estimated_fare: fare / booking_dates.length,
          service_details: { ...(service_details || {}), passenger_count: passengerCount },
          platform_fee_amount: platform_fee / booking_dates.length,
          admin_fee_amount: admin_fee / booking_dates.length,
          provider_earnings: provider_earnings / booking_dates.length,
        }));
        await supabaseAdmin.from("gig_bookings").insert(subBookings);
      }

      return new Response(
        JSON.stringify({ success: true, data: booking, message: "Booking created" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /search - Search providers
    if (req.method === "GET" && path === "/search") {
      const type = url.searchParams.get("type");
      const lat = parseFloat(url.searchParams.get("lat") || "0");
      const lng = parseFloat(url.searchParams.get("lng") || "0");
      const radius = parseFloat(url.searchParams.get("radius") || "50");
      const date = url.searchParams.get("date");
      const minPassengers = parseInt(url.searchParams.get("min_passengers") || "0");
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");

      if (type === "driver") {
        let query = supabaseAdmin
          .from("community_drivers")
          .select("*", { count: "exact" })
          .eq("status", "approved")
          .eq("is_online", true)
          .order("booking_score", { ascending: true })
          .order("rating", { ascending: false })
          .range((page - 1) * limit, page * limit - 1);

        // Filter by passenger capacity
        if (minPassengers > 0) {
          query = query.gte("max_passengers", minPassengers);
        }

        const { data: drivers, count, error } = await query;
        if (error) throw error;

        return new Response(
          JSON.stringify({
            success: true,
            data: drivers,
            meta: { page, limit, total: count, total_pages: Math.ceil((count || 0) / limit) },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (type === "service") {
        let query = supabaseAdmin
          .from("service_providers")
          .select("*", { count: "exact" })
          .eq("status", "approved")
          .range((page - 1) * limit, page * limit - 1);

        const serviceCategory = url.searchParams.get("category");
        if (serviceCategory) {
          query = query.contains("services_offered", [serviceCategory]);
        }

        const { data: providers, count, error } = await query;
        if (error) throw error;

        return new Response(
          JSON.stringify({
            success: true,
            data: providers,
            meta: { page, limit, total: count, total_pages: Math.ceil((count || 0) / limit) },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: "Invalid type parameter. Use 'driver' or 'service'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /my-bookings - Get user's bookings
    if (req.method === "GET" && path === "/my-bookings") {
      const status = url.searchParams.get("status");
      const role = url.searchParams.get("role") || "customer";
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");

      let query = supabaseAdmin
        .from("gig_bookings")
        .select("*", { count: "exact" })
        .is("parent_booking_id", null)
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (role === "provider") {
        query = query.eq("provider_id", user.id);
      } else {
        query = query.eq("customer_id", user.id);
      }
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

    // PUT /status - Update booking status (for providers)
    if (req.method === "PUT" && path === "/status") {
      const { booking_id, status: newStatus, actual_distance_km, actual_duration_min, final_fare } = await req.json();

      if (!booking_id || !newStatus) {
        return new Response(
          JSON.stringify({ success: false, error: "booking_id and status required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updateData: Record<string, unknown> = { status: newStatus };
      if (newStatus === "completed") {
        if (final_fare) {
          const pf = Math.round(final_fare * 0.10 * 100) / 100;
          const af = Math.round(final_fare * 0.05 * 100) / 100;
          updateData.final_fare = final_fare;
          updateData.platform_fee_amount = pf;
          updateData.admin_fee_amount = af;
          updateData.provider_earnings = final_fare - pf - af;
        }
        if (actual_distance_km) updateData.actual_distance_km = actual_distance_km;
        if (actual_duration_min) updateData.actual_duration_min = actual_duration_min;
        updateData.payment_status = "captured";
      }

      const { data, error } = await supabaseAdmin
        .from("gig_bookings")
        .update(updateData)
        .eq("id", booking_id)
        .eq("provider_id", user.id)
        .select()
        .single();

      if (error) throw error;

      // Send status update notification via ChatApp
      const gosatUserId = await getGosatUserId(supabaseAdmin);
      if (gosatUserId && data) {
        const statusEmoji: Record<string, string> = {
          confirmed: "✅", in_progress: "🚗", completed: "🎉", cancelled: "❌",
        };
        const emoji = statusEmoji[newStatus] || "📋";
        const customerNotifMsg = `${emoji} Your booking ${data.id.slice(0, 8)}... has been updated to: ${newStatus.toUpperCase()}`;
        await sendChatNotification(supabaseAdmin, gosatUserId, data.customer_id, customerNotifMsg);
      }

      // If completed, create transaction records
      if (newStatus === "completed" && data) {
        const fare = data.final_fare || data.estimated_fare || 0;
        const feeBreakdown = {
          subtotal: fare,
          platform_fee_10pct: data.platform_fee_amount,
          admin_fee_5pct: data.admin_fee_amount,
          provider_earnings: data.provider_earnings,
        };

        await supabaseAdmin.from("gig_transactions").insert([
          {
            user_id: data.customer_id,
            booking_id: data.id,
            transaction_type: "payment",
            amount: fare,
            status: "completed",
            breakdown: feeBreakdown,
            description: `Payment for ${data.booking_type} booking`,
          },
          {
            user_id: data.provider_id,
            booking_id: data.id,
            transaction_type: "payout",
            amount: data.provider_earnings,
            status: "pending",
            breakdown: feeBreakdown,
            description: `Earnings from ${data.booking_type} booking (pending payout)`,
          },
          {
            user_id: data.provider_id,
            booking_id: data.id,
            transaction_type: "platform_fee",
            amount: data.platform_fee_amount,
            status: "completed",
            breakdown: feeBreakdown,
            description: "Platform fee (10%)",
          },
          {
            user_id: data.provider_id,
            booking_id: data.id,
            transaction_type: "admin_fee",
            amount: data.admin_fee_amount,
            status: "completed",
            breakdown: feeBreakdown,
            description: "Admin fee (5%)",
          },
        ]);
      }

      return new Response(
        JSON.stringify({ success: true, data, message: `Booking ${newStatus}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PUT /cancel
    if (req.method === "PUT" && path === "/cancel") {
      const { booking_id, reason } = await req.json();
      const { data, error } = await supabaseAdmin
        .from("gig_bookings")
        .update({
          status: "cancelled",
          cancellation_reason: reason,
          payment_status: "refunded",
        })
        .eq("id", booking_id)
        .or(`customer_id.eq.${user.id},provider_id.eq.${user.id}`)
        .select()
        .single();

      if (error) throw error;

      // Notify both parties
      const gosatUserId = await getGosatUserId(supabaseAdmin);
      if (gosatUserId && data) {
        const cancelMsg = `❌ Booking ${data.id.slice(0, 8)}... has been cancelled.${reason ? `\nReason: ${reason}` : ""}`;
        const otherParty = data.customer_id === user.id ? data.provider_id : data.customer_id;
        if (otherParty) {
          await sendChatNotification(supabaseAdmin, gosatUserId, otherParty, cancelMsg);
        }
      }

      return new Response(
        JSON.stringify({ success: true, data, message: "Booking cancelled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // GET /earnings - Provider earnings dashboard
    if (req.method === "GET" && path === "/earnings") {
      const dateFrom = url.searchParams.get("date_from");
      const dateTo = url.searchParams.get("date_to");

      let query = supabaseAdmin
        .from("gig_transactions")
        .select("*")
        .eq("user_id", user.id)
        .in("transaction_type", ["payout"])
        .order("created_at", { ascending: false });

      if (dateFrom) query = query.gte("created_at", dateFrom);
      if (dateTo) query = query.lte("created_at", dateTo);

      const { data, error } = await query;
      if (error) throw error;

      const totalEarnings = (data || []).reduce((sum: number, t: any) => sum + (t.amount || 0), 0);
      const pendingPayouts = (data || []).filter((t: any) => t.status === "pending")
        .reduce((sum: number, t: any) => sum + (t.amount || 0), 0);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            transactions: data,
            summary: { total_earnings: totalEarnings, pending_payouts: pendingPayouts },
          },
        }),
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
