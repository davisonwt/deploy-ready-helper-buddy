// get-or-generate-calendar-art
// Returns a cached seasonal image for (region_key, scriptural_month), or generates
// a new one via Replicate FLUX schnell and caches it. One image per region/month
// is reused across all users in that region — never regenerated per-user.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FLUX_MODEL = "black-forest-labs/flux-schnell";

interface ReqBody {
  region_key: string;        // e.g. "S:subtropical"
  scriptural_month: number;  // 1-12
  season_label: string;      // e.g. "winter", "wet", "polar-day"
  region_description: string;// human prompt fragment, e.g. "Southern hemisphere subtropical"
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validate(b: unknown): ReqBody | null {
  if (!b || typeof b !== "object") return null;
  const o = b as Record<string, unknown>;
  if (
    typeof o.region_key !== "string" || !/^[NS]:(tropical|subtropical|temperate|boreal|polar)$/.test(o.region_key) ||
    typeof o.scriptural_month !== "number" || o.scriptural_month < 1 || o.scriptural_month > 12 ||
    typeof o.season_label !== "string" || o.season_label.length === 0 ||
    typeof o.region_description !== "string" || o.region_description.length === 0
  ) return null;
  return o as unknown as ReqBody;
}

async function pollOnce(id: string, token: string, attempts: number, intervalMs: number): Promise<string | null> {
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const parsed = validate(await req.json().catch(() => null));
    if (!parsed) return json({ error: "Invalid request body" }, 400);
    const { region_key, scriptural_month, season_label, region_description } = parsed;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Cache hit?
    const { data: cached } = await supabase
      .from("seasonal_calendar_art")
      .select("image_url, season_label, scriptural_month, region_key")
      .eq("region_key", region_key)
      .eq("scriptural_month", scriptural_month)
      .maybeSingle();

    if (cached?.image_url) {
      return json({ imageUrl: cached.image_url, cached: true });
    }

    const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
    if (!REPLICATE_API_TOKEN) return json({ error: "Image generation not configured" }, 500);

    // 2. Build prompt
    const prompt =
      `Photorealistic ${season_label} landscape, ${region_description}, ` +
      `scriptural month ${scriptural_month}, soft natural light, ` +
      `no text, no people, calendar wall-art composition, painterly, serene.`;

    // 3. Call FLUX (matching generate-thumbnail/index.ts pattern)
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
            prompt,
            aspect_ratio: "3:4",
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
      console.error("[calendar-art] Replicate error", createRes.status, errText);
      return json({ error: "Image generation failed", detail: errText.slice(0, 500) }, 502);
    }

    const pred = await createRes.json();
    let outputUrl: string | null =
      Array.isArray(pred.output) ? pred.output[0] : (typeof pred.output === "string" ? pred.output : null);
    if (!outputUrl && pred.id && pred.status !== "failed") {
      outputUrl = await pollOnce(pred.id, REPLICATE_API_TOKEN, 8, 2500);
    }
    if (!outputUrl) return json({ error: "Image generation did not complete in time" }, 504);

    // 4. Persist to storage so URL doesn't expire
    const storagePath = `calendar-art/${region_key.replace(":", "_")}/${scriptural_month}.webp`;
    let publicUrl = outputUrl;
    try {
      const imgRes = await fetch(outputUrl);
      const bytes = new Uint8Array(await imgRes.arrayBuffer());
      const { error: upErr } = await supabase.storage
        .from("ai-generations")
        .upload(storagePath, bytes, { contentType: "image/webp", upsert: true });
      if (upErr) {
        console.warn("[calendar-art] storage upload failed, using raw URL", upErr.message);
      } else {
        const { data: pub } = supabase.storage.from("ai-generations").getPublicUrl(storagePath);
        publicUrl = pub.publicUrl;
      }
    } catch (e) {
      console.warn("[calendar-art] persistence failed", (e as Error).message);
    }

    // 5. Insert cache row (ON CONFLICT DO NOTHING via upsert + ignoreDuplicates)
    const { error: insErr } = await supabase
      .from("seasonal_calendar_art")
      .upsert({
        region_key,
        scriptural_month,
        season_label,
        image_url: publicUrl,
        storage_path: storagePath,
        prompt,
        model: FLUX_MODEL,
      }, { onConflict: "region_key,scriptural_month", ignoreDuplicates: true });
    if (insErr) console.warn("[calendar-art] cache insert failed", insErr.message);

    return json({ imageUrl: publicUrl, cached: false });
  } catch (error) {
    console.error("[calendar-art] error", error);
    return json({ error: "Unexpected error", detail: (error as Error).message }, 500);
  }
});
