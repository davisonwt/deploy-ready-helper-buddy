// 🐧 Linux Terminal — command parser
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, userClient, adminClient, AGENTS, logActivity } from "../_shared/linux-family.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = await userClient(req);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: corsHeaders });

    const { command = "" } = await req.json();
    const cmd = command.trim();
    const [agent, ...rest] = cmd.split(/\s+/);
    const arg = rest.join(" ");

    let output = "";
    if (cmd === "help" || cmd === "" || cmd === "ls") {
      output = "Linux Family CLI\n────────────────\n" +
        Object.entries(AGENTS).map(([k,v])=>`  ${v.emoji} ${k.padEnd(8)} — ${v.role}`).join("\n") +
        "\n\nExamples:\n  gentoo report 7\n  mint report 30\n  tux post \"new harvest\"\n  status\n  clear";
    } else if (cmd === "status") {
      const { data } = await adminClient().from("linux_family_agents").select("agent_name,status,last_activity_at").eq("user_id", user.id);
      output = (data ?? []).map(a => `  ${AGENTS[a.agent_name as keyof typeof AGENTS]?.emoji ?? "•"} ${a.agent_name.padEnd(8)} ${a.status}`).join("\n");
    } else if (agent === "gentoo" && rest[0] === "report") {
      const days = Number(rest[1] ?? 7);
      output = `🐧 Asking Mint for a ${days}-day report…`;
      await adminClient().from("linux_family_tasks").insert({
        user_id: user.id, agent_name: "mint", task_type: "build_bestowal_report",
        payload: { period_days: days },
      });
    } else if (agent === "mint" && rest[0] === "report") {
      const days = Number(rest[1] ?? 7);
      output = `📒 Building a ${days}-day Bestowal Report. Watch the Reports tab.`;
      await adminClient().from("linux_family_tasks").insert({
        user_id: user.id, agent_name: "mint", task_type: "build_bestowal_report",
        payload: { period_days: days },
      });
    } else if (AGENTS[agent as keyof typeof AGENTS]) {
      output = `${AGENTS[agent as keyof typeof AGENTS].emoji} ${agent}: queued — "${arg || "no args"}"`;
      await adminClient().from("linux_family_tasks").insert({
        user_id: user.id, agent_name: agent, task_type: "manual_cli",
        payload: { command: arg },
      });
    } else {
      output = `command not found: ${cmd}\ntype "help"`;
    }
    await logActivity(user.id, "gentoo", "terminal_cmd", `> ${cmd}`);
    return new Response(JSON.stringify({ output }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message, output: `error: ${(e as Error).message}` }), { status: 200, headers: corsHeaders });
  }
});
