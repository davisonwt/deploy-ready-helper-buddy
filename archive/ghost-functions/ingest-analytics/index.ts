import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Extract user from JWT if present
    let userId: string | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const anonClient = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_ANON_KEY")!
      );
      const {
        data: { user },
      } = await anonClient.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const { events } = await req.json();

    if (!Array.isArray(events) || events.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No events provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cap batch size
    const batch = events.slice(0, 500);

    // Extract geo from headers (Supabase/CDN typically provides these)
    const forwardedFor = req.headers.get("x-forwarded-for");
    const cfCountry = req.headers.get("cf-ipcountry");
    const cfCity = req.headers.get("cf-ipcity");

    const rows = batch.map((evt: any) => ({
      user_id: userId || evt.userId || null,
      session_id: evt.sessionId || "unknown",
      event: evt.event,
      properties: (() => {
        const { event, userId: _u, sessionId: _s, timestamp: _t, localTime: _l, timezone: _tz,
          deviceModel: _dm, osVersion: _os, appVersion: _av, screenWidth: _sw, screenHeight: _sh,
          utmSource: _us, utmMedium: _um, utmCampaign: _uc, utmTerm: _ut, utmContent: _uco,
          attributionChannel: _ac, ipCountry: _ic, ipCity: _icy, ...rest } = evt;
        return rest;
      })(),
      timestamp: evt.timestamp ? new Date(evt.timestamp).toISOString() : new Date().toISOString(),
      device_model: evt.deviceModel || null,
      os_version: evt.osVersion || null,
      screen_width: evt.screenWidth || null,
      screen_height: evt.screenHeight || null,
      utm_source: evt.utmSource || null,
      utm_medium: evt.utmMedium || null,
      utm_campaign: evt.utmCampaign || null,
      utm_term: evt.utmTerm || null,
      utm_content: evt.utmContent || null,
      attribution_channel: evt.attributionChannel || null,
      ip_country: evt.ipCountry || cfCountry || null,
      ip_city: evt.ipCity || cfCity || null,
    }));

    const { error, count } = await supabase
      .from("analytics_events")
      .insert(rows);

    if (error) {
      console.error("Insert error:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, inserted: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Ingest error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
