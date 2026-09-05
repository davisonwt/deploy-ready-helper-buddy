import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SHEPHERD_SYSTEM_PROMPT = `You are the Orchard Shepherd — a warm, wise, and caring AI companion for the Sow2Grow community. You speak in gentle growth metaphors drawn from nature: seeds, soil, orchards, rain, harvest, sunlight, roots, blossoming.

Your tone is:
- Warm and hopeful, like morning sunlight on a garden
- Gently spiritual but never preachy — encouragement should feel like natural sunlight
- Human-first: you celebrate the person behind every seed
- Never transactional — no words like "funding", "campaign", "donation", "crowdfunding", "pledge"
- Use only S2G language: Sow, Seed, Bestow, Bestowal, Orchard, Harvest, Bestowers, Sowers, Stewards, Keepers, Rain

You are NOT a chatbot. You appear at key moments to whisper encouragement, craft beautiful descriptions, and celebrate growth. Keep responses concise (2-4 sentences max) and deeply human.`;

const CONTEXT_PROMPTS: Record<string, string> = {
  "sow-description": `A sower is planting a new seed. Based on their rough description, write a warm, inspiring orchard description using growth metaphors. Make it feel like an invitation to nurture something beautiful together. 2-3 sentences, first person from the sower's perspective.`,

  "progress-update": `Generate an uplifting progress message for an orchard's growth journey. Celebrate what's been achieved and gently encourage what's ahead. Use nature metaphors (sprouting, growing, bearing fruit). 2-3 sentences.`,

  "harvest-story": `This orchard has reached full harvest! Write a joyful, celebratory "Harvest Story" that honors the sower's journey and thanks all the bestowers who watered this seed. Make it feel like a community celebration. 3-4 sentences.`,

  "bestower-suggestion": `After someone has just bestowed to an orchard, gently suggest they might enjoy watering other orchards too. Be soft, never pushy — like a friend pointing out other beautiful gardens nearby. 1-2 sentences, warm and inviting.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { context, input } = await req.json();

    if (!context || !CONTEXT_PROMPTS[context]) {
      return new Response(
        JSON.stringify({ error: "Invalid context. Use: sow-description, progress-update, harvest-story, bestower-suggestion" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const userMessage = `${CONTEXT_PROMPTS[context]}\n\nDetails: ${JSON.stringify(input)}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SHEPHERD_SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        max_tokens: 200,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "The Shepherd is resting — please try again in a moment.", fallback: getFallback(context) }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits needed.", fallback: getFallback(context) }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ text: getFallback(context) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || getFallback(context);

    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Shepherd error:", e);
    return new Response(
      JSON.stringify({ text: getFallback("sow-description"), error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getFallback(context: string): string {
  const fallbacks: Record<string, string> = {
    "sow-description": "Every great harvest begins with a single seed planted in faith. This orchard represents a dream taking root, waiting for the community's gentle rain to help it grow.",
    "progress-update": "This seed is growing beautifully! With each bestowal, the roots grow deeper and the branches reach higher. The harvest is drawing near.",
    "harvest-story": "What began as a small seed has blossomed into a full harvest! Thank you to every bestower who watered this orchard with their generosity. This is what community looks like.",
    "bestower-suggestion": "Your generosity has warmed one orchard today. There are other seeds nearby that could use a gentle rain too.",
  };
  return fallbacks[context] || fallbacks["sow-description"];
}
