import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { token, new_password } = await req.json();
    if (
      !token || typeof token !== "string" ||
      !new_password || typeof new_password !== "string" || new_password.length < 10
    ) {
      return new Response(JSON.stringify({ success: false, error: "Invalid input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: row, error: tokErr } = await admin
      .from("password_reset_requests")
      .select("id, user_id, status, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (tokErr || !row || row.status !== "pending" || !row.user_id) {
      return new Response(JSON.stringify({ success: false, error: "Invalid or expired token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ success: false, error: "Token expired" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(row.user_id, {
      password: new_password,
    });
    if (updErr) {
      return new Response(JSON.stringify({ success: false, error: updErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin
      .from("password_reset_requests")
      .update({ status: "used", reviewed_at: new Date().toISOString() })
      .eq("id", row.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String((e as Error).message) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
