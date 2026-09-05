import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, description, study_id } = await req.json();
    if (!title || !study_id) {
      return new Response(JSON.stringify({ error: "title and study_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `Create a beautiful, spiritual book cover image for a scripture study titled "${title}". ${description ? `The study is about: ${description.slice(0, 200)}` : ""}. Style: rich biblical imagery, warm gold and deep purple tones, sacred geometry elements, elegant typography space at top for title. No text on the image. Photorealistic spiritual art.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429 || aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: aiResponse.status === 429 ? "Rate limited" : "Credits exhausted" }), {
          status: aiResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const imageDataUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageDataUrl) throw new Error("No image generated");

    // Extract base64 and upload to storage
    const base64Data = imageDataUrl.split(",")[1];
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const filePath = `covers/${study_id}-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("study-uploads")
      .upload(filePath, binaryData, { contentType: "image/png", upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("study-uploads")
      .getPublicUrl(filePath);

    // Update the library item
    const { error: updateError } = await supabase
      .from("s2g_library_items")
      .update({ cover_image_url: publicUrl })
      .eq("id", study_id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ cover_url: publicUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-study-cover error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
