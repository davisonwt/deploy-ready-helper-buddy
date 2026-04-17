// Video Forge Agent - kicks off generation when seeds/orchards are inserted
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const COMFYUI_API_URL = Deno.env.get("COMFYUI_API_URL");
const COMFYUI_API_KEY = Deno.env.get("COMFYUI_API_KEY");

const FALLBACK_PROMPT =
  "Cinematic close-up of an artisan farm product, warm golden-hour natural lighting, slow camera dolly, shallow depth of field, rich earth tones, organic textures, hands of a craftsperson gently presenting the item, soft rural background, documentary realism, 24fps film look";
const FALLBACK_NEGATIVE =
  "text, watermark, logo, blurry faces, distorted hands, lowres, oversaturated, neon, cartoon, plastic, artificial lighting";

async function generatePromptWithClaude(item: any) {
  if (!ANTHROPIC_API_KEY) {
    return { prompt: FALLBACK_PROMPT, negative: FALLBACK_NEGATIVE };
  }
  try {
    const sys =
      "You write Wan2.2 text-to-video prompts for the S2G platform: warm earth tones, natural light, slow cinematic movement, artisan/farm aesthetic, close-up product detail, documentary realism. Always return a JSON object with two keys: prompt and negative_prompt. No prose.";
    const userMsg = `Product:
Title: ${item.title || "Untitled"}
Description: ${item.description || "(none)"}
Category: ${item.category || "(none)"}
Has image: ${(item.images?.length ?? 0) > 0 ? "yes" : "no"}

Write a 6-10 second cinematic Wan2.2 prompt and a negative prompt.`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        system: sys,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    if (!r.ok) throw new Error(`Claude ${r.status}: ${await r.text()}`);
    const data = await r.json();
    const text = data?.content?.[0]?.text ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON in Claude response");
    const parsed = JSON.parse(match[0]);
    return {
      prompt: parsed.prompt || FALLBACK_PROMPT,
      negative: parsed.negative_prompt || FALLBACK_NEGATIVE,
    };
  } catch (e) {
    console.warn("Claude failed, using fallback:", (e as Error).message);
    return { prompt: FALLBACK_PROMPT, negative: FALLBACK_NEGATIVE };
  }
}

async function submitToComfyUI(prompt: string, negative: string, imageUrl?: string) {
  if (!COMFYUI_API_URL) return null;
  try {
    const r = await fetch(`${COMFYUI_API_URL}/prompt`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(COMFYUI_API_KEY ? { Authorization: `Bearer ${COMFYUI_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        prompt,
        negative_prompt: negative,
        image_url: imageUrl,
        resolution: "720p",
        duration: 8,
        workflow: "wan22-5b",
      }),
    });
    if (!r.ok) throw new Error(`ComfyUI ${r.status}`);
    const data = await r.json();
    return data.job_id || data.prompt_id || null;
  } catch (e) {
    console.warn("ComfyUI submit failed:", (e as Error).message);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    // Handle both direct calls and DB webhook payloads
    const source_table = body.source_table || body.record?.source_table;
    const source_id = body.source_id || body.record?.id;
    const user_id = body.user_id || body.record?.user_id || body.record?.gifter_id;

    if (!source_table || !source_id || !user_id) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Idempotency
    const { data: existing } = await supabase
      .from("video_jobs")
      .select("id, status")
      .eq("source_table", source_table)
      .eq("source_id", source_id)
      .neq("status", "failed")
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: true, existing: existing.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check credits
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, video_credits")
      .eq("user_id", user_id)
      .maybeSingle();
    const credits = profile?.video_credits ?? 0;
    if (credits <= 0) {
      await supabase.from("video_jobs").insert({
        source_table,
        source_id,
        user_id,
        status: "failed",
        error_message: "No video credits remaining",
      });
      return new Response(JSON.stringify({ ok: false, reason: "no credits" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch source row
    const { data: item } = await supabase
      .from(source_table)
      .select("title, description, category, images")
      .eq("id", source_id)
      .maybeSingle();

    // Generate prompt
    const { prompt, negative } = await generatePromptWithClaude(item || {});
    const imageUrl = item?.images?.[0];

    // Submit (or mock)
    const comfyJobId = await submitToComfyUI(prompt, negative, imageUrl);
    const isMock = !COMFYUI_API_URL;

    const { data: job, error: insertErr } = await supabase
      .from("video_jobs")
      .insert({
        source_table,
        source_id,
        user_id,
        status: "generating",
        prompt_used: prompt,
        negative_prompt: negative,
        comfyui_job_id: comfyJobId,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (insertErr) throw insertErr;

    // Deduct credit
    if (profile) {
      await supabase
        .from("profiles")
        .update({ video_credits: credits - 1 })
        .eq("id", profile.id);
    }

    return new Response(
      JSON.stringify({ ok: true, job_id: job.id, mock: isMock }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("trigger-video-agent error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
