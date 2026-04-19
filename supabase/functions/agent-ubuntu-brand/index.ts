// 🛡️ Ubuntu the Branding Guardian — enforce voice/tone consistency
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, userClient, callAI, logActivity, setAgentStatus } from "../_shared/linux-family.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = await userClient(req);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: corsHeaders });
    const { draft, channel = "post", seed_id = null } = await req.json();
    await setAgentStatus(user.id, "ubuntu", "working");
    const polished = await callAI([
      { role: "system", content: "You are Ubuntu the Branding Guardian 🛡️ for Sow2Grow. Refine drafts to be warm, tribal, faith-aware, and use 'bestow/sow/orchard/pocket' language. Keep meaning intact. Return ONLY the polished text." },
      { role: "user", content: `Channel: ${channel}\n\n${draft}` },
    ]);
    await logActivity(user.id, "ubuntu", "brand_polished", `🛡️ Polished a ${channel} draft for tribal voice.`, { channel }, seed_id);
    await setAgentStatus(user.id, "ubuntu", "idle");
    return new Response(JSON.stringify({ polished }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
