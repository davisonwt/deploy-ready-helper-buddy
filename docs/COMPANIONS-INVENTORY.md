# Orchard Companions — Inventory

Scope: `/companions` (`CompanionsHubPage`), `CompanionCard`/`CompanionDrawer`, the
`companion-entitlements`/`companion-invoke` edge functions, `s2g_companions` /
`s2g_companion_entitlements` / `s2g_companion_usage` / `s2g_companion_runs`,
and the prompts in `companion-invoke/index.ts`. No code changed.

## How it actually works today

One engine for all 20: `CompanionDrawer` posts the chat to `companion-invoke`,
which picks the companion's system prompt from a hardcoded `SYSTEM_PROMPTS`
map, calls the Lovable AI gateway (`google/gemini-3-flash-preview` for most,
`gemini-2.5-pro` for the "coaching" ones, `gemini-2.5-flash-image` for
Willow), and logs the run to `s2g_companion_runs`. Access is gated per
request by `check_and_consume_companion_quota()`, which reads the caller's
tier (`get_effective_tier` — from `profiles.membership_tier`, or `council`
for admin/gosat/`s2g_agent_free_access`) against `s2g_companion_entitlements`
and increments `s2g_companion_usage` (monthly, per companion). A `mode:
'none'` row means the companion is invisible in the UI ("Not in your tier",
Open button disabled) — there is no per-companion preview.

Four companions are **data-grounded** (real tool calls against live tables,
scoped to `auth.uid()`): Beech (`get_bestowal_summary`), Alder
(`get_low_stock_products`/`get_open_orders`), Hawthorn
(`get_price_benchmarks`), Thresh (`get_seed_performance`). Birch is the one
companion with a real generation pipeline: once its prompt emits a
` ```json {reel_plan} ``` ` block, `BirchGenerationPanel` offers explicit-click
buttons that call `generate-thumbnail`, `generate-video`, `generate-voiceover`
and `postArtifactToGrove` — genuine image/video/audio artifacts, postable to
SeedFlow. Willow returns a real generated image inline. Every other companion
is advisory-only chat with no tool access and no side effect beyond text —
several (Elm, Hickory, Grain, Sheaf) say so explicitly in their own prompt
("you'll send/place/deliver it yourself").

A time-bound **admin promo** exists (`CompanionPromoControl`,
`app_settings.companion_promo_ends_at`): while active it removes the monthly
quota cap for companions *already visible* to sower tier, with safety
ceilings (100 img / 100 voice / 50 video per user per 24h, 500 video/24h
platform-wide). It does not unlock `mode:'none'` companions — there is
currently no "try me" path into a locked companion at all.

## Inventory

| Companion | Member-facing purpose | What it does today | Sower | Keeper | Ambassador/Council |
|---|---|---|---|---|---|
| 🌳 Linden — Grove Overseer | Daily briefing & routing | Chat only, no tools | basic (∞) | standard (∞) | full / full+ (∞) |
| 🍁 Maple — Story Sower | Draft SeedFlow posts/captions | Chat only | basic (3/mo) | standard (10/mo) | full / full+ (∞) |
| 🌲 Cypress — Voice Guardian | Tone/brand review of drafts | Chat only | basic (5/mo) | standard (20/mo) | full / full+ (∞) |
| 🌿 Willow — Vision Weaver | Generate seed cover images | **Real image gen** (Gemini image model) | basic (3/mo) | standard (10/mo) | full / full+ (∞) |
| 🎬 Birch — Reel Keeper | Plan + build video reels | **Real pipeline**: image→video→voiceover→post-to-Grove | locked | locked | full / full+ (∞) |
| 💬 Elm — Hearth Messenger | Draft outreach/thank-yous | Chat only, drafts you send yourself | locked | basic (10/mo) | full / full+ (∞) |
| 📞 Hickory — Bridge Caller | Plan HearthCall agendas | Chat only | basic (∞) | basic (∞) | full / full+ (∞) |
| 📒 Beech — Pocket Keeper | Read your bestowal numbers | **Real tool**: live bestowal totals | basic (2/mo) | standard (8/mo) | full / full+ (∞) |
| 🥖 Alder — Storehouse Steward | Stock/order reasoning | **Real tool**: live stock + orders | locked | basic (10/mo) | full / full+ (∞) |
| 🔮 Hawthorn — Harvest Oracle | Pricing suggestions | **Real tool**: live price benchmarks | locked | basic (5/mo) | full / full+ (∞) |
| 🐝 Hive — Room Conductor | Live-room format coaching | Chat only | locked | locked | full / full+ (∞) |
| 🍯 Nectar — Engagement Alchemist | Mid-session engagement ideas | Chat only | locked | locked | full / full+ (∞) |
| 🌸 Petal — Audience Matcher | Who to invite to a live room | Chat only, no real tribe data | locked | locked | full / full+ (∞) |
| 🌰 Acorn — Seed Intake | Interviews first-time sowers | Chat only | basic (5/mo) | standard (20/mo) | full / full+ (∞) |
| 🪵 Root — Identity Forger | Distills a seller identity profile | Chat only (JSON out) | locked | basic (5/mo) | full / full+ (∞) |
| 🌷 Bud — Promise Designer | Designs bestowal tiers | Chat only (JSON out) | locked | basic (5/mo) | full / full+ (∞) |
| 🌾 Grain — Follow-Up Forger | Thank-you notes per bestower | Chat only, you deliver them | basic (∞) | standard (∞) | full / full+ (∞) |
| 🌻 Sheaf — Relationship Gardener | Nurture-message ideas | Chat only | locked | basic (∞) | full / full+ (∞) |
| 🌿 Thresh — Feedback Distiller | Session retro | **Real tool**: live seed analytics | locked | basic (4/mo) | full / full+ (∞) |
| 🌳 Groundskeeper — Grove Steward | Routes you to the right companion | Chat only | basic (∞) | standard (∞) | full / full+ (∞) |

*"∞" = `monthly_quota IS NULL` (unlimited within mode); "locked" = `mode:'none'`, invisible/disabled in the UI for that tier.*

## Pricing (companions are not separately priced today)

Membership tiers (sower/keeper/ambassador/council) are earned, not
purchased — no price exists anywhere in code for companion access itself.
Given what's real vs. advisory above, a standalone **Companions pass** could
reasonably sit at:

- **Low ($4.99/mo):** unlocks Keeper-equivalent quotas for the advisory-chat
  companions only (Elm, Root, Bud, Sheaf, Hive, Nectar, Petal) — cheap
  because there's no compute-heavy generation behind it.
- **Mid ($14.99/mo) — recommended:** the above **plus** Alder, Hawthorn,
  Thresh (real data tools) and a modest Willow/Birch allowance — this is
  where the pass earns its keep, since it's gating genuine generation cost.
- **High ($29.99/mo):** Ambassador-equivalent access across the board,
  including higher Birch/Willow caps — positioned as a "full studio" tier
  for active sowers who lean on Birch for reels weekly.

## 30-day pass storage

`feature_subscriptions` (id, user_id, feature, status, current_period_start,
current_period_end, price_usd, period, source, source_ref) already exists,
is unused (0 rows live), and fits a companions pass directly: `feature =
'companions_pass'`, `period = '30d'`, `current_period_end = now() + 30d`,
`price_usd` = whichever tier above. `get_effective_tier()` and
`check_and_consume_companion_quota()` would need one addition — check for an
active `feature_subscriptions` row and treat it like a temporary tier
override, the same way `s2g_agent_free_access` already does for `council`.
No new table needed.

## "Try me" demo path

**None exists.** A locked companion (`mode:'none'`) renders with a disabled
"Upgrade" button and zero preview — not even the `intro`/`examplePrompt`
already stored in `COMPANIONS` (`src/lib/companions/registry.ts`) is shown.
The only "try before you commit" mechanism today is the admin-toggled promo,
and it only lifts quota caps on companions a tier can *already* see — it
never exposes a locked one. A real demo path would need either (a) a
single free "sample" reply per locked companion per user (new usage-tracked
RPC), or (b) surfacing the existing `intro`/`examplePrompt` copy on locked
cards so members at least see what they'd be paying for.
