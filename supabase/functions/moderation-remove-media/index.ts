// moderation-remove-media — the "Remove" action behind the Trust & Safety queue.
//
// WHY THIS EXISTS AT ALL. Until now review_action 'remove' only stamped the
// media_moderation row; nothing took the image down. That was survivable while
// every queued row was verdict 'block' or 'uncertain', because media_is_allowed()
// already hid those. It stopped being survivable on 2026-09-17 when moderation
// started failing OPEN: a scanner that cannot answer now writes verdict 'allow'
// with needs_review = true, so the image IS live and visible while it waits for
// a human. "Remove" on one of those has to actually remove something.
//
// WHY AN EDGE FUNCTION AND NOT THE BROWSER. Every DELETE policy on
// storage.objects is owner-scoped ((auth.uid())::text = foldername(name)[n]) --
// checked across all ~40 of them, there is no admin or gosat branch on any
// bucket. A gosat's browser session physically cannot delete another member's
// object. Only the service role can, so the delete happens here.
//
// WHAT IT DOES, decided with Davison on 2026-09-17: DELETE THE IMAGE, LEAVE
// THE LISTING. Pulling a whole listing over one bad photo is heavy-handed --
// the member keeps their work and can re-upload. Consequence, stated plainly:
// the listing row keeps its now-dangling URL, so the member sees a missing
// photo until they replace it. That is the intended nudge.
//
// It also flips the row's verdict to 'block'. media_is_allowed() reads the most
// recent row for a bucket+path, so if the object is ever restored from a backup
// it stays unreadable rather than quietly becoming public again.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY"));
    const serviceRoleKey = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "server_misconfigured" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const token = authHeader.slice("Bearer ".length);

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    // Who is asking. A gosat or an admin may remove; nobody else.
    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "unauthorized" }, 401);
    const reviewerId = userData.user.id;

    const [{ data: isAdmin }, { data: isGosat }] = await Promise.all([
      service.rpc("has_role", { _user_id: reviewerId, _role: "admin" }),
      service.rpc("has_role", { _user_id: reviewerId, _role: "gosat" }),
    ]);
    if (!isAdmin && !isGosat) {
      console.warn("moderation-remove-media: non-admin access denied", reviewerId);
      return json({ error: "forbidden" }, 403);
    }

    let payload: { moderationId?: string } = {};
    try { payload = await req.json(); } catch { /* handled below */ }
    if (!payload.moderationId) return json({ error: "missing_moderation_id" }, 400);

    const { data: row, error: rowErr } = await service
      .from("media_moderation")
      .select("id, bucket_id, object_path, subject_type, reviewed_at")
      .eq("id", payload.moderationId)
      .maybeSingle();
    if (rowErr) return json({ error: "lookup_failed", detail: rowErr.message }, 500);
    if (!row) return json({ error: "not_found" }, 404);

    // Delete the object itself. An avatar row (subject_type 'avatar') has no
    // bucket/path -- there is nothing in storage to remove, so it is only
    // stamped. Not an error: the profile column is the thing to clear there,
    // and that is a different action.
    let objectDeleted = false;
    let deleteError: string | null = null;
    if (row.bucket_id && row.object_path) {
      const { error: delErr } = await service.storage.from(row.bucket_id).remove([row.object_path]);
      if (delErr) {
        // Report it rather than stamping the row as if the image were gone.
        // A queue that lies about what it did is worse than one that fails.
        console.error("moderation-remove-media: storage delete failed", delErr);
        deleteError = delErr.message;
      } else {
        objectDeleted = true;
      }
    }
    if (deleteError) return json({ error: "storage_delete_failed", detail: deleteError }, 500);

    const { error: updErr } = await service
      .from("media_moderation")
      .update({
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_action: "remove",
        // Belt and braces: media_is_allowed() reads the newest row for this
        // bucket+path, so this keeps it hidden even if the object comes back.
        verdict: "block",
        needs_review: false,
      })
      .eq("id", payload.moderationId);
    if (updErr) return json({ error: "update_failed", detail: updErr.message }, 500);

    return json({
      ok: true,
      objectDeleted,
      bucket: row.bucket_id,
      path: row.object_path,
      listingKept: true,
    });
  } catch (err) {
    console.error("moderation-remove-media error", err);
    return json({ error: "unexpected", detail: String(err) }, 500);
  }
});
