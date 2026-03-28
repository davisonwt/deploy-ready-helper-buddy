import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const AI_MODEL = "google/gemini-3-flash-preview";

const SYSTEM_PROMPT = `You are the storytelling voice of sow2grow, a faith-based community giving platform. Write 2-3 warm, personal, faith-inspired sentences about this sower's seed journey to inspire a bestower to support them. Use the sower's real name. Reference the seed title and how many people have engaged with it. End with one sentence about what their bestowing would mean. Never use religious jargon. Keep it human and genuine.`;

const toSafeString = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const toSafeNumber = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

const buildFallbackStory = (sowerName: string, seedTitle: string, engagements: number) => {
  const safeSower = sowerName || "This sower";
  const safeSeed = seedTitle || "their seed";
  return `${safeSower} has planted "${safeSeed}" with courage and intention. ${engagements} people have already engaged, showing that this journey is beginning to resonate. Your bestowing would give them practical momentum to keep going.`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const sowerName = toSafeString((payload as Record<string, unknown>).sowerName);
    const seedTitle = toSafeString((payload as Record<string, unknown>).seedTitle);
    const daysSincePlanted = toSafeNumber((payload as Record<string, unknown>).daysSincePlanted);
    const bestowalsCount = toSafeNumber((payload as Record<string, unknown>).bestowalsCount);
    const engagements = toSafeNumber((payload as Record<string, unknown>).engagements);
    const seedCategory = toSafeString((payload as Record<string, unknown>).seedCategory);

    if (!sowerName && !seedTitle) {
      return new Response(JSON.stringify({ story: buildFallbackStory("This sower", "their seed", engagements), fallback: true }), {
        status: 200,
        headers: jsonHeaders,
      });
    }

    const userMessage = `Sower: ${sowerName}, Seed: ${seedTitle}, Days: ${daysSincePlanted}, Bestowals: ${bestowalsCount}, Engagements: ${engagements}, Category: ${seedCategory}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: AI_MODEL,
          max_tokens: 120,
          temperature: 0.7,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          stream: false,
        }),
      }).finally(() => clearTimeout(timeout));

      if (!response.ok) {
        const t = await response.text();
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited" }), {
            status: 429, headers: jsonHeaders,
          });
        }
        if (response.status === 402) {
          console.warn("AI gateway returned 402 – using fallback story");
          return new Response(JSON.stringify({
            story: buildFallbackStory(sowerName, seedTitle, engagements),
            fallback: true,
          }), { status: 200, headers: jsonHeaders });
        }
        console.error("AI gateway error:", response.status, t);
        return new Response(JSON.stringify({
          story: buildFallbackStory(sowerName, seedTitle, engagements),
          fallback: true,
        }), {
          status: 200,
          headers: jsonHeaders,
        });
      }

      const data = await response.json();
      const story = data.choices?.[0]?.message?.content || "";

      return new Response(JSON.stringify({ story }), {
        headers: jsonHeaders,
      });
    } catch (fetchErr) {
      if (fetchErr instanceof DOMException && fetchErr.name === "AbortError") {
        return new Response(JSON.stringify({
          story: buildFallbackStory(sowerName, seedTitle, engagements),
          fallback: true,
        }), {
          status: 200,
          headers: jsonHeaders,
        });
      }
      throw fetchErr;
    }
  } catch (e) {
    console.error("generate-seed-story error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: jsonHeaders,
    });
  }
});
