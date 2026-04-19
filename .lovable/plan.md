
This is a massive multi-system feature. I need to scope it pragmatically — build a real, working foundation rather than a half-broken everything. Let me inspect the current ChatApp + Seed architecture to plan integration points.
<lov-tool-use id="toolu_vrtx_01PKaJ9BJCdxxPAaGJoinZpn" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"src/components/chat\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01DNsHLiEvzmQoKaHTZdHpzg" name="code--search_files" integration-id="code" data="{\"query\": \"seed\", \"include_patterns\": \"supabase/migrations/*.sql\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01F3r5MHF43PuWrJdE57TCA9" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"supabase/functions\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_013peEBCUtz5TNkKJJzM1GWh" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"src/components/chat\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Tk241tgidxBADZQ8TFLdT7" name="code--list_dir" integration-id="code" data="{\"dir_path\": \"supabase/functions\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01KibNM9M2qD9rkUr135Hmv2" name="code--search_files" integration-id="code" data="{\"query\": \"CREATE TABLE.*seed\", \"include_patterns\": \"*.sql\", \"case_sensitive\": false}">
</lov-tool-use>
<lov-plan>

## Linux Open Source Family — Autonomous AI Agent Suite for Sow2Grow

A coordinated tribe of 8 penguin/Tux-themed AI agents that take over **all** post-upload work for every Seed: marketing, branding, content, messaging, calls, analytics, and bookkeeping. Built on Lovable AI Gateway + Lovable Cloud + the existing ChatApp.

### The Family (8 agents, each with a system prompt + capabilities)

| Agent | Role | Owns |
|---|---|---|
| 🐧 **Gentoo the Overseer** | Master Coordinator | Orchestrates every other agent, generates Bestowal Reports, drives proactive prompts |
| 🎨 **Tux the Content Penguin** | Marketing | Posts, reels, stories, newsletters, content strategy |
| 🛡️ **Ubuntu the Branding Guardian** | Branding | Voice/tone/palette consistency across all output |
| 🪄 **Kali the Image Wizard** | Images | Banners, brochures, flyers (Nano Banana) |
| 🎬 **Fedora the Video Director** | Videos | Voice-over videos in EN + local langs (multi-platform cuts) |
| 💬 **Debian the Messenger** | Messaging | 2-way ChatApp messaging w/ customers + bestowars |
| 📞 **Arch the Caller** | Calls | Receives & makes voice + video calls via Jitsi/ChatApp |
| 📒 **Mint the Bookkeeper** | Finance | Invoicing, expenses, Bestowal Reports, financial summaries |

### Architecture

```text
   ┌──────────────────────────── Member Dashboard ──────────────────────────┐
   │  /linux-family   ← Agent Dashboard + Linux Terminal + Reports + Stats   │
   └──────────┬─────────────────────────────────────────────────────────────┘
              │
   ┌──────────▼──────────┐    proactive nudges    ┌──────────────────────┐
   │   Gentoo (Overseer) │ ◄────────────────────► │  ChatApp (existing)  │
   └──────┬──────────────┘                        │  msgs / calls / video │
          │ delegates                             └──────────────────────┘
   ┌──────┼──────┬──────┬──────┬──────┬──────┬──────┐
   ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼
  Tux  Ubuntu  Kali  Fedora Debian Arch  Mint  (shared memory)
   │      │      │      │      │      │      │
   └──────┴──────┴──────┴──────┴──────┴──────┴── Lovable AI Gateway
                                       (gemini-3-flash-preview / nano-banana)
```

### Database (new tables, RLS by `user_id`)

1. `linux_family_agents` — per-member agent state (enabled, last_activity, persona overrides)
2. `linux_family_memory` — agent ↔ seed long-term memory (key/value JSONB, retrieval by seed_id + agent)
3. `linux_family_tasks` — queued/running/done tasks with `agent_name`, `seed_id`, `payload`, `result`, `status`
4. `linux_family_suggestions` — proactive suggestions awaiting user yes/no (e.g. "create voice-over videos?")
5. `linux_family_activity_log` — live activity stream for the dashboard
6. `bestowal_reports` — generated weekly/on-demand reports (PDF/JSON snapshot, period, metrics)
7. `seed_analytics_daily` — rollup of views/reach/clicks/messages/calls/bestowals per seed per day
8. `linux_family_social_connections` — IG/FB/TikTok/WhatsApp tokens per member (encrypted refs)
9. `linux_family_outbound_messages` — log of messages Debian sent to other bestowars
10. `linux_family_call_log` — Arch's call log (incoming/outgoing, duration, transcript, outcome)

### Edge Functions (Deno, all behind `LOVABLE_API_KEY`)

- `linux-family-orchestrator` — Gentoo's main loop. Triggered on seed upload, on cron (hourly), and on-demand. Decides which sub-agent runs.
- `agent-tux-content` — generates posts/reels/newsletters via AI Gateway, queues them.
- `agent-ubuntu-brand` — brand guardian: takes any draft from Tux/Kali/Fedora and rewrites for tone consistency.
- `agent-kali-images` — image generation (Nano Banana 2 → Pro for hero images).
- `agent-fedora-video` — wraps existing `generate-video` + `chatterbox-tts` to produce multi-platform cuts.
- `agent-debian-messenger` — sends/replies to ChatApp messages + outbound bestowar broadcasts. Uses existing `send-bulk-system-message` infra.
- `agent-arch-caller` — initiates Jitsi rooms, sends call invitations into ChatApp, logs transcripts.
- `agent-mint-bookkeeper` — pulls bestowal/payment data, builds Bestowal Report (HTML → PDF stored in `/storage`).
- `linux-family-cron` — runs every hour (pg_cron + pg_net): rolls up analytics, fires weekly reports, emits proactive suggestions.
- `linux-family-terminal` — parses `tux post "..."`, `gentoo report 7d`, `arch call <user>` etc.

### Frontend (new route `/linux-family`)

- **Agent Dashboard** (`src/pages/LinuxFamilyHub.tsx`)
  - Family roster with live status pills (idle / working / waiting on you)
  - Live Activity Feed (Supabase realtime on `linux_family_activity_log`)
  - Suggestion Inbox (Approve / Decline / Snooze each card)
  - Stats grid per Seed (views, reach, msgs, calls, bestowals, conversion)
  - Bestowal Reports library (download PDF, share in chat)
- **Linux Terminal** (`src/components/linux-family/LinuxTerminal.tsx`) — playful green-on-black CLI w/ command parser
- **Seed Upload Hook** — after a new seed is created, Gentoo greets the member in ChatApp:
  *"🐧 Your Seed is planted! Shall the whole Linux Family start marketing it and generating bestowal reports for you?"*
- **Agent Personality Cards** — penguin avatars (generated once via Kali) + warm bios

### ChatApp Integration

- Each agent has a system "bot user" profile (Gentoo, Tux, …) so messages appear inside existing rooms and the `PrivateChatsDrawer`.
- Reuses `chat_rooms`, `chat_messages`, and Jitsi `CallInterface` — no new chat plumbing.
- Two-way: incoming user messages addressed to an agent route into `linux-family-orchestrator` via realtime trigger.

### Proactive Suggestions Engine

`linux-family-cron` evaluates rules per Seed and inserts suggestions, e.g.:
- High views + low bestowals → *"Shall Arch make follow-up calls?"*
- 7 days since last report → *"Want a Bestowal Report for the last 7 days?"*
- No social tokens → *"Connect IG/FB/TikTok/WhatsApp so we can push content?"*
- Strong performance → *"Shall Debian message other bestowars with a collaboration offer?"*

### Tech Choices

- AI: Lovable AI Gateway, default `google/gemini-3-flash-preview`; `gemini-2.5-pro` for reports; `nano-banana` for images
- Storage: existing Supabase buckets for generated images/videos/PDFs
- Cron: `pg_cron` + `pg_net` calling `linux-family-cron`
- Social pushing: stub adapters first (IG/FB/TikTok/WhatsApp) — will request user OAuth/secrets when they enable that suggestion (Phase 2)

### Phased Build (single response, but sequenced)

1. **Phase 1 — Backbone**: tables, RLS, agent registry, orchestrator + Gentoo + Mint, Agent Dashboard, Bestowal Reports, Activity Feed, Linux Terminal.
2. **Phase 2 — Content tribe**: Tux + Ubuntu + Kali + Fedora wired to existing video/image/TTS functions.
3. **Phase 3 — Comms tribe**: Debian (ChatApp 2-way) + Arch (Jitsi calls + transcripts) + outbound bestowar messaging.
4. **Phase 4 — Proactive cron**: rules engine, weekly reports, suggestion inbox, seed-upload greeting.

### What I will NOT do without explicit follow-up

- Connect real Instagram/Facebook/TikTok/WhatsApp APIs (needs OAuth secrets per provider — Tux will *prompt* the member when ready).
- Make real outbound PSTN phone calls (Arch uses Jitsi voice/video inside ChatApp; Twilio can be added later via the Twilio connector if you want true phone numbers).

