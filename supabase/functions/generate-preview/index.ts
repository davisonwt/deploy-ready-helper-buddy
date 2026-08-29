// Generates a real 45-second preview clip server-side for a just-uploaded
// seed file, and stores it as its own object in the public seed-previews
// bucket — spec-seed-protection.md Phase 1 ("a real 45-second audio file,
// a separate object, publicly readable"), landing via the new /sow/music
// form per spec-sowing-forms.md.
//
// Trimming is pure byte-level (WAV/MP3 only — see _shared/audioTrim.ts);
// there is no ffmpeg or audio decoder available in this runtime. If the
// upload isn't one of those two formats, this returns an error rather than
// publish without a preview — "If preview generation fails, the upload
// fails" (spec-seed-protection.md).
//
// Auth: real user session only — a sower generates the preview for their
// own just-uploaded file, never on someone else's behalf.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { trimAudio } from "../_shared/audioTrim.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Mirrors src/lib/media/previewLength.ts's PREVIEW_SECONDS — a different
// runtime (this is Deno, that's Vite/React), so the constant can't be
// shared directly; keep both in sync by hand if this ever changes.
const PREVIEW_SECONDS = 45;

const SOURCE_BUCKETS = new Set(["premium-room"]);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) return json({ error: "unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const bucket = typeof body?.bucket === "string" ? body.bucket : "";
    const path = typeof body?.path === "string" ? body.path : "";
    if (!bucket || !path) return json({ error: "missing_bucket_or_path" }, 400);
    if (!SOURCE_BUCKETS.has(bucket)) return json({ error: "unsupported_source_bucket" }, 400);
    // The uploaded file must live under the caller's own folder — same
    // ownership shape every other upload path in this codebase uses
    // (products/{user_id}/..., covers/{user_id}/...).
    if (!path.includes(`/${userId}/`)) return json({ error: "forbidden" }, 403);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const { data: fileBlob, error: downloadErr } = await admin.storage.from(bucket).download(path);
    if (downloadErr || !fileBlob) {
      return json({ error: "source_file_not_found", detail: downloadErr?.message }, 404);
    }
    const inputBytes = new Uint8Array(await fileBlob.arrayBuffer());

    const trimmed = trimAudio(inputBytes, PREVIEW_SECONDS);
    if (!trimmed) {
      return json({
        error: "unsupported_preview_format",
        message: "We can only generate a preview from WAV or MP3 right now — please upload one of those formats.",
      }, 422);
    }

    const previewPath = `${userId}/${Date.now()}.${trimmed.extension}`;
    const { error: uploadErr } = await admin.storage
      .from("seed-previews")
      .upload(previewPath, trimmed.bytes, { contentType: trimmed.mimeType, upsert: false });
    if (uploadErr) {
      return json({ error: "preview_upload_failed", detail: uploadErr.message }, 500);
    }

    const { data: publicUrl } = admin.storage.from("seed-previews").getPublicUrl(previewPath);
    return json({ previewUrl: publicUrl.publicUrl });
  } catch (err) {
    console.error("generate-preview error", err);
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
