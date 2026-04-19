// 🐧 Gentoo the Overseer — Master orchestrator
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, adminClient, userClient, AGENTS, logActivity, setAgentStatus, callAI, createSuggestion, AgentName } from "../_shared/linux-family.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sb = await userClient(req);
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "auth required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const { action, seed_id, payload } = body as { action: string; seed_id?: string; payload?: any };

    const admin = adminClient();
    await admin.rpc("ensure_linux_family_agents", { _user_id: user.id });

    switch (action) {
      case "init": {
        await logActivity(user.id, "gentoo", "ready",
          "🐧 Gentoo the Overseer is online — the Linux Family is ready to serve.");
        return ok({ initialized: true });
      }

      case "seed_planted": {
        // Greet member, queue first round of tasks across the family
        await setAgentStatus(user.id, "gentoo", "working");
        await logActivity(user.id, "gentoo", "seed_planted",
          `🐧 Your Seed is planted! Rallying the family…`, { seed_id }, seed_id);

        // Queue tasks for each agent
        const tasks = [
          { agent_name: "kali", task_type: "generate_seed_banner" },
          { agent_name: "tux", task_type: "draft_launch_post" },
          { agent_name: "ubuntu", task_type: "lock_brand_voice" },
          { agent_name: "fedora", task_type: "plan_video_cuts" },
          { agent_name: "mint", task_type: "init_bookkeeping" },
        ].map(t => ({ ...t, user_id: user.id, seed_id, payload: payload ?? {} }));
        await admin.from("linux_family_tasks").insert(tasks);

        // Proactive suggestion
        await createSuggestion(
          user.id, "gentoo", "full_launch",
          "Your Seed is planted! Shall the whole Linux Family start marketing it and generating bestowal reports?",
          "Tux, Kali, Fedora & Debian will create posts, banners, voice-over videos, and reach out to the tribe. Mint will track every bestowal.",
          { seed_id, scope: "full" }, seed_id ?? null,
        );
        await setAgentStatus(user.id, "gentoo", "idle");
        return ok({ tasks_queued: tasks.length });
      }

      case "generate_report": {
        // Delegate to Mint
        await admin.from("linux_family_tasks").insert({
          user_id: user.id, seed_id, agent_name: "mint",
          task_type: "build_bestowal_report",
          payload: { period_days: payload?.period_days ?? 7 },
        });
        await logActivity(user.id, "gentoo", "delegated",
          "🐧 → 📒 Asked Mint to prepare a Bestowal Report.");
        return ok({ delegated: "mint" });
      }

      case "respond_suggestion": {
        const { suggestion_id, decision } = payload as { suggestion_id: string; decision: "approved" | "declined" | "snoozed" };
        await admin.from("linux_family_suggestions").update({
          status: decision, responded_at: new Date().toISOString(),
        }).eq("id", suggestion_id).eq("user_id", user.id);
        await logActivity(user.id, "gentoo", "suggestion_response",
          `🐧 Member ${decision} a suggestion.`);
        return ok({ ok: true });
      }

      case "summarize": {
        // Daily summary via AI
        const { data: recent } = await admin.from("linux_family_activity_log")
          .select("agent_name, message, created_at")
          .eq("user_id", user.id)
          .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
          .order("created_at", { ascending: false }).limit(50);
        const summary = await callAI([
          { role: "system", content: "You are Gentoo, a warm penguin coordinator. Summarize the last 24h of agent activity in 3 friendly bullets for the member." },
          { role: "user", content: JSON.stringify(recent ?? []) },
        ]);
        await logActivity(user.id, "gentoo", "daily_summary", `🐧 ${summary.slice(0, 200)}`);
        return ok({ summary });
      }

      default:
        return ok({ family: AGENTS, hint: "actions: init | seed_planted | generate_report | respond_suggestion | summarize" });
    }
  } catch (e) {
    console.error("gentoo error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function ok(data: unknown) {
  return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
