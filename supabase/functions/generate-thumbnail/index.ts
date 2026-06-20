// generate-thumbnail
// Replicate FLUX.1 [schnell] (Apache 2.0). Replaces removed DALL-E 3 path.
// Output is persisted to the `ai-generations` storage bucket because
// replicate.delivery URLs expire ~1h after generation.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { checkRateLimit, createRateLimitResponse } from "../_shared/rateLimiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FLUX_MODEL = "black-forest-labs/flux-schnell";
const COST_USD = 0.003;

// Per-tier daily image cap
const IMAGE_CAPS: Record<string, number> = {
  sower: 5,
  keeper: 15,
  ambassador: 40,
  council: 9999,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { productDescription, style, customPrompt, confirmed, aspectRatio } = await req.json();

    if (!confirmed) {
      return json({
        requiresConfirmation: true,
        message: `Image generation will use ~$${COST_USD.toFixed(3)} of credits. Do you want to proceed?`,
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return json({ error: "Authentication required" }, 401);

    // Tier gate — fail closed if no profile row.
    const { data: tier } = await supabase.rpc("get_effective_tier", { _user: user.id });
    const effectiveTier = (tier as string) || "sower";
    const dailyCap = IMAGE_CAPS[effectiveTier] ?? IMAGE_CAPS.sower;

    // Hourly rate limit (existing pattern).
    const ok = await checkRateLimit(supabase, user.id, "ai_generation", 10, 60);
    if (!ok) return createRateLimitResponse(3600);

    // Daily AI usage cap (images count as 2 units).
    const { data: usageToday } = await supabase.rpc("get_ai_usage_today", { user_id_param: user.id });
    if ((usageToday ?? 0) >= dailyCap - 1) {
      return json({ error: `Daily image limit reached for your tier (${effectiveTier}).` }, 429);
    }

    const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
    if (!REPLICATE_API_TOKEN) return json({ error: "Image generation not configured" }, 500);

    const imagePrompt =
      customPrompt ||
      `Eye-catching marketing thumbnail for "${productDescription}". Style: ${style ?? "warm, natural, photographic"}. High contrast, clear focal point, no text overlay. Agricultural / tribal / homegrown vibe. Authentic and inviting.`;

    console.log("[generate-thumbnail] calling FLUX schnell");
    const createRes = await fetch(
      `https://api.replicate.com/v1/models/${FLUX_MODEL}/predictions`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({
          input: {
            prompt: imagePrompt,
            aspect_ratio: aspectRatio || "16:9",
            num_outputs: 1,
            output_format: "webp",
            output_quality: 90,
            go_fast: true,
            megapixels: "1",
          },
        }),
      },
    );

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("[generate-thumbnail] Replicate error", createRes.status, errText);
      return json({ error: "Image generation failed", detail: errText.slice(0, 500) }, 502);
    }

    const pred = await createRes.json();
    let outputUrl: string | null =
      Array.isArray(pred.output) ? pred.output[0] : (typeof pred.output === "string" ? pred.output : null);

    // If still processing (wait timed out), poll briefly.
    if (!outputUrl && pred.id && pred.status !== "failed") {
      outputUrl = await pollOnce(pred.id, REPLICATE_API_TOKEN, 6, 2500);
    }

    if (!outputUrl) {
      return json({ error: "Image generation did not complete in time" }, 504);
    }

    // Persist to Storage so the URL doesn't expire.
    let publicUrl = outputUrl;
    try {
      const imgRes = await fetch(outputUrl);
      const bytes = new Uint8Array(await imgRes.arrayBuffer());
      const path = `thumbnails/${user.id}/${crypto.randomUUID()}.webp`;
      const { error: upErr } = await supabase.storage
        .from("ai-generations")
        .upload(path, bytes, { contentType: "image/webp", upsert: false });
      if (upErr) {
        console.warn("[generate-thumbnail] storage upload failed, returning raw URL", upErr.message);
      } else {
        const { data: pub } = supabase.storage.from("ai-generations").getPublicUrl(path);
        publicUrl = pub.publicUrl;
      }
    } catch (e) {
      console.warn("[generate-thumbnail] persistence failed", (e as Error).message);
    }

    // Bump usage (images = 2 units, keeping existing rule).
    await supabase.rpc("increment_ai_usage", { user_id_param: user.id });
    await supabase.rpc("increment_ai_usage", { user_id_param: user.id });

    const { data: creation, error: dbError } = await supabase
      .from("ai_creations")
      .insert({
        user_id: user.id,
        content_type: "thumbnail",
        title: `Thumbnail: ${(productDescription ?? customPrompt ?? "untitled").toString().substring(0, 40)}`,
        image_url: publicUrl,
        product_description: productDescription ?? null,
        style: style ?? null,
        custom_prompt: customPrompt ?? null,
        metadata: {
          generated_at: new Date().toISOString(),
          model: FLUX_MODEL,
          replicate_id: pred.id,
          original_url: outputUrl,
          aspect_ratio: aspectRatio || "16:9",
          tier: effectiveTier,
          cost_usd_estimate: COST_USD,
        },
      })
      .select()
      .single();

    if (dbError) {
      console.error("[generate-thumbnail] DB insert failed", dbError);
      // Still return the image — generation succeeded.
    }

    // Audit log
    try {
      await supabase.from("s2g_companion_runs").insert({
        user_id: user.id,
        companion_slug: "willow",
        action: "image",
        kind: "image",
        artifact_url: publicUrl,
        cost_usd_estimate: COST_USD,
        replicate_prediction_id: pred.id,
        status: "ok",
      });
    } catch (_) {/* best-effort */}

    return json({
      imageUrl: publicUrl,
      creation,
      model: FLUX_MODEL,
      cost_usd_estimate: COST_USD,
      tier: effectiveTier,
    });
  } catch (error) {
    console.error("[generate-thumbnail] error", error);
    return json({ error: "Unexpected error", detail: (error as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function pollOnce(
  id: string,
  token: string,
  attempts: number,
  intervalMs: number,
): Promise<string | null> {
  for (let i = 0; i < attempts; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Token ${token}` },
    });
    if (!r.ok) continue;
    const p = await r.json();
    if (p.status === "succeeded") {
      return Array.isArray(p.output) ? p.output[0] : (typeof p.output === "string" ? p.output : null);
    }
    if (p.status === "failed" || p.status === "canceled") return null;
  }
  return null;
}
