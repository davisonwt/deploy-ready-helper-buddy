// Temporary one-off TTS helper for the 1-on-1 Live explainer pilot.
// Calls Kokoro-82M via Replicate, returns the audio URL. Safe to delete after pilot.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KOKORO_VERSION = "f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { text, voice = "af_bella", speed = 1.0 } = await req.json();
    const token = Deno.env.get("REPLICATE_API_TOKEN");
    if (!token) return new Response(JSON.stringify({ error: "no token" }), { status: 500, headers: cors });

    const create = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ version: KOKORO_VERSION, input: { text, voice, speed } }),
    });
    const pred = await create.json();
    if (!create.ok) return new Response(JSON.stringify({ stage: "create", pred }), { status: 500, headers: cors });

    let p = pred;
    for (let i = 0; i < 60 && (p.status === "starting" || p.status === "processing"); i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const r = await fetch(`https://api.replicate.com/v1/predictions/${p.id}`, {
        headers: { Authorization: `Token ${token}` },
      });
      p = await r.json();
    }
    if (p.status !== "succeeded") {
      return new Response(JSON.stringify({ stage: "poll", p }), { status: 500, headers: cors });
    }
    return new Response(JSON.stringify({ url: p.output, status: p.status }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: cors });
  }
});
