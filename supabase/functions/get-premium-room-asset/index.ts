// Edge function: issues short-lived signed URLs for files in the private `premium-room` bucket.
// Access rule:
//   - caller is the uploader (owner of the path), OR
//   - caller has 'admin' role, OR
//   - caller has completed purchase/access for the SPECIFIC room containing the file.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SIGNED_URL_TTL_SECONDS = 60 * 15;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Missing auth" }, 401);

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
    if (!rawPath || rawPath.length > 1024) return json({ error: "Invalid path" }, 400);

    const path = rawPath.replace(/^\/+/, "").replace(/^premium-room\//, "");
    if (path.includes("..") || path.includes("\0")) return json({ error: "Invalid path" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const parts = path.split("/");

    // Owner check: covers|products|documents/<uid>/<file>  OR  <roomId>/music/<file> (room owner)
    let allowed = false;
    let roomId: string | null = null;
    let ownerUid: string | null = null;

    if (UUID_RE.test(parts[0] ?? "")) {
      // Form: <roomId>/<subdir>/<file>
      roomId = parts[0];
      const { data: roomRow } = await admin
        .from("premium_rooms")
        .select("creator_id")
        .eq("id", roomId)
        .maybeSingle();
      if (roomRow) {
        ownerUid = (roomRow as any).creator_id;
        if (ownerUid === user.id) allowed = true;
      } else {
        roomId = null;
      }
    } else {
      // Form: <category>/<uid>/<file>
      ownerUid = parts[1] ?? null;
      if (ownerUid === user.id) allowed = true;
    }

    // Admin override
    if (!allowed) {
      const { data: roleRow } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (roleRow) allowed = true;
    }

    // Resolve room_id from premium_rooms jsonb columns if not yet known
    if (!allowed && !roomId) {
      const { data: rooms } = await admin
        .from("premium_rooms")
        .select("id, creator_id, artwork, music, documents");
      const needle = path;
      for (const r of (rooms ?? []) as any[]) {
        const blobs = [r.artwork, r.music, r.documents];
        const hay = JSON.stringify(blobs);
        if (hay && hay.includes(needle)) {
          roomId = r.id;
          if (r.creator_id === user.id) allowed = true;
          break;
        }
      }
    }

    // Room-scoped purchase / access check
    if (!allowed && roomId) {
      const { data: accessRow } = await admin
        .from("premium_room_access")
        .select("id")
        .eq("user_id", user.id)
        .eq("room_id", roomId)
        .eq("payment_status", "completed")
        .limit(1)
        .maybeSingle();
      if (accessRow) allowed = true;

      if (!allowed) {
        const { data: purchaseRow } = await admin
          .from("premium_item_purchases")
          .select("id")
          .eq("buyer_id", user.id)
          .eq("room_id", roomId)
          .eq("payment_status", "completed")
          .limit(1)
          .maybeSingle();
        if (purchaseRow) allowed = true;
      }
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
