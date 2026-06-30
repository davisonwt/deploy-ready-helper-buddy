// get-or-generate-calendar-art
// Returns a cached seasonal image for (region_key, scriptural_month), or generates
// a new one through Lovable AI Gateway and caches it. One image per region/month
// is reused across all users in that region — never regenerated per-user.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-my-custom-header",
};

const IMAGE_MODEL = "openai/gpt-image-2";
const REPLICATE_MODEL = "black-forest-labs/flux-schnell";

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

function fallbackSvgDataUrl(scriptural_month: number, season_label: string, region_description: string): string {
  const palettes: Record<string, { sky: string; glow: string; land: string; water: string; flower: string; accent: string }> = {
    spring: { sky: '#8fd7ff', glow: '#fff0a8', land: '#2f8b57', water: '#4ab5c9', flower: '#f7a8c8', accent: '#ffffff' },
    summer: { sky: '#4fb4ff', glow: '#ffd36e', land: '#4f8f2f', water: '#147c9a', flower: '#ffe07a', accent: '#fff7d6' },
    autumn: { sky: '#f0a35b', glow: '#ffe2a3', land: '#8f4d22', water: '#6aa0aa', flower: '#d85d2a', accent: '#f9d28b' },
    winter: { sky: '#91b8d8', glow: '#f4f8ff', land: '#4b6f62', water: '#355e78', flower: '#d9eef8', accent: '#ffffff' },
    wet: { sky: '#5fb6b8', glow: '#e6ffd3', land: '#1f7d4a', water: '#2f9fb3', flower: '#f8d36a', accent: '#e9fff4' },
    dry: { sky: '#eead6b', glow: '#fff1b8', land: '#9a6b32', water: '#6eb0c0', flower: '#f2c35c', accent: '#fff7df' },
    'polar-day': { sky: '#9fdcff', glow: '#ffffff', land: '#cfe9f7', water: '#6eb8d6', flower: '#b7dfff', accent: '#ffffff' },
    'polar-night': { sky: '#17274d', glow: '#96fff0', land: '#d8eef8', water: '#283f66', flower: '#b6fff2', accent: '#ffffff' },
  };
  const p = palettes[season_label] ?? palettes.autumn;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1200"><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky}"/><stop offset=".62" stop-color="${p.glow}"/><stop offset="1" stop-color="${p.land}"/></linearGradient><radialGradient id="sun" cx="50%" cy="28%" r="26%"><stop offset="0" stop-color="${p.accent}"/><stop offset=".45" stop-color="${p.glow}" stop-opacity=".72"/><stop offset="1" stop-color="${p.glow}" stop-opacity="0"/></radialGradient><linearGradient id="water" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.water}"/><stop offset="1" stop-color="${p.sky}" stop-opacity=".55"/></linearGradient></defs><rect width="900" height="1200" fill="url(#sky)"/><circle cx="450" cy="285" r="245" fill="url(#sun)"/><path d="M0 580 C180 430 290 470 430 330 C580 185 720 300 900 165 L900 1200 L0 1200 Z" fill="#fff" opacity=".26"/><path d="M0 670 C135 535 250 575 385 438 C540 280 704 420 900 280 L900 1200 L0 1200 Z" fill="${p.land}" opacity=".72"/><path d="M0 770 C165 705 300 730 450 650 C620 560 735 620 900 540 L900 1200 L0 1200 Z" fill="#1d3b2d" opacity=".44"/><path d="M92 930 C280 800 514 1040 808 835 C724 1085 308 1145 92 930 Z" fill="url(#water)" opacity=".88"/><text x="54" y="106" font-family="serif" font-size="34" fill="#fff" opacity=".86">Month ${scriptural_month} · ${season_label}</text><text x="54" y="148" font-family="serif" font-size="22" fill="#fff" opacity=".7">${region_description}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
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

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function pollReplicate(id: string, token: string, attempts: number, intervalMs: number): Promise<string | null> {
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

async function generateWithReplicate(prompt: string): Promise<{ bytes: Uint8Array; contentType: string; model: string }> {
  const token = Deno.env.get("REPLICATE_API_TOKEN");
  if (!token) throw new Error("Replicate image generation is not configured");

  let createRes: Response | null = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    createRes = await fetch(`https://api.replicate.com/v1/models/${REPLICATE_MODEL}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
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
    });

    if (createRes.ok) break;
    if (createRes.status !== 429 || attempt === 3) {
      throw new Error((await createRes.text()).slice(0, 500));
    }
    let retryAfter = Number(createRes.headers.get("retry-after") || "10");
    try {
      const body = await createRes.clone().json();
      if (typeof body?.retry_after === "number") retryAfter = body.retry_after;
    } catch { /* header fallback */ }
    await new Promise((r) => setTimeout(r, Math.max(8, retryAfter) * 1000));
  }

  if (!createRes?.ok) throw new Error("Replicate image generation failed");

  const pred = await createRes.json();
  let outputUrl: string | null =
    Array.isArray(pred.output) ? pred.output[0] : (typeof pred.output === "string" ? pred.output : null);
  if (!outputUrl && pred.id && pred.status !== "failed") {
    outputUrl = await pollReplicate(pred.id, token, 10, 3000);
  }
  if (!outputUrl) throw new Error("Replicate image generation did not complete in time");

  const imgRes = await fetch(outputUrl);
  if (!imgRes.ok) throw new Error("Generated image download failed");
  return { bytes: new Uint8Array(await imgRes.arrayBuffer()), contentType: "image/webp", model: REPLICATE_MODEL };
}

async function generateCalendarImage(prompt: string): Promise<{ bytes: Uint8Array; contentType: string; model: string }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (LOVABLE_API_KEY) {
    const createRes = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt,
        size: "1024x1536",
        quality: "low",
        n: 1,
      }),
    });

    if (createRes.ok) {
      const generated = await createRes.json();
      const b64 = generated?.data?.[0]?.b64_json;
      if (b64 && typeof b64 === "string") {
        return { bytes: base64ToBytes(b64), contentType: "image/png", model: IMAGE_MODEL };
      }
    } else {
      const errText = await createRes.text();
      console.warn("[calendar-art] AI Gateway failed, trying Replicate", createRes.status, errText.slice(0, 300));
    }
  }

  return await generateWithReplicate(prompt);
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

    // 2. Build prompt — stunning, gallery-grade seasonal nature art
    const prompt =
      `Breathtaking, award-winning fine-art nature photograph of a ${season_label} landscape in ${region_description}. ` +
      `Sweeping vista, dramatic golden-hour light, rich atmospheric depth, volumetric haze, ` +
      `cinematic composition with strong foreground, mid-ground and distant mountains or horizon, ` +
      `vivid seasonal flora and authentic local ecosystem appropriate to scriptural month ${scriptural_month}, ` +
      `hyper-detailed, ultra-sharp, 8k, National Geographic quality, painterly yet photoreal, ` +
      `serene and majestic, no people, no text, no watermarks, no logos, ` +
      `vertical wall-calendar composition with clear sky area at lower portion for date grid.`;

    // 3. Generate and persist to public app storage so calendar, diary and journal can render it.
    let generatedImage: { bytes: Uint8Array; contentType: string; model: string } | null = null;
    try {
      generatedImage = await generateCalendarImage(prompt);
    } catch (e) {
      console.warn("[calendar-art] paid image generation unavailable; returning fallback art", (e as Error).message);
      return json({
        imageUrl: fallbackSvgDataUrl(scriptural_month, season_label, region_description),
        cached: false,
        fallback: true,
      });
    }
    const extension = generatedImage.contentType === "image/webp" ? "webp" : "png";
    const storagePath = `calendar-art/${region_key.replace(":", "_")}/${scriptural_month}.${extension}`;
    const { error: upErr } = await supabase.storage
      .from("ai-generations")
      .upload(storagePath, generatedImage.bytes, { contentType: generatedImage.contentType, upsert: true });
    if (upErr) {
      console.error("[calendar-art] storage upload failed", upErr.message);
      return json({ error: "Calendar art storage failed", detail: upErr.message }, 500);
    }
    const { data: pub } = supabase.storage.from("ai-generations").getPublicUrl(storagePath);
    const publicUrl = pub.publicUrl;

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
        model: generatedImage.model,
      }, { onConflict: "region_key,scriptural_month", ignoreDuplicates: true });
    if (insErr) console.warn("[calendar-art] cache insert failed", insErr.message);

    return json({ imageUrl: publicUrl, cached: false });
  } catch (error) {
    console.error("[calendar-art] error", error);
    return json({ error: "Unexpected error", detail: (error as Error).message }, 500);
  }
});
