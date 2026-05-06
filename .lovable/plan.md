# The Grove — Agent Architecture for S2G

You already have the right bones: Jitsi handles voice/video, ChatApp (`chat_rooms` + `chat_messages`) is the in-house text nervous system, and 10 tree agents (Linden, Maple, Cypress, Willow, Birch, Elm, Hickory, Beech, Alder, Hawthorn) already live in `s2g_companions` with quotas, entitlements, and a working `companion-invoke` edge function. The gaps the brief identifies are:

1. The **narrative agents** (Acorn, Root, Bud) and **live-room agents** (Hive, Nectar, Petal) and **harvest agents** (Grain, Sheaf, Thresh) and **orchestrator** (Groundskeeper) don't exist yet.
2. There's no **session-end pipeline** — when a Jitsi room ends, nothing automatically thanks bestowers, scores relationships, or coaches the sower.
3. There's no **agent dispatch table** so messages from Grain/Sheaf/Thresh land natively inside ChatApp as first-class system messages.
4. **Groundskeeper** (the always-on floating chat) doesn't exist as UI.

Plan below skips the Node/Express bridge from your reference doc — we don't need it. The same job is done with Supabase edge functions + a ChatApp dispatch table, which keeps everything inside Lovable Cloud and the existing `chat_messages` table.

## Phase 1 — Extend the agent registry (DB + code)

Add the 11 missing agents to `s2g_companions` and `s2g_companion_entitlements` so the whole Grove is one uniform catalog. Each gets a system prompt, tree emoji, tier mapping, and short tribe-facing summary.

| New slug | Layer | Title | Tier access |
|---|---|---|---|
| `acorn` | Narrative | Seed Intake | All tiers, quotas per tier |
| `root` | Narrative | Identity Forger | Keeper+ |
| `bud` | Narrative | Promise Designer | Keeper+ |
| `hive` | Live | Room Conductor | Ambassador+ |
| `nectar` | Live | Engagement Alchemist | Ambassador+ |
| `petal` | Live | Audience Matcher | Ambassador+ |
| `grain` | Harvest | Follow-Up Forger | All tiers (auto) |
| `sheaf` | Harvest | Relationship Gardener | Keeper+ (auto) |
| `thresh` | Harvest | Feedback Distiller | Keeper+ (auto) |
| `groundskeeper` | Orchestration | Entry Steward | All tiers, unlimited |

Add a new `layer` column to `s2g_companions` (`narrative` / `infrastructure` / `live` / `harvest` / `orchestration`) so the Companions Hub can group them visually.

System prompts in `companion-invoke/index.ts` are extended in the same shape we already use, each carrying the warm/pastoral voice and Sow2Grow vocabulary.

## Phase 2 — The harvest pipeline (replaces the Node bridge)

Two new tables and two new edge functions.

**`grove_session_events`** — append-only log of session lifecycle events (`session_started`, `session_ended`, `recording_ready`, `bestowal_received`). Source = any `live_rooms` / `radio_live_sessions` / `classroom_sessions` / `skilldrop_sessions` row. RLS: sower owns own.

**`grove_relationship_scores`** — `(bestower_id, sower_id)` PK with `tier` (`new` / `returning` / `core` / `patron`), `sessions_attended`, `total_bestowed`, `consecutive_support`, `last_session_at`. Updated by Sheaf. RLS: sower can read rows where they're the sower; bestower can read own.

**Edge function `grove-session-harvest`** — invoked when a live room ends (we wire it into the existing "end session" handlers in `useTribalLiveOrchard`, radio session controls, etc.). It:

1. Loads session metadata (sower, participants who bestowed, totals, chat transcript, recording URL if any).
2. In parallel calls:
   - **Grain** → AI-generated personalized thank-yous per bestower, posted into ChatApp as system message from agent `grain`, plus a sower summary.
   - **Sheaf** → updates `grove_relationship_scores`, posts staggered nurture messages (immediate / +1h / +24h) using the dispatch table.
   - **Thresh** → AI session analysis (peaks, sentiment, conversion, room-fit), posted to sower in ChatApp.
   - **Birch** → archives recording metadata, sends sower the access link.
3. Pipes Thresh insights into **Hawthorn** for "next session" prediction.

**Edge function `grove-dispatch`** — single endpoint any agent calls to send a message into ChatApp. It picks (or creates) a 1:1 chat room between the agent's system user and the recipient, inserts into `chat_messages` with `message_type = 'agent'` and a JSON `metadata` payload (`agent`, `event`, `session_id`, `priority`). This makes every agent message first-class in the existing chat UI — no separate notifications layer.

A `grove_message_queue` table backs Sheaf's staggered sends; a `pg_cron` job ticks every minute and flushes due rows through `grove-dispatch`.

```text
Live room ends
   │
   ▼
grove-session-harvest  ──► Grain   ─┐
                       ──► Sheaf  ──┼─► grove-dispatch ─► chat_messages (ChatApp)
                       ──► Thresh ──┤
                       ──► Birch   ─┘
                       ──► Hawthorn (next-session forecast)
```

## Phase 3 — Narrative onboarding flow (Acorn → Root → Maple → Bud → Willow)

A new route `/plant-a-seed` walks a first-time sower through a guided interview:

1. **Acorn** asks 5–8 warm seed-intake questions (product nature, place, season, hardest part).
2. **Root** runs after Acorn finishes — separate AI call that distills identity (location, history, struggles, dreams) into a structured JSON identity profile, stored on `seeds` as `identity_profile jsonb`.
3. **Maple** (already exists) generates the public narrative, stored as `seeds.story_md`.
4. **Bud** generates 3–5 bestowal tiers with emotional hooks → stored in a new `seed_bestowal_tiers` table.
5. **Willow** (already exists) generates the hero image.
6. Sower reviews, edits, taps "Plant" → `seeds.status = 'live'` and the existing Go-Live button appears.

All five steps reuse `companion-invoke` — no new AI plumbing. Each step has its own visible step-card so the sower sees which tree is working.

## Phase 4 — Groundskeeper (floating orchestrator)

A persistent floating chat bubble visible on every authenticated route (`<GroundskeeperWidget />` mounted in `App.tsx`). It calls `companion-invoke` with `companion: 'groundskeeper'`. The Groundskeeper system prompt teaches it to:

- Speak as a wise, slightly archaic grove steward.
- Know every other tree-agent and what each does.
- When the user asks something tree-specific ("plan a reel", "draft thank-yous"), respond with a short routing note ("Birch tends recordings — opening that branch for you") and then a button that opens that companion's drawer (reusing existing `CompanionDrawer`).
- Pull in proactive nudges (e.g. "Sarah's Radio session starts in 10 min") from the new `grove_session_events` table.

## Technical notes (for the curious)

- All new edge functions use the same CORS allow-list we already standardised (`x-my-custom-header` included).
- All AI calls go through `LOVABLE_API_KEY` / Lovable AI gateway — no extra secrets.
- New tables get RLS:
  - `grove_session_events`: sower or participant can read own; insert via service role only.
  - `grove_relationship_scores`: sower reads own; bestower reads own; writes via service role.
  - `grove_message_queue`: service role only.
- We hook session-end into the existing live-room "end" handlers (`useTribalLiveOrchard`, radio session controls, classroom/skilldrop end buttons) — no Jitsi webhook server needed.
- Quotas continue to use the existing `check_and_consume_companion_quota` RPC.

## What you get after Phase 4

- All 21 Grove agents live, named, prompted, and quota-managed.
- A first-time sower can go upload → interview → live story → tiers → hero image → "Plant" in one guided flow.
- Every live session that ends fires Grain (thanks), Sheaf (relationship), Thresh (coaching), Birch (archive), Hawthorn (forecast) — landing as system messages inside ChatApp, no email needed.
- A floating Groundskeeper on every page that delegates to the right tree.

## Suggested rollout order

1. **Phase 1** (registry extension) — small, safe, immediately visible on `/companions`.
2. **Phase 4** (Groundskeeper widget) — high user-perceived value, no DB risk.
3. **Phase 2** (harvest pipeline) — biggest engineering chunk, but everything else flows from it.
4. **Phase 3** (narrative onboarding) — best done after the harvest pipeline so the loop closes.

Reply with which phase to start, or say "go" and I'll build all four in order.