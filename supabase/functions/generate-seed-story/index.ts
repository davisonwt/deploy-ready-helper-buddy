import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are the storytelling voice of sow2grow, a faith-based community giving platform. Write 2-3 warm, personal, faith-inspired sentences about this sower's seed journey to inspire a bestower to support them. Use the sower's real name. Reference the seed title and how many people have engaged with it. End with one sentence about what their bestowing would mean. Never use religious jargon. Keep it human and genuine.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { sowerName, seedTitle, daysSincePlanted, bestowalsCount, engagements, seedCategory } = await req.json();

    const userMessage = `Sower: ${sowerName}, Seed: ${seedTitle}, Days: ${daysSincePlanted}, Bestowals: ${bestowalsCount}, Engagements: ${engagements}, Category: ${seedCategory}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "google/gemini-2.0-flash-001",
          max_tokens: 200,
          temperature: 0.7,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          stream: false,
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const t = await response.text();
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Payment required" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("AI gateway error:", response.status, t);
        return new Response(JSON.stringify({ error: "AI generation failed" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const story = data.choices?.[0]?.message?.content || "";

      return new Response(JSON.stringify({ story }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr instanceof DOMException && fetchErr.name === "AbortError") {
        return new Response(JSON.stringify({ error: "Story generation timed out" }), {
          status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw fetchErr;
    }
  } catch (e) {
    console.error("generate-seed-story error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
