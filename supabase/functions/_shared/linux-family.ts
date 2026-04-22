// Shared Linux Family helpers
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

export const AGENTS = {
  gentoo: { emoji: "🐧", title: "Gentoo the Grove Overseer", role: "Grove Overseer" },
  tux: { emoji: "🎨", title: "Tux the Story Sower", role: "Story Sowing" },
  ubuntu: { emoji: "🛡️", title: "Ubuntu the Voice Guardian", role: "Voice Guarding" },
  kali: { emoji: "🪄", title: "Kali the Vision Weaver", role: "Vision Weaving" },
  fedora: { emoji: "🎬", title: "Fedora the Reel Keeper", role: "Reel Keeping" },
  debian: { emoji: "💬", title: "Debian the Hearth Messenger", role: "Hearth Messaging" },
  arch: { emoji: "📞", title: "Arch the Bridge Caller", role: "Bridge Calling" },
  mint: { emoji: "📒", title: "Mint the Pocket Keeper", role: "Pocket Keeping" },
  loaf: { emoji: "🥖", title: "Loaf the Storehouse Steward", role: "Storehouse Stewardship" },
  sage: { emoji: "🔮", title: "Sage the Harvest Oracle", role: "Harvest Guidance" },
} as const;

export type AgentName = keyof typeof AGENTS;

export function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export async function userClient(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } }, auth: { persistSession: false } },
  );
}

export async function logActivity(
  user_id: string,
  agent_name: AgentName,
  activity_type: string,
  message: string,
  metadata: Record<string, unknown> = {},
  seed_id: string | null = null,
) {
  const sb = adminClient();
  await sb.from("linux_family_activity_log").insert({
    user_id, agent_name, activity_type, message, metadata, seed_id,
  });
  await sb.from("linux_family_agents")
    .update({ last_activity_at: new Date().toISOString(), status: "idle" })
    .eq("user_id", user_id).eq("agent_name", agent_name);
}

export async function setAgentStatus(
  user_id: string, agent_name: AgentName, status: "idle" | "working" | "waiting",
) {
  const sb = adminClient();
  await sb.from("linux_family_agents")
    .update({ status, last_activity_at: new Date().toISOString() })
    .eq("user_id", user_id).eq("agent_name", agent_name);
}

export async function callAI(
  messages: Array<{ role: string; content: string }>,
  model = "google/gemini-3-flash-preview",
) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY not configured");
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages }),
  });
  if (r.status === 429) throw new Error("Rate limited — try again in a moment");
  if (r.status === 402) throw new Error("AI credits exhausted — top up workspace");
  if (!r.ok) throw new Error(`AI error ${r.status}: ${await r.text()}`);
  const data = await r.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function createSuggestion(
  user_id: string, agent_name: AgentName, suggestion_type: string,
  title: string, description: string, proposed_action: Record<string, unknown> = {},
  seed_id: string | null = null,
) {
  const sb = adminClient();
  const { data } = await sb.from("linux_family_suggestions").insert({
    user_id, agent_name, suggestion_type, title, description, proposed_action, seed_id,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }).select().single();
  await logActivity(user_id, agent_name, "suggestion_created",
    `${AGENTS[agent_name].emoji} ${title}`, { suggestion_id: data?.id }, seed_id);
  return data;
}
