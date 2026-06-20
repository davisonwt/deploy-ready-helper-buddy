// generate-video
// Wan 2.2 (Apache 2.0) via Replicate. i2v-fast when image_url provided, else t2v-fast.
// Persists the resulting MP4 to the `ai-generations` storage bucket
// (Replicate CDN URLs expire ~1h).

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL_I2V = "wan-video/wan-2.2-i2v-fast";
const MODEL_T2V = "wan-video/wan-2.2-t2v-fast";
const COST_USD_I2V = 0.08;
const COST_USD_T2V = 0.10;

const VIDEO_CAPS: Record<string, number> = {
  sower: 1,
  keeper: 3,
  ambassador: 8,
  council: 9999,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      generation_id,
      prompt,
      image_url,
      resolution,
      num_frames,
    }: {
      generation_id: string;
      prompt: string;
      image_url?: string;
      resolution?: "480p" | "720p";
      num_frames?: number;
    } = await req.json();

    if (!generation_id || !prompt) {
      return json({ error: "generation_id and prompt are required" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return json({ error: "Invalid user token" }, 401);

    // Tier gate
    const { data: tier } = await supabase.rpc("get_effective_tier", { _user: user.id });
    const effectiveTier = (tier as string) || "sower";
    const dailyCap = VIDEO_CAPS[effectiveTier] ?? VIDEO_CAPS.sower;

    // Count today's video generations for this user (kind='video' in companion_runs)
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count: videoUsed } = await supabase
      .from("s2g_companion_runs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("kind", "video")
      .gte("created_at", since);
    if ((videoUsed ?? 0) >= dailyCap) {
      return json(
        { error: `Daily video limit reached for your tier (${effectiveTier}). Resets in 24h.` },
        429,
      );
    }

    // Birch monthly quota (chat + costly actions share the budget).
    const { data: quota } = await supabase.rpc("check_and_consume_companion_quota", {
      _user: user.id,
      _slug: "birch",
    });
    if (quota && (quota as any).allowed === false) {
      return json({ error: "Monthly Reel Keeper quota exhausted" }, 402);
    }

    const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
    if (!REPLICATE_API_TOKEN) return json({ error: "Video service not configured" }, 500);

    const useI2V = !!image_url;
    const model = useI2V ? MODEL_I2V : MODEL_T2V;
    const costEstimate = useI2V ? COST_USD_I2V : COST_USD_T2V;

    // Mark processing in ai_creations
    await supabase
      .from("ai_creations")
      .update({
        metadata: {
          status: "processing",
          started_at: new Date().toISOString(),
          model,
          tier: effectiveTier,
        },
      })
      .eq("id", generation_id);

    // Create prediction (model-scoped endpoint, no version hash).
    const input: Record<string, unknown> = {
      prompt,
      num_frames: num_frames ?? 81, // ~5s at 16fps
      fps: 16,
      resolution: resolution ?? "480p",
    };
    if (useI2V) input.image = image_url;

    console.log(`[generate-video] starting ${model} for user ${user.id}`);
    const createRes = await fetch(
      `https://api.replicate.com/v1/models/${model}/predictions`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
      },
    );

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("[generate-video] Replicate create error", createRes.status, errText);
      await supabase
        .from("ai_creations")
        .update({
          metadata: {
            status: "failed",
            error: errText.slice(0, 500),
            failed_at: new Date().toISOString(),
          },
        })
        .eq("id", generation_id);
      return json({ error: "Failed to start video generation", detail: errText.slice(0, 500) }, 502);
    }

    const pred = await createRes.json();

    // EdgeRuntime.waitUntil so polling continues after we respond.
    // @ts-ignore — EdgeRuntime is provided by the Deno deploy environment.
    EdgeRuntime.waitUntil(
      pollAndPersist({
        supabase,
        token: REPLICATE_API_TOKEN,
        predictionId: pred.id,
        generationId: generation_id,
        userId: user.id,
        model,
        costEstimate,
      }),
    );

    return json({
      success: true,
      prediction_id: pred.id,
      generation_id,
      model,
      cost_usd_estimate: costEstimate,
      tier: effectiveTier,
      message: "Video generation started. Poll ai_creations.metadata.status for completion.",
    });
  } catch (error) {
    console.error("[generate-video] error", error);
    return json({ error: (error as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function pollAndPersist(args: {
  supabase: ReturnType<typeof createClient>;
  token: string;
  predictionId: string;
  generationId: string;
  userId: string;
  model: string;
  costEstimate: number;
}) {
  const { supabase, token, predictionId, generationId, userId, model, costEstimate } = args;
  const maxMs = 8 * 60 * 1000;
  const started = Date.now();
  let interval = 3000;

  while (Date.now() - started < maxMs) {
    await new Promise((r) => setTimeout(r, interval));
    interval = Math.min(interval + 1000, 8000);

    let r: Response;
    try {
      r = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
        headers: { Authorization: `Token ${token}` },
      });
    } catch (_) {
      continue;
    }
    if (!r.ok) continue;
    const p = await r.json();

    if (p.status === "succeeded") {
      const outputUrl: string | null = Array.isArray(p.output)
        ? p.output[0]
        : (typeof p.output === "string" ? p.output : null);

      if (!outputUrl) {
        await supabase
          .from("ai_creations")
          .update({
            metadata: {
              status: "failed",
              error: "No output URL from model",
              prediction_id: predictionId,
            },
          })
          .eq("id", generationId);
        return;
      }

      // Persist
      let publicUrl = outputUrl;
      try {
        const vidRes = await fetch(outputUrl);
        const bytes = new Uint8Array(await vidRes.arrayBuffer());
        const path = `videos/${userId}/${crypto.randomUUID()}.mp4`;
        const { error: upErr } = await supabase.storage
          .from("ai-generations")
          .upload(path, bytes, { contentType: "video/mp4", upsert: false });
        if (!upErr) {
          publicUrl = supabase.storage.from("ai-generations").getPublicUrl(path).data.publicUrl;
        } else {
          console.warn("[generate-video] storage upload failed", upErr.message);
        }
      } catch (e) {
        console.warn("[generate-video] persist failed", (e as Error).message);
      }

      await supabase
        .from("ai_creations")
        .update({
          metadata: {
            status: "completed",
            video_url: publicUrl,
            original_url: outputUrl,
            prediction_id: predictionId,
            model,
            completed_at: new Date().toISOString(),
          },
        })
        .eq("id", generationId);

      try {
        await supabase.from("s2g_companion_runs").insert({
          user_id: userId,
          companion_slug: "birch",
          action: "video",
          kind: "video",
          artifact_url: publicUrl,
          cost_usd_estimate: costEstimate,
          replicate_prediction_id: predictionId,
          status: "ok",
        });
      } catch (_) {/* ignore */}
      return;
    }

    if (p.status === "failed" || p.status === "canceled") {
      await supabase
        .from("ai_creations")
        .update({
          metadata: {
            status: "failed",
            error: String(p.error ?? "Generation failed").slice(0, 500),
            prediction_id: predictionId,
            failed_at: new Date().toISOString(),
          },
        })
        .eq("id", generationId);
      try {
        await supabase.from("s2g_companion_runs").insert({
          user_id: userId,
          companion_slug: "birch",
          action: "video",
          kind: "video",
          replicate_prediction_id: predictionId,
          status: "error",
          error: String(p.error ?? "").slice(0, 500),
        });
      } catch (_) {/* ignore */}
      return;
    }
    // else still 'starting'/'processing'
  }

  // Timed out
  await supabase
    .from("ai_creations")
    .update({
      metadata: {
        status: "failed",
        error: "Generation timed out after 8 minutes",
        prediction_id: predictionId,
      },
    })
    .eq("id", generationId);
}
