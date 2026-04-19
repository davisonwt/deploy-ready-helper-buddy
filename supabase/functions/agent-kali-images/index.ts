// 🪄 Kali the Image Wizard — banners, brochures, flyers via Nano Banana
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, userClient, logActivity, setAgentStatus, adminClient } from "../_shared/linux-family.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = await userClient(req);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: corsHeaders });

    const { prompt, kind = "banner", seed_id = null } = await req.json();
    await setAgentStatus(user.id, "kali", "working");

    const key = Deno.env.get("LOVABLE_API_KEY");
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: `Create a warm, painterly ${kind} for Sow2Grow tribe. ${prompt}` }],
        modalities: ["image", "text"],
      }),
    });
    if (!r.ok) throw new Error(`image gen failed ${r.status}`);
    const data = await r.json();
    const dataUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl) throw new Error("no image returned");

    // Upload to storage
    const admin = adminClient();
    const base64 = dataUrl.split(",")[1];
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const path = `${user.id}/${kind}-${Date.now()}.png`;
    const { error: upErr } = await admin.storage.from("ai-creations").upload(path, bytes, {
      contentType: "image/png", upsert: false,
    });
    let publicUrl = dataUrl;
    if (!upErr) {
      publicUrl = admin.storage.from("ai-creations").getPublicUrl(path).data.publicUrl;
    }

    await logActivity(user.id, "kali", "image_created", `🪄 Conjured a ${kind}.`, { url: publicUrl, kind }, seed_id);
    await setAgentStatus(user.id, "kali", "idle");

    return new Response(JSON.stringify({ url: publicUrl, kind }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("kali error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
