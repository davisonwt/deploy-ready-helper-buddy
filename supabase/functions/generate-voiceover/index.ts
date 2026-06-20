// generate-voiceover
// Kokoro-82M via Replicate (Apache 2.0). Text-to-speech for Birch's reel scripts.
// Persists the resulting audio to the `ai-generations` storage bucket.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Kokoro-82M wrapper on Replicate. Pin a known version hash to avoid drift.
const KOKORO_VERSION = "f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13";
const COST_USD_PER_REQUEST = 0.01; // ~ rough upper bound for short clips

const VOICE_CAPS: Record<string, number> = {
  sower: 2,
  keeper: 10,
  ambassador: 25,
  council: 9999,
};

// Promo safety ceiling (per user/day) when companion promo is active.
const PROMO_PER_USER_VOICE_CAP = 100;

const ALLOWED_VOICES = new Set([
  "af_bella",
  "af_nicole",
  "af_sarah",
  "af_sky",
  "am_adam",
  "am_michael",
  "bf_emma",
  "bf_isabella",
  "bm_george",
  "bm_lewis",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      generation_id,
      text,
      voice,
      speed,
    }: {
      generation_id?: string;
      text: string;
      voice?: string;
      speed?: number;
    } = await req.json();

    if (!text || typeof text !== "string") return json({ error: "text required" }, 400);
    if (text.length > 2000) return json({ error: "text too long (max 2000 chars)" }, 400);

    const selectedVoice = voice && ALLOWED_VOICES.has(voice) ? voice : "af_bella";
    const selectedSpeed = typeof speed === "number" && speed >= 0.5 && speed <= 2.0 ? speed : 1.0;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return json({ error: "Invalid user token" }, 401);

    const { data: tier } = await supabase.rpc("get_effective_tier", { _user: user.id });
    const effectiveTier = (tier as string) || "sower";
    const dailyCap = VOICE_CAPS[effectiveTier] ?? VOICE_CAPS.sower;

    // Daily voice cap
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count: voiceUsed } = await supabase
      .from("s2g_companion_runs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("kind", "voice")
      .gte("created_at", since);
    if ((voiceUsed ?? 0) >= dailyCap) {
      return json(
        { error: `Daily voiceover limit reached for your tier (${effectiveTier}).` },
        429,
      );
    }

    // Birch monthly quota (voiceovers share Birch's bucket — see plan §8 default).
    const { data: quota } = await supabase.rpc("check_and_consume_companion_quota", {
      _user: user.id,
      _slug: "birch",
    });
    if (quota && (quota as any).allowed === false) {
      return json({ error: "Monthly Reel Keeper quota exhausted" }, 402);
    }

    const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
    if (!REPLICATE_API_TOKEN) return json({ error: "Voice service not configured" }, 500);

    console.log(`[generate-voiceover] kokoro for user ${user.id}, ${text.length} chars`);
    const createRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({
        version: KOKORO_VERSION,
        input: {
          text,
          voice: selectedVoice,
          speed: selectedSpeed,
        },
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error("[generate-voiceover] Replicate error", createRes.status, errText);
      return json({ error: "Voice generation failed", detail: errText.slice(0, 500) }, 502);
    }

    const pred = await createRes.json();
    let outputUrl: string | null =
      typeof pred.output === "string"
        ? pred.output
        : Array.isArray(pred.output)
          ? pred.output[0]
          : null;

    if (!outputUrl && pred.id && pred.status !== "failed") {
      outputUrl = await pollOnce(pred.id, REPLICATE_API_TOKEN, 12, 2500);
    }
    if (!outputUrl) return json({ error: "Voice generation did not complete in time" }, 504);

    // Persist
    let publicUrl = outputUrl;
    let contentType = "audio/wav";
    try {
      const aRes = await fetch(outputUrl);
      contentType = aRes.headers.get("content-type") || "audio/wav";
      const ext = contentType.includes("mpeg") ? "mp3" : contentType.includes("mp4") ? "m4a" : "wav";
      const bytes = new Uint8Array(await aRes.arrayBuffer());
      const path = `voiceovers/${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("ai-generations")
        .upload(path, bytes, { contentType, upsert: false });
      if (!upErr) {
        publicUrl = supabase.storage.from("ai-generations").getPublicUrl(path).data.publicUrl;
      } else {
        console.warn("[generate-voiceover] storage upload failed", upErr.message);
      }
    } catch (e) {
      console.warn("[generate-voiceover] persist failed", (e as Error).message);
    }

    // Optionally update the existing ai_creations row.
    if (generation_id) {
      await supabase
        .from("ai_creations")
        .update({
          metadata: {
            status: "completed",
            audio_url: publicUrl,
            voice: selectedVoice,
            speed: selectedSpeed,
            model: `kokoro-82m@${KOKORO_VERSION.slice(0, 12)}`,
            prediction_id: pred.id,
            completed_at: new Date().toISOString(),
          },
        })
        .eq("id", generation_id);
    }

    try {
      await supabase.from("s2g_companion_runs").insert({
        user_id: user.id,
        companion_slug: "birch",
        action: "voice",
        kind: "voice",
        artifact_url: publicUrl,
        cost_usd_estimate: COST_USD_PER_REQUEST,
        replicate_prediction_id: pred.id,
        status: "ok",
      });
    } catch (_) {/* ignore */}

    return json({
      success: true,
      audio_url: publicUrl,
      voice: selectedVoice,
      speed: selectedSpeed,
      model: "kokoro-82m",
      cost_usd_estimate: COST_USD_PER_REQUEST,
      tier: effectiveTier,
    });
  } catch (error) {
    console.error("[generate-voiceover] error", error);
    return json({ error: (error as Error).message }, 500);
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
      return typeof p.output === "string"
        ? p.output
        : Array.isArray(p.output)
          ? p.output[0]
          : null;
    }
    if (p.status === "failed" || p.status === "canceled") return null;
  }
  return null;
}
