// Edge function: issues short-lived signed URLs for files in the private `premium-room` bucket.
// Access rule (mirrors the storage SELECT RLS policy):
//   - caller is the uploader (auth.uid matches folder[2] of the object path), OR
//   - caller has an 'admin' role in public.user_roles, OR
//   - caller has any completed premium_room_access row, OR
//   - caller has any completed premium_item_purchases row.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SIGNED_URL_TTL_SECONDS = 60 * 15; // 15 minutes

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Missing auth" }, 401);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const rawPath = typeof body?.path === "string" ? body.path.trim() : "";
    if (!rawPath || rawPath.length > 1024) {
      return json({ error: "Invalid path" }, 400);
    }
    // Strip leading slashes / accidental bucket prefix
    const path = rawPath.replace(/^\/+/, "").replace(/^premium-room\//, "");
    // Block traversal
    if (path.includes("..") || path.includes("\0")) {
      return json({ error: "Invalid path" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Access check
    const parts = path.split("/");
    const ownerUid = parts[1] || ""; // {covers|products}/<uid>/<file>
    const isOwner = ownerUid === user.id;

    let allowed = isOwner;

    if (!allowed) {
      const { data: roleRow } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (roleRow) allowed = true;
    }

    if (!allowed) {
      const { data: accessRow } = await admin
        .from("premium_room_access")
        .select("id")
        .eq("user_id", user.id)
        .eq("payment_status", "completed")
        .limit(1)
        .maybeSingle();
      if (accessRow) allowed = true;
    }

    if (!allowed) {
      const { data: purchaseRow } = await admin
        .from("premium_item_purchases")
        .select("id")
        .eq("buyer_id", user.id)
        .eq("payment_status", "completed")
        .limit(1)
        .maybeSingle();
      if (purchaseRow) allowed = true;
    }

    if (!allowed) return json({ error: "Forbidden" }, 403);

    const { data: signed, error: signErr } = await admin
      .storage
      .from("premium-room")
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

    if (signErr || !signed?.signedUrl) {
      return json({ error: signErr?.message || "Failed to sign URL" }, 404);
    }

    return json({ signedUrl: signed.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS });
  } catch (e) {
    console.error("get-premium-room-asset error:", e);
    return json({ error: "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
