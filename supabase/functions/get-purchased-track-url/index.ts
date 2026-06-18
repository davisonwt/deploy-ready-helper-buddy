// Re-issues a short-lived signed URL for a track the caller has paid for
// (or for the track owner themselves). Used by the buyer to refresh the
// download link after the one delivered in chat expires.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (s: string, d?: unknown) =>
  console.log(`[get-purchased-track-url] ${s}`, d ? JSON.stringify(d) : "");

// Extract the storage object path inside the music-tracks bucket from
// either a full Supabase public/sign URL or a bare path.
function extractPath(fileUrl: string): string | null {
  if (!fileUrl) return null;
  try {
    const u = new URL(fileUrl);
    const marker = "/storage/v1/object/";
    const idx = u.pathname.indexOf(marker);
    if (idx !== -1) {
      const after = u.pathname.substring(idx + marker.length);
      const parts = after.split("/").filter(Boolean);
      // ["public" | "sign" | "authenticated", "<bucket>", ...path]
      const bucketIdx = ["public", "sign", "authenticated"].includes(parts[0]) ? 1 : 0;
      if (parts[bucketIdx] === "music-tracks") {
        return decodeURIComponent(parts.slice(bucketIdx + 1).join("/"));
      }
    }
    return null;
  } catch {
    // Not a URL — treat as bare path
    return fileUrl.replace(/^\/+/, "").replace(/^public\//, "");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const trackId: string | undefined = body?.trackId;
    if (!trackId) {
      return new Response(JSON.stringify({ error: "trackId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load track + owner
    const { data: track, error: trackError } = await service
      .from("dj_music_tracks")
      .select("id, file_url, track_title, radio_djs!inner(user_id)")
      .eq("id", trackId)
      .single();

    if (trackError || !track) {
      return new Response(JSON.stringify({ error: "Track not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ownerUserId = (track as any).radio_djs?.user_id;
    let allowed = ownerUserId === user.id;

    if (!allowed) {
      const { data: purchase } = await service
        .from("music_purchases")
        .select("id")
        .eq("buyer_id", user.id)
        .eq("track_id", trackId)
        .eq("payment_status", "completed")
        .maybeSingle();
      allowed = !!purchase;
    }

    if (!allowed) {
      log("Forbidden", { userId: user.id, trackId });
      return new Response(JSON.stringify({ error: "Not purchased" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const path = extractPath(track.file_url);
    if (!path) {
      return new Response(JSON.stringify({ error: "Track file path could not be resolved" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7-day signed URL for purchased downloads
    const { data: signed, error: signErr } = await service.storage
      .from("music-tracks")
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    if (signErr || !signed?.signedUrl) {
      log("Sign failed", { signErr, path });
      return new Response(JSON.stringify({ error: "Could not create signed URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ url: signed.signedUrl, expiresIn: 60 * 60 * 24 * 7 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    log("Unexpected error", { message: err?.message });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
