// 🎬 Fedora the Video Director — voice-over video plans
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, userClient, callAI, logActivity, setAgentStatus } from "../_shared/linux-family.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = await userClient(req);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: corsHeaders });

    const { seed_title = "your Seed", seed_description = "", language = "English", platforms = ["tiktok","instagram","youtube"], seed_id = null } = await req.json();
    await setAgentStatus(user.id, "fedora", "working");

    const plan = await callAI([
      { role: "system", content: "You are Fedora the Video Director 🎬. Output JSON only with { script_15s, script_30s, hook, cta, suggested_b_roll: string[], voiceover_tone, platform_cuts: { tiktok, instagram, youtube } }. No prose." },
      { role: "user", content: `Seed: ${seed_title}\nDescription: ${seed_description}\nLanguage: ${language}\nPlatforms: ${platforms.join(", ")}` },
    ]);

    await logActivity(user.id, "fedora", "video_plan", `🎬 Drafted multi-platform video plans (${platforms.join("/")}) in ${language}.`, { language, platforms }, seed_id);
    await setAgentStatus(user.id, "fedora", "idle");

    return new Response(JSON.stringify({ plan, language, platforms }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
