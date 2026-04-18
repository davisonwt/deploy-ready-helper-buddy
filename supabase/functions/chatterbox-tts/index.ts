// Chatterbox TTS edge function — calls resemble-ai/chatterbox on Replicate
// with optional voice-cloning from a reference audio URL.
//
// Body: { text: string, reference_audio_url?: string, exaggeration?: number, cfg_weight?: number, temperature?: number }
// Returns: { audio_url: string, prediction_id: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REPLICATE_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CHATTERBOX_VERSION = "1b8422bc49635c20d0a84e387ed20879c0dd09254ecdb4e75dc4bec10ff94e97";
const STORAGE_BUCKET = "ai-voiceovers";

async function pollPrediction(id: string): Promise<string> {
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` },
    });
    const p = await r.json();
    if (p.status === "succeeded") return Array.isArray(p.output) ? p.output[0] : p.output;
    if (p.status === "failed" || p.status === "canceled") {
      throw new Error(`Chatterbox failed: ${p.error || p.status}`);
    }
  }
  throw new Error("Chatterbox prediction timed out");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!REPLICATE_TOKEN) throw new Error("REPLICATE_API_TOKEN not configured");

    const { text, reference_audio_url, exaggeration = 0.5, cfg_weight = 0.5, temperature = 0.7 } = await req.json();

    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (text.length > 1500) {
      return new Response(JSON.stringify({ error: "text too long (max 1500 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth check — only authenticated users can spend credits
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const input: Record<string, unknown> = {
      prompt: text, exaggeration, cfg_weight, temperature,
    };
    if (reference_audio_url) input.audio_prompt = reference_audio_url;

    console.log("Submitting Chatterbox prediction…");
    const create = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: { Authorization: `Bearer ${REPLICATE_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ version: CHATTERBOX_VERSION, input }),
    });
    if (!create.ok) {
      const errText = await create.text();
      console.error("Replicate create failed:", errText);
      throw new Error(`Replicate ${create.status}: ${errText}`);
    }
    const pred = await create.json();
    const wavUrl = await pollPrediction(pred.id);

    // Download WAV and store in Supabase Storage so it persists past Replicate's 24h CDN
    const audioRes = await fetch(wavUrl);
    if (!audioRes.ok) throw new Error("Failed to download generated audio");
    const audioBuf = new Uint8Array(await audioRes.arrayBuffer());

    const fileName = `${user.id}/${pred.id}.wav`;
    const { error: upErr } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, audioBuf, { contentType: "audio/wav", upsert: false });
    if (upErr) {
      console.warn("Storage upload failed, returning Replicate URL:", upErr.message);
      return new Response(JSON.stringify({ audio_url: wavUrl, prediction_id: pred.id, stored: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);

    return new Response(JSON.stringify({
      audio_url: pub.publicUrl, prediction_id: pred.id, stored: true,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("chatterbox-tts error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
