// 🎨 Tux the Content Penguin — posts, reels, newsletters
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, userClient, callAI, logActivity, setAgentStatus } from "../_shared/linux-family.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = await userClient(req);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: corsHeaders });

    const { format = "post", seed_title = "your Seed", seed_description = "", platform = "all", seed_id = null } = await req.json().catch(() => ({}));
    await setAgentStatus(user.id, "tux", "working");

    const sys = `You are Tux the Content Penguin 🎨, a warm, playful marketer for the Sow2Grow tribe. Use the language of "bestow / sow / orchard / pocket". Output MUST be ready to post — no prefaces, no markdown headers.`;
    const userPrompt = `Write a ${format} for ${platform} promoting "${seed_title}". Context: ${seed_description}. Keep it warm, tribal, ${format === "reel" ? "punchy 3-line script" : format === "newsletter" ? "200 words" : "under 220 chars + 3 hashtags"}.`;

    const content = await callAI([
      { role: "system", content: sys },
      { role: "user", content: userPrompt },
    ]);

    await logActivity(user.id, "tux", "content_drafted",
      `🎨 Drafted a ${format} for ${platform}.`, { format, platform, preview: content.slice(0, 120) }, seed_id);
    await setAgentStatus(user.id, "tux", "idle");

    return new Response(JSON.stringify({ content, format, platform }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tux error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
