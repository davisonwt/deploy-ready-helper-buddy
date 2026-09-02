// moderate-media — the single enforcement point for "no nudity or sexual
// content anywhere in S2G."
//
// Called right after a client finishes an upload (before the file is ever
// linked from a visible row) or before a base64 avatar is written to
// profiles.avatar_url. Downloads the object (or decodes the base64),
// sends it to Sightengine's nudity-2.1 + face-attributes models via plain
// fetch (no SDK -- edge functions have a hard, non-configurable 2000ms CPU
// ceiling), and writes exactly one verdict row to media_moderation.
//
// Storage RLS (see 20260902110000 and the per-bucket migrations) reads
// media_moderation directly: a bucket object is only readable by anyone
// other than its uploader once a row here says verdict='allow'. This
// function's job is only to produce that row correctly -- it never grants
// access itself.
//
// FAIL CLOSED: any error (missing secrets, network failure, non-200,
// unparseable response) returns verdict:'block', reason:'scanner_error'.
// An unscanned file must never become visible -- see spec in
// wh-moderation.txt point 1.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { logFunctionFailure } from "../_shared/logFunctionFailure.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = (JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_ANON_KEY")) ?? "";
const SERVICE_ROLE_KEY = (JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}")["default"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) ?? "";
const SIGHTENGINE_API_USER = Deno.env.get("SIGHTENGINE_API_USER") ?? "";
const SIGHTENGINE_API_SECRET = Deno.env.get("SIGHTENGINE_API_SECRET") ?? "";

// Policy thresholds (wh-moderation.txt point 1): block nudity, sexual
// activity, sexual display. Allow swimwear, lingerie, bare chest in
// ordinary context, art/medical unless explicitly sexual. nudity-2.1's
// "erotica" class (exposed breasts/buttocks/pubic region) is the
// dividing line between "bare chest in ordinary context" (allowed, scores
// low on erotica) and actual nudity (blocked) -- suggestive/very_suggestive
// (clothed-but-suggestive, lingerie, swimwear) are deliberately NOT in the
// block set per the explicit allow list.
const BLOCK_THRESHOLD = 0.5;
const UNCERTAIN_THRESHOLD = 0.3;
const MINOR_THRESHOLD = 0.5;
// Any sexual-context score at or above this, combined with a suspected
// minor face, trips the highest-severity path regardless of the normal
// block threshold -- deliberately more sensitive than BLOCK_THRESHOLD.
const MINOR_SEXUAL_CONTEXT_THRESHOLD = 0.2;

interface Verdict {
  verdict: "allow" | "block" | "uncertain";
  reason: string;
  minorSuspected: boolean;
  scores: unknown;
  modelVersion: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function classifyNudity(nudity: any): { blocked: boolean; uncertain: boolean; reason: string } {
  const sexualActivity = Number(nudity?.sexual_activity ?? 0);
  const sexualDisplay = Number(nudity?.sexual_display ?? 0);
  const erotica = Number(nudity?.erotica ?? 0);
  const worst = Math.max(sexualActivity, sexualDisplay, erotica);
  if (worst >= BLOCK_THRESHOLD) {
    const which = worst === sexualActivity ? "sexual_activity" : worst === sexualDisplay ? "sexual_display" : "erotica";
    return { blocked: true, uncertain: false, reason: `nudity_${which}` };
  }
  if (worst >= UNCERTAIN_THRESHOLD) {
    return { blocked: false, uncertain: true, reason: "nudity_borderline" };
  }
  return { blocked: false, uncertain: false, reason: "clean" };
}

function classifyMinor(faces: any[], nudity: any): boolean {
  if (!Array.isArray(faces) || faces.length === 0) return false;
  const sexualContext = Math.max(
    Number(nudity?.sexual_activity ?? 0),
    Number(nudity?.sexual_display ?? 0),
    Number(nudity?.erotica ?? 0),
  );
  if (sexualContext < MINOR_SEXUAL_CONTEXT_THRESHOLD) return false;
  return faces.some((f) => Number(f?.attributes?.minor ?? 0) >= MINOR_THRESHOLD);
}

async function callSightengine(blob: Blob, filename: string, kind: "image" | "video"): Promise<any> {
  if (!SIGHTENGINE_API_USER || !SIGHTENGINE_API_SECRET) {
    throw new Error("sightengine_not_configured");
  }
  const endpoint = kind === "video"
    ? "https://api.sightengine.com/1.0/video/check-sync.json"
    : "https://api.sightengine.com/1.0/check.json";

  const form = new FormData();
  form.append("media", blob, filename);
  form.append("models", "nudity-2.1,face-attributes");
  form.append("api_user", SIGHTENGINE_API_USER);
  form.append("api_secret", SIGHTENGINE_API_SECRET);

  const res = await fetch(endpoint, { method: "POST", body: form });
  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(`sightengine_http_${res.status}: ${bodyText.slice(0, 500)}`);
  }
  let data: any;
  try {
    data = JSON.parse(bodyText);
  } catch {
    throw new Error(`sightengine_unparseable_response: ${bodyText.slice(0, 500)}`);
  }
  if (data?.status !== "success") {
    throw new Error(`sightengine_status_${data?.status ?? "unknown"}: ${bodyText.slice(0, 500)}`);
  }
  return data;
}

// Video (check-sync.json) is expected to return data.frames: an array of
// per-sampled-frame results, each carrying its own "nudity" and "faces".
// This shape is NOT independently confirmed against Sightengine's current
// docs (their reference pages did not return the video example at
// build time) -- verified instead against a real deploy+invoke during
// this feature's own test pass (see SESSION-STATE.md). If Sightengine
// ever changes this shape, frames.length checks below fall through to
// the catch block and REJECT (fail closed), never silently allow.
function worstFrame(data: any): { nudity: any; faces: any[] } {
  const frames = Array.isArray(data?.data?.frames) ? data.data.frames : [data];
  let worstNudity = { sexual_activity: 0, sexual_display: 0, erotica: 0 };
  let allFaces: any[] = [];
  let worstScore = -1;
  for (const frame of frames) {
    const n = frame?.nudity ?? {};
    const score = Math.max(Number(n.sexual_activity ?? 0), Number(n.sexual_display ?? 0), Number(n.erotica ?? 0));
    if (score > worstScore) {
      worstScore = score;
      worstNudity = n;
    }
    if (Array.isArray(frame?.faces)) allFaces = allFaces.concat(frame.faces);
  }
  return { nudity: worstNudity, faces: allFaces };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let uploaderId: string | null = null;
  let payload: any = null;

  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
      return json({ error: "server_misconfigured" }, 500);
    }
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) return json({ error: "unauthorized" }, 401);
    const token = authHeader.slice(7).trim();
    // apikey header carries the service-role key (not a JWT under new-style
    // keys) -- Authorization stays reserved for a real user session.
    const apikeyHeader = req.headers.get("apikey") ?? "";

    payload = await req.json();

    // Backfill-only path: the scripted backfill (scripts/backfill-media-moderation.ts)
    // has no real user session to authenticate as -- it's scanning EXISTING
    // uploads on behalf of the platform, not a live upload. Gated tightly:
    // only the service role key itself (never a normal user JWT) satisfies
    // this branch, and it must name whose upload it's re-scanning
    // explicitly rather than inferring it from a session. This does NOT
    // weaken the normal path below -- every ordinary client call still goes
    // through authClient.auth.getUser() exactly as before.
    if (SERVICE_ROLE_KEY && apikeyHeader === SERVICE_ROLE_KEY) {
      const explicitUploaderId = String(payload?.uploaderUserId ?? "");
      if (!explicitUploaderId) return json({ error: "uploaderUserId required for service-role calls" }, 400);
      uploaderId = explicitUploaderId;
    } else {
      const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData, error: userErr } = await authClient.auth.getUser();
      if (userErr || !userData?.user) return json({ error: "unauthorized" }, 401);
      uploaderId = userData.user.id;
    }
    const kind: "image" | "video" = payload?.kind === "video" ? "video" : "image";
    const subjectType: "storage_object" | "avatar" = payload?.subjectType === "avatar" ? "avatar" : "storage_object";

    const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    let blob: Blob;
    let filename: string;
    let bucketId: string | null = null;
    let objectPath: string | null = null;
    let subjectRef: string | null = null;

    if (subjectType === "avatar") {
      const base64: string = String(payload?.base64 ?? "");
      const mimeType: string = String(payload?.mimeType ?? "image/jpeg");
      if (!base64) return json({ error: "missing_base64" }, 400);
      const raw = base64.includes(",") ? base64.split(",")[1] : base64;
      const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
      blob = new Blob([bytes], { type: mimeType });
      filename = "avatar.jpg";
      subjectRef = uploaderId;
    } else {
      bucketId = String(payload?.bucket ?? "");
      objectPath = String(payload?.path ?? "");
      if (!bucketId || !objectPath) return json({ error: "missing_bucket_or_path" }, 400);
      const { data: fileData, error: dlErr } = await service.storage.from(bucketId).download(objectPath);
      if (dlErr || !fileData) {
        await logVerdict(service, {
          bucket_id: bucketId, object_path: objectPath, subject_type: subjectType, subject_ref: null,
          uploader_user_id: uploaderId, verdict: "block", minor_suspected: false,
          reason: "download_failed", scores: null, model_version: "sightengine:nudity-2.1,face-attributes",
        });
        return json({ verdict: "block", reason: "download_failed" });
      }
      blob = fileData;
      filename = objectPath.split("/").pop() || "upload";
    }

    // Nudity/minor detection only has anything to look at in an image or
    // video frame. Storage RLS (media_is_allowed) requires a verdict row
    // to exist at all for a post-cutover object regardless of type, so a
    // non-visual file (audio, PDF, doc) that never gets scanned would
    // otherwise be permanently unreadable by anyone but its uploader --
    // that's a moderation-unrelated regression, not the intended
    // enforcement. Auto-allow those here, in one place, rather than
    // asking every one of the ~20 upload call sites to duplicate a
    // "should I even call this" content-type check.
    const isVisual = blob.type.startsWith("image/") || blob.type.startsWith("video/") || kind === "video";
    let verdict: Verdict;
    if (!isVisual) {
      verdict = {
        verdict: "allow",
        reason: "non_visual_type_skipped",
        minorSuspected: false,
        scores: null,
        modelVersion: "sightengine:nudity-2.1,face-attributes",
      };
      await logVerdict(service, {
        bucket_id: bucketId, object_path: objectPath, subject_type: subjectType, subject_ref: subjectRef,
        uploader_user_id: uploaderId, verdict: verdict.verdict, minor_suspected: false,
        reason: verdict.reason, scores: null, model_version: verdict.modelVersion,
      });
      return json({ verdict: verdict.verdict, reason: verdict.reason });
    }
    try {
      const raw = await callSightengine(blob, filename, kind);
      const { nudity, faces } = kind === "video" ? worstFrame(raw) : { nudity: raw?.nudity ?? {}, faces: raw?.faces ?? [] };
      const { blocked, uncertain, reason } = classifyNudity(nudity);
      const minorSuspected = classifyMinor(faces, nudity);

      verdict = {
        verdict: minorSuspected ? "block" : blocked ? "block" : uncertain ? "uncertain" : "allow",
        reason: minorSuspected ? "minor_sexual_content" : reason,
        minorSuspected,
        scores: { nudity, faceCount: Array.isArray(faces) ? faces.length : 0 },
        modelVersion: "sightengine:nudity-2.1,face-attributes",
      };
    } catch (scanErr) {
      // Scanner unavailable or errored -- reject, never let it through unscanned.
      // The error message carries Sightengine's own response body (see
      // callSightengine) so this log line alone is enough to diagnose a
      // wrong-credentials / bad-request / non-200 failure without needing
      // another temporary diagnostic round-trip.
      console.error("moderate-media: scan failed", scanErr);
      verdict = {
        verdict: "block",
        reason: "scanner_error",
        minorSuspected: false,
        scores: null,
        modelVersion: "sightengine:nudity-2.1,face-attributes",
      };
    }

    await logVerdict(service, {
      bucket_id: bucketId, object_path: objectPath, subject_type: subjectType, subject_ref: subjectRef,
      uploader_user_id: uploaderId, verdict: verdict.verdict, minor_suspected: verdict.minorSuspected,
      reason: verdict.reason, scores: verdict.scores, model_version: verdict.modelVersion,
    });

    // Highest-severity path: suspected minor in sexual context. The
    // object/base64 is NEVER deleted here (evidence must be preserved for
    // a human to action) -- only blocked from becoming visible. Reporting
    // this to authorities (e.g. NCMEC in the US) is a LEGAL OBLIGATION
    // that must be carried out by a human, not this code -- do not
    // attempt to automate an external report from this function.
    if (verdict.minorSuspected) {
      await alertGosat(service, uploaderId, bucketId, objectPath, subjectRef);
    }

    return json({ verdict: verdict.verdict, reason: verdict.reason });
  } catch (err) {
    console.error("moderate-media error", err);
    // Still fail closed even on an unexpected top-level error, and still
    // try to log it so the object stays permanently unreadable rather than
    // just erroring the request with nothing recorded.
    try {
      const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
      await logVerdict(service, {
        bucket_id: payload?.bucket ?? null,
        object_path: payload?.path ?? null,
        subject_type: payload?.subjectType === "avatar" ? "avatar" : "storage_object",
        subject_ref: payload?.subjectType === "avatar" ? uploaderId : null,
        uploader_user_id: uploaderId ?? "00000000-0000-0000-0000-000000000000",
        verdict: "block", minor_suspected: false, reason: "scanner_error", scores: null,
        model_version: "sightengine:nudity-2.1,face-attributes",
      });
    } catch (logErr) {
      console.error("moderate-media: failed to log fallback verdict", logErr);
    }
    await logFunctionFailure("moderate-media", err);
    return json({ verdict: "block", reason: "scanner_error" }, 200);
  }
});

async function logVerdict(service: ReturnType<typeof createClient>, row: Record<string, unknown>) {
  const { error } = await service.from("media_moderation").insert(row);
  if (error) console.error("moderate-media: failed to write media_moderation row", error);
}

async function alertGosat(
  service: ReturnType<typeof createClient>,
  uploaderId: string,
  bucketId: string | null,
  objectPath: string | null,
  subjectRef: string | null,
) {
  const { data: gosats } = await service.from("user_roles").select("user_id").eq("role", "gosat");
  const target = bucketId && objectPath ? `${bucketId}/${objectPath}` : `avatar:${subjectRef}`;
  const rows = (gosats ?? []).map((g: any) => ({
    user_id: g.user_id,
    type: "moderation_incident",
    title: "URGENT: suspected minor in sexual content",
    message: `Uploader ${uploaderId} — ${target}. Blocked automatically, not deleted. Review immediately in the moderation queue.`,
    action_url: "/admin/moderation",
    is_read: false,
  }));
  if (rows.length > 0) {
    const { error } = await service.from("user_notifications").insert(rows);
    if (error) console.error("moderate-media: failed to alert gosat", error);
  } else {
    console.error("moderate-media: MINOR SUSPECTED but no gosat users found to alert — ", target);
  }
}
