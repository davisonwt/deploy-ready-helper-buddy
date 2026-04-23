import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!openAIApiKey) {
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the calling user is authenticated and requesting their own story
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (user.id !== user_id) {
      return new Response(JSON.stringify({ error: "Forbidden: cannot generate story for another user" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 1. Fetch profile ─────────────────────────────────────────────────────
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("first_name, last_name, display_name, location, bio, website")
      .eq("user_id", user_id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Fetch orchards ────────────────────────────────────────────────────
    const { data: orchards } = await supabase
      .from("orchards")
      .select("title, description, category, orchard_type, seed_value, currency, status")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    // ── 3. Fetch products via sowers join ────────────────────────────────────
    const { data: sower } = await supabase
      .from("sowers")
      .select("id, display_name, bio, is_verified")
      .eq("user_id", user_id)
      .single();

    let products: unknown[] = [];
    if (sower) {
      const { data: productRows } = await supabase
        .from("products")
        .select("title, description, type, category, license_type, price, tags")
        .eq("sower_id", sower.id)
        .order("bestowal_count", { ascending: false });
      products = productRows ?? [];
    }

    // ── 4. Fetch bestowal stats ──────────────────────────────────────────────
    const { data: bestowals } = await supabase
      .from("bestowals")
      .select("amount, pockets_purchased, bestower_id")
      .in(
        "orchard_id",
        (orchards ?? []).map((o: { id?: string }) => o.id).filter(Boolean),
      )
      .eq("payment_status", "completed");

    const totalReceived = (bestowals ?? []).reduce(
      (sum: number, b: { amount: number }) => sum + Number(b.amount),
      0,
    );
    const uniqueSupporters = new Set(
      (bestowals ?? []).map((b: { bestower_id: string }) => b.bestower_id),
    ).size;

    // ── 5. Build OpenAI prompt ───────────────────────────────────────────────
    const displayName =
      profile.display_name ||
      [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
      "this sower";

    const orchardSummary = (orchards ?? [])
      .slice(0, 5)
      .map((o: { title: string; description: string; category: string; orchard_type: string; seed_value: number; currency: string }) =>
        `- "${o.title}" (${o.category}, ${o.orchard_type}): ${o.description?.slice(0, 120)}... Goal: ${o.currency} ${o.seed_value}`,
      )
      .join("\n");

    const productSummary = (products as Array<{ title: string; type: string; category: string; price: number; description: string; tags?: string[] }>)
      .slice(0, 5)
      .map((p) =>
        `- "${p.title}" (${p.type}/${p.category}, $${p.price}): ${p.description?.slice(0, 100)}${p.tags?.length ? ` [tags: ${p.tags.join(", ")}]` : ""}`,
      )
      .join("\n");

    const systemPrompt = `You are a gifted brand storyteller who writes warm, human, and authentic narratives for independent creators and community builders.
Your writing is approachable, heartfelt, and never corporate. You understand the emotional side of community crowdfunding and digital products.
Always return valid JSON with exactly the fields requested.`;

    const userPrompt = `Generate compelling marketing content for the following creator on the Sow2Grow platform.

CREATOR PROFILE:
Name: ${displayName}
Location: ${profile.location || "Not specified"}
Bio: ${profile.bio || "Not provided"}
Website: ${profile.website || "Not provided"}
Verified Sower: ${sower?.is_verified ? "Yes" : "No"}

ORCHARDS (community funding projects):
${orchardSummary || "No orchards yet"}

PRODUCTS/SEEDS (digital goods):
${productSummary || "No products yet"}

COMMUNITY IMPACT:
Total funds received from supporters: $${totalReceived.toFixed(2)}
Number of unique supporters: ${uniqueSupporters}

Generate the following and return as a JSON object with these exact keys:
{
  "story": "A warm personal narrative of 2-3 paragraphs about this creator's journey, mission and community impact. Write in third person. Make it human and genuine.",
  "tagline": "A single punchy sentence (under 12 words) that captures their essence.",
  "instagram_caption": "An engaging Instagram caption with emojis, under 150 words, ending with a clear call to action.",
  "facebook_caption": "A longer Facebook caption, 2 short paragraphs, conversational tone, under 200 words.",
  "twitter_caption": "A sharp tweet under 280 characters. No hashtags — those go in the hashtags field.",
  "hashtags": ["array", "of", "exactly", "15", "relevant", "hashtags", "without", "the", "hash", "symbol"],
  "brochure_intro": "A polished single paragraph (60-80 words) suitable for a printed or digital brochure cover."
}`;

    // ── 6. Call OpenAI ───────────────────────────────────────────────────────
    const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-2025-08-07",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 2000,
      }),
    });

    if (!openAIResponse.ok) {
      const errText = await openAIResponse.text();
      console.error("OpenAI error:", openAIResponse.status, errText);
      return new Response(JSON.stringify({ error: "Failed to generate story. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openAIData = await openAIResponse.json();
    const generated = JSON.parse(openAIData.choices[0].message.content);

    const { story, tagline, instagram_caption, facebook_caption, twitter_caption, hashtags, brochure_intro } = generated;

    // ── 7. Save to sower_stories (upsert) ────────────────────────────────────
    const { data: savedStory, error: saveError } = await supabase
      .from("sower_stories")
      .upsert(
        {
          user_id,
          story,
          tagline,
          instagram_caption,
          facebook_caption,
          twitter_caption,
          hashtags,
          brochure_intro,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();

    if (saveError) {
      console.error("DB save error:", saveError.message);
      return new Response(JSON.stringify({ error: "Story generated but could not be saved." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: savedStory }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Unhandled error in generate-sower-story:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred.", requestId: crypto.randomUUID() }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
