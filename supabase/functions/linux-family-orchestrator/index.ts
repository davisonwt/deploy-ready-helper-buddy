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

      case "run_content_pack": {
        // Chain: Tux drafts → Ubuntu polishes → Kali banner → Fedora video plan
        const { seed_title = "your Seed", seed_description = "", platform = "instagram", language = "English" } = (payload ?? {}) as any;
        await setAgentStatus(user.id, "gentoo", "working");
        await logActivity(user.id, "gentoo", "content_pack_started",
          `🐧 Rallying Tux, Ubuntu, Kali & Fedora for "${seed_title}"…`, { seed_id, platform }, seed_id ?? null);

        const auth = req.headers.get("Authorization") ?? "";
        const base = Deno.env.get("SUPABASE_URL")!;
        const callAgent = async (fn: string, body: unknown) => {
          const r = await fetch(`${base}/functions/v1/${fn}`, {
            method: "POST",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!r.ok) throw new Error(`${fn} ${r.status}: ${await r.text()}`);
          return r.json();
        };

        // 1. Tux drafts
        const tux = await callAgent("agent-tux-content", {
          format: "post", platform, seed_title, seed_description, seed_id,
        });
        // 2. Ubuntu polishes
        const ubuntu = await callAgent("agent-ubuntu-brand", {
          draft: tux.content, channel: platform, seed_id,
        });
        // 3. Kali banner (best-effort — image can fail without crashing the pack)
        let banner_url: string | null = null;
        try {
          const kali = await callAgent("agent-kali-images", {
            prompt: `Banner for "${seed_title}". ${seed_description}`.slice(0, 400),
            kind: "banner", seed_id,
          });
          banner_url = kali.url ?? null;
        } catch (e) {
          console.warn("kali skipped:", (e as Error).message);
          await logActivity(user.id, "kali", "image_skipped", `🪄 Image step skipped: ${(e as Error).message.slice(0, 80)}`, {}, seed_id ?? null);
        }
        // 4. Fedora video plan
        const fedora = await callAgent("agent-fedora-video", {
          seed_title, seed_description, language,
          platforms: [platform === "all" ? "instagram" : platform, "tiktok", "youtube"],
          seed_id,
        });

        // Persist pack to memory
        const pack = {
          polished_post: ubuntu.polished,
          raw_post: tux.content,
          banner_url,
          video_plan: fedora.plan,
          platform, language,
          generated_at: new Date().toISOString(),
        };
        await admin.from("linux_family_memory").insert({
          user_id: user.id, agent_name: "gentoo", seed_id: seed_id ?? null,
          memory_key: `content_pack:${Date.now()}`, memory_value: pack,
        });
        await logActivity(user.id, "gentoo", "content_pack_done",
          `🐧 Content pack ready for "${seed_title}" — post + banner + video plan.`,
          { seed_id, has_banner: !!banner_url }, seed_id ?? null);
        await setAgentStatus(user.id, "gentoo", "idle");
        return ok({ pack });
      }

      case "comms_blast": {
        // Debian sends a tribal broadcast to N other bestowars (sowers w/ at least 1 orchard)
        const { seed_title = "your Seed", seed_description = "", message_kind = "collab_offer", limit = 10, custom_text = null } = (payload ?? {}) as any;
        await setAgentStatus(user.id, "gentoo", "working");

        // Pick recipients: other active sowers (exclude self), most recent first
        const { data: others } = await admin
          .from("orchards")
          .select("user_id")
          .neq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(limit * 3);
        const recipients = Array.from(new Set((others ?? []).map((o: any) => o.user_id))).slice(0, limit);

        if (recipients.length === 0) {
          await logActivity(user.id, "debian", "no_recipients", "💬 No other bestowars found to message yet.", {}, seed_id ?? null);
          await setAgentStatus(user.id, "gentoo", "idle");
          return ok({ sent: 0 });
        }

        const auth = req.headers.get("Authorization") ?? "";
        const r = await fetch(`${Deno.env.get("SUPABASE_URL")!}/functions/v1/agent-debian-messenger`, {
          method: "POST",
          headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "send",
            recipient_user_ids: recipients,
            seed_title, message_kind, custom_text, seed_id,
          }),
        });
        const dj = await r.json();
        await logActivity(user.id, "gentoo", "comms_blast_done",
          `🐧 → 💬 Debian reached out to ${dj.sent ?? 0} bestowars about "${seed_title}".`,
          { count: dj.sent }, seed_id ?? null);
        await setAgentStatus(user.id, "gentoo", "idle");
        return ok({ sent: dj.sent ?? 0, body: dj.body });
      }

      case "arch_call": {
        // Arch places a Jitsi call (audio/video) to a counterparty
        const { counterparty_user_id, call_type = "video" } = (payload ?? {}) as any;
        if (!counterparty_user_id) return ok({ error: "counterparty_user_id required" });
        const auth = req.headers.get("Authorization") ?? "";
        const r = await fetch(`${Deno.env.get("SUPABASE_URL")!}/functions/v1/agent-arch-caller`, {
          method: "POST",
          headers: { Authorization: auth, "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "place", counterparty_user_id, call_type, seed_id }),
        });
        const aj = await r.json();
        await logActivity(user.id, "gentoo", "arch_call_placed",
          `🐧 → 📞 Arch placed a ${call_type} call.`, { jitsi_room: aj.jitsi_room }, seed_id ?? null);
        return ok(aj);
      }

      case "respond_suggestion": {
        const { suggestion_id, decision } = payload as { suggestion_id: string; decision: "approved" | "declined" | "snoozed" };
        const { data: sug } = await admin.from("linux_family_suggestions")
          .select("*").eq("id", suggestion_id).eq("user_id", user.id).maybeSingle();
        await admin.from("linux_family_suggestions").update({
          status: decision, responded_at: new Date().toISOString(),
        }).eq("id", suggestion_id).eq("user_id", user.id);
        await logActivity(user.id, "gentoo", "suggestion_response",
          `🐧 Member ${decision} a suggestion${sug?.title ? `: "${sug.title}"` : ""}.`);

        // If approved, execute the proposed action
        if (decision === "approved" && sug?.proposed_action) {
          const pa: any = sug.proposed_action;
          const auth = req.headers.get("Authorization") ?? "";
          const seedTitle = sug.seed_id
            ? (await admin.from("orchards").select("title,description").eq("id", sug.seed_id).maybeSingle()).data
            : null;

          const callSelf = (body: unknown) => fetch(`${Deno.env.get("SUPABASE_URL")!}/functions/v1/linux-family-orchestrator`, {
            method: "POST",
            headers: { Authorization: auth, "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          if (pa.action === "build_report") {
            await fetch(`${Deno.env.get("SUPABASE_URL")!}/functions/v1/agent-mint-bookkeeper`, {
              method: "POST", headers: { Authorization: auth, "Content-Type": "application/json" },
              body: JSON.stringify({ period_days: pa.period_days ?? 7 }),
            });
          } else if (pa.action === "comms_blast") {
            await callSelf({
              action: "comms_blast",
              seed_id: sug.seed_id,
              payload: {
                seed_title: seedTitle?.title ?? "your Seed",
                seed_description: seedTitle?.description ?? "",
                message_kind: pa.message_kind ?? "collab_offer",
                limit: pa.limit ?? 10,
              },
            });
          } else if (pa.action === "run_content_pack") {
            await callSelf({
              action: "run_content_pack",
              seed_id: sug.seed_id,
              payload: {
                seed_title: seedTitle?.title ?? "your Seed",
                seed_description: seedTitle?.description ?? "",
                platform: pa.platform ?? "instagram",
                language: pa.language ?? "English",
              },
            });
          }
        }
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
