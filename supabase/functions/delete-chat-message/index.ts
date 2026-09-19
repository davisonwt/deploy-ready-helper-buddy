// delete-chat-message — sender-initiated "delete for everyone."
//
// Soft-deletes the chat_messages row (deleted_at/deleted_by) so
// ChatMessage.jsx renders a "This message was deleted" placeholder for
// every participant, and hard-removes the underlying storage object (voice
// note / video clip / attached file) so it is no longer fetchable by its
// stored URL -- a deleted voice note must not remain reachable.
//
// Storage removal has to happen here, not in the browser: chat-media has no
// DELETE policy on storage.objects at all, and chat-files' DELETE policy is
// scoped to the uploader's own folder, not to "am I this message's sender"
// (mirrors moderation-remove-media's finding: no bucket has an admin/gosat
// or per-message DELETE branch). Only the service role can do it, so this
// function is the enforcement point for "only the sender can delete" on the
// storage half; the DB half is additionally covered by chat_messages'
// existing "Senders can update own messages" RLS policy.
//
// content_reports.target_id is a loose text column with no FK to
// chat_messages (by design -- it spans many content types), so a report
// already filed against a message this deletes is untouched; nothing here
// needs to account for it.

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

/** Pulls {bucket, path} out of a Supabase Storage sign/public URL. Returns
 * null for anything else (message had no attachment, or an unrecognized URL
 * shape) -- callers treat that as "nothing to remove from storage." */
function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  const match = url.match(/\/storage\/v1\/object\/(?:sign|public)\/([^/]+)\/([^?]+)/);
  if (!match) return null;
  return { bucket: match[1], path: decodeURIComponent(match[2]) };
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

    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) return json({ error: "unauthorized" }, 401);
    const callerId = userData.user.id;

    let payload: { messageId?: string } = {};
    try { payload = await req.json(); } catch { /* handled below */ }
    if (!payload.messageId) return json({ error: "missing_message_id" }, 400);

    const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const { data: message, error: fetchErr } = await service
      .from("chat_messages")
      .select("id, sender_id, file_url, deleted_at")
      .eq("id", payload.messageId)
      .maybeSingle();
    if (fetchErr) return json({ error: "lookup_failed", detail: fetchErr.message }, 500);
    if (!message) return json({ error: "not_found" }, 404);
    if (message.deleted_at) return json({ ok: true, alreadyDeleted: true });

    // Only the sender may delete their own message -- no gosat override
    // here (unlike moderation-remove-media): this is the member's own
    // delete-for-everyone action, not a moderation removal.
    if (message.sender_id !== callerId) {
      return json({ error: "forbidden", message: "Only the sender can delete this message." }, 403);
    }

    let objectDeleted = false;
    if (message.file_url) {
      const parsed = parseStorageUrl(message.file_url);
      if (parsed) {
        const { error: delErr } = await service.storage.from(parsed.bucket).remove([parsed.path]);
        if (delErr) {
          console.error("delete-chat-message: storage delete failed", delErr);
          return json({ error: "storage_delete_failed", detail: delErr.message }, 500);
        }
        objectDeleted = true;
      }
    }

    const { error: updErr } = await service
      .from("chat_messages")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: callerId,
        content: null,
        file_url: null,
        file_name: null,
        file_type: null,
        file_size: null,
      })
      .eq("id", payload.messageId);
    if (updErr) return json({ error: "update_failed", detail: updErr.message }, 500);

    return json({ ok: true, objectDeleted });
  } catch (err) {
    console.error("delete-chat-message error", err);
    return json({ error: "unexpected", detail: String(err) }, 500);
  }
});
