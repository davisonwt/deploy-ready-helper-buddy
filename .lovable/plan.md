
# Orchard Companions — S2G AI-CaaS rebuild

Bring the 10 companions back as a real, tier-gated AI service layer powering Sow2Grow (not a bolt-on chatbot). Each companion is a server-side capability with its own quota per tier, callable from the UI and (later) from automations.

## 1. Tiers and access matrix

Four tiers (price tags shown to user, USDC settled):

| Tier | Price | Code value |
|---|---|---|
| Sower | Free | `sower` |
| Keeper | $4.99/mo | `keeper` |
| Ambassador | $19.99/mo | `ambassador` |
| Council | $29.99/mo | `council` (highest tier you described) |

Founders (Davison/Ed/Amber/Ezra) keep free access via existing `s2g_agent_free_access` table — treated as `council` for entitlement.

The 10 companions and their per-tier entitlement (see your matrix):

```text
                Sower         Keeper           Ambassador          Council
🐧 Gentoo       Greeting      Daily summary    Full coordination   Full + governance
🎨 Tux          3 posts/mo    10 posts/mo      Unlimited + sched.  Unlimited
🛡️ Ubuntu       On request    On request       Auto-review all     Auto-review all
🪄 Kali         3 imgs/mo     10 imgs/mo       Unlimited           Unlimited
🎬 Fedora       —             —                Full                Full
💬 Debian       —             Manual drafts    Auto-outreach       Auto-outreach
📞 Arch         HearthCall    HearthCall       Full routing        Full routing
📒 Mint         Basic summary Weekly report    Full finance        Full finance
🥖 Loaf         —             Basic tracking   Full logistics      Full logistics
🔮 Sage         —             Basic insights   Full oracle         Oracle + council
```

## 2. Database (migration)

New tables in `public`:

- `s2g_companions` (catalog, seed-loaded)
  - `slug` (gentoo/tux/ubuntu/kali/fedora/debian/arch/mint/loaf/sage), `name`, `title`, `emoji`, `summary`, `category` (`coordination|content|review|image|video|messaging|calling|finance|logistics|insight`), `default_model`, `is_active`.
- `s2g_companion_entitlements`
  - `(companion_slug, tier)` PK; `mode` enum (`none|basic|standard|full|full_plus`); `monthly_quota` int nullable (null = unlimited, 0 = none); `notes`.
- `s2g_companion_usage`
  - `user_id`, `companion_slug`, `period_yyyymm` (text), `count` int, `last_used_at`. Unique on (`user_id`,`companion_slug`,`period_yyyymm`).
- `s2g_companion_runs` (audit/history)
  - `user_id`, `companion_slug`, `tier_at_run`, `model`, `input_summary`, `output_summary`, `tokens_in`, `tokens_out`, `status`, `error`, `created_at`.

Helper SECURITY DEFINER function:
- `get_effective_tier(_user uuid)` → returns `sower|keeper|ambassador|council`, factoring `s2g_agent_free_access` (council) and `profiles.membership_tier`.
- `check_and_consume_companion_quota(_user uuid, _slug text)` → returns `{ allowed boolean, mode text, remaining int|null, reset_on date }` and increments usage atomically when allowed.

RLS:
- `s2g_companions`, `s2g_companion_entitlements`: public read.
- `s2g_companion_usage`, `s2g_companion_runs`: owner-only read; writes via service-role only (edge functions).

Seed entitlements from the matrix above.

## 3. Edge functions (Lovable AI Gateway)

Single unified router function so we don't duplicate boilerplate:

- `companion-invoke` (POST, JWT-verified)
  - Input: `{ companion: slug, action: string, input: {...}, stream?: boolean }`
  - Steps: validate JWT → resolve effective tier → call `check_and_consume_companion_quota` → load companion config → build per-companion system prompt → call `https://ai.gateway.lovable.dev/v1/chat/completions` with `google/gemini-3-flash-preview` (text) or `google/gemini-2.5-flash-image` (Kali) or video tool for Fedora → stream tokens back as SSE; log to `s2g_companion_runs`.
  - Surfaces 402/429 from gateway as user-friendly errors.

Companion-specific actions handled inside the router:

- Gentoo: `daily_briefing`, `route_task`, `login_greeting`
- Tux: `draft_post`, `caption`, `content_calendar`
- Ubuntu: `review_tone` (also exposed as a pre-publish hook)
- Kali: `generate_image`, `refine_image` (image model)
- Fedora: `generate_video_brief` (text plan; real video gen stays opt-in)
- Debian: `draft_message`, `auto_outreach` (Ambassador+ only — server enforces)
- Arch: `start_hearthcall`, `route_call` (wraps existing Jitsi flow)
- Mint: `weekly_report`, `bestowal_summary` (queries existing tables)
- Loaf: `stock_snapshot`, `delivery_status` (queries products/orders)
- Sage: `price_suggestion`, `post_timing_insight`

A second function `companion-entitlements` (GET) returns the calling user's effective tier + per-companion remaining quota for the UI.

## 4. Frontend

New pages/components (semantic tokens, glassy cards consistent with existing dashboard):

- `src/pages/CompanionsHubPage.tsx` route `/companions` — grid of 10 companion cards (emoji, name, title, summary, your tier badge, "remaining this month", `Open` button). Uses `companion-entitlements`.
- `src/components/companions/CompanionCard.tsx`
- `src/components/companions/CompanionDrawer.tsx` — opens a chat/action drawer per companion; streams via `companion-invoke`. Renders markdown with `react-markdown`. Uses `useSacredNow()` for timestamps.
- `src/components/companions/UpgradeTierDialog.tsx` — shown when quota exceeded or capability locked; deep-links into existing pricing.
- `src/lib/companions/registry.ts` — slug → emoji/name/title/category/intro prompt; single source of truth used in UI and edge function (mirrored).
- `src/hooks/useCompanions.ts` — fetches entitlements; exposes `invoke(companion, action, input)` with quota error toasts.

Dashboard integration:
- New "Orchard Companions" panel on `DashboardPage` showing top 4 (Gentoo, Tux, Kali, Mint) with their remaining quota and a `See all` link to `/companions`.
- Top nav: add Companions link (Ambassador-only items still get a lock icon for lower tiers).

Wire into existing flows:
- Replace ad-hoc `useAIAssistant`, `SmartHashtagGenerator`, `OrchardMarketingAssistant`, `CommunityOfferingGenerator`, `VideoCreationWizard` calls to go through `companion-invoke` (Tux for content, Kali for images, Fedora for video, Mint for finance summaries). Keep existing UI; swap the network layer.

## 5. Tier display and gating

- `useEffectiveTier()` hook (wraps `get_effective_tier` RPC).
- `<RequiresTier min="ambassador">` wrapper component greys out / shows upgrade CTA for locked companions/actions.
- Founder accounts always render as Council with no quota counters.

## 6. Telemetry and growth loop

- Every successful run writes to `s2g_companion_runs` with token counts → enables future "tribe gets smarter as it grows" features (per-tribe fine-tuning context, leaderboard of helpful companions, Sage drawing from aggregate insights).
- Admin page `/admin/companions` (admin role only): usage by tier, quota saturation, top failing actions.

## Technical details

- Edge functions live in `supabase/functions/companion-invoke/index.ts` and `supabase/functions/companion-entitlements/index.ts`. Both: secure CORS (allowlisted origins via existing `_shared/security.ts`), JWT verification in code, zod input validation, SSE streaming for `companion-invoke`.
- All AI calls go through Lovable AI Gateway with `LOVABLE_API_KEY` (already configured). Default model `google/gemini-3-flash-preview`; Kali uses `google/gemini-2.5-flash-image`; Sage/Mint reports use `google/gemini-2.5-pro` for higher quality.
- Quota reset is calendar-month based via `period_yyyymm`; "remaining" computed as `monthly_quota - count` (null quota = unlimited).
- All new tables enable RLS with owner-only policies on user-scoped rows; catalog tables are public-read.
- No service-role key ever touches the client; only edge functions read it.

## Out of scope (this pass)

- Actually generating final long-form videos for Fedora (we only generate the brief/plan; real video gen remains the existing wizard).
- Auto-running Ubuntu reviews on every existing post — we add the action and the pre-publish hook, but don't retro-scan history.
- Charging logic for tiers — we use existing `profiles.membership_tier` + `s2g_agent_free_access`. Switching plans stays in the existing billing flow.

## What you'll see when this ships

- New `/companions` hub with all 10 companions.
- Companion cards on the dashboard with live quota.
- Each companion opens a chat drawer that streams answers and respects your tier.
- Existing AI helpers (hashtags, offerings, video wizard) keep working but route through the companion system.
- Founders get unlimited everything automatically.
