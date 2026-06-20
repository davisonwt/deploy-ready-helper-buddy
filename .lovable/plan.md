# Phase 1 — Real tool-calling for Beech, Alder, Thresh (+ Hawthorn lite)

Read-only, caller-scoped tool access added to `supabase/functions/companion-invoke/index.ts`. No new tables, no schema changes, no RLS changes. UI (drawer) unchanged.

## 1. Does the gateway support tool-calling?

Yes. Lovable AI Gateway is OpenAI-compatible and the Gemini models in use (`google/gemini-3-flash-preview`, `google/gemini-2.5-pro`) accept the standard `tools` / `tool_choice` request fields and emit `tool_calls` on the assistant message. The shape we already POST to `https://ai.gateway.lovable.dev/v1/chat/completions` just gains:

Request additions (only when the companion has tools):
```
{
  ...existing...,
  tools: [ { type:"function", function:{ name, description, parameters:<json-schema> } }, ... ],
  tool_choice: "auto"
}
```

Response shape we must newly handle:
```
choices[0].message = {
  role:"assistant",
  content: null | "",
  tool_calls: [ { id, type:"function", function:{ name, arguments:"<json string>" } } ]
}
```
When `tool_calls` is present we execute each, then append:
- the assistant message (verbatim, including `tool_calls`)
- one `{ role:"tool", tool_call_id, name, content:"<json result>" }` per call

…and POST again. Loop until the model returns plain `content` with no `tool_calls`, capped at 3 rounds (defense against runaway loops; these are narrow report tools).

## 2. Tables / columns each tool will use (verified against live schema)

**Beech — `get_bestowal_summary({ days?: 7|30|90 })`**
- `public.bestowals` joined to `public.orchards`.
- Caller scope: `orchards.user_id = auth.uid()`.
- Read: `base_amount` (USDC numeric), `amount`, `currency`, `payout_status`, `release_status`, `created_at`.
- Returns: `{ window_days, total_count, total_base_amount, by_status:{pending,released,paid}, top_orchards:[{orchard_id,title,count,amount}], last_7_days_trend }`.

**Alder — two tools:**
- `get_low_stock_products({ threshold?: number = 5 })` → `public.provider_products` joined to `public.providers` where `providers.user_id = auth.uid()`. Columns: `id, title, price, stock, status`. Returns rows with `stock <= threshold`.
- `get_open_orders({ limit?: number = 20 })` → `public.provider_orders` joined to `public.providers` where `providers.user_id = auth.uid()` and `status IN ('pending','accepted','in_transit','escrow_held')`. Columns: `id, product_id, quantity, total_amount, status, escrow_status, delivery_city, delivery_country, created_at`.

**Thresh — `get_seed_performance({ days?: 7|30, seed_id?: uuid })`**
- `public.seed_analytics_daily` where `user_id = auth.uid()` (this table already has a per-user `user_id`, no join needed).
- Read: `seed_id, metric_date, views, reach, clicks, messages, calls, bestowals_count, bestowals_amount`.
- Returns aggregated totals + per-seed breakdown, sorted by `bestowals_amount` desc. If `seed_id` given, that seed only.

**Hawthorn — `get_price_benchmarks({ category?: string })` (optional, lightweight)**
- `public.products` aggregate (this is platform-wide reference data, not the caller's private data): `min/median/max(price)` grouped by `category` (or filtered). No `auth.uid()` needed since `products` already has public-read RLS for active listings; we'll add `status='active'` filter.
- Honest framing: "median/range across active listings" — not "performance insights about you."
- If you'd rather keep Hawthorn pure-chat for now, skip this one tool and the rest of the plan still stands.

> **No fabricated tables.** I deliberately did **not** add tools for live-session "engagement analytics" beyond `seed_analytics_daily` + `radio_live_sessions.peak_listeners/total_bestow_amount`. If Thresh needs radio-session granularity later, that's a separate phase — `radio_live_sessions` links to `radio_schedule` which would need a join to find the caller's hosted sessions; I'll defer until you confirm the host linkage you want.

## 3. Caller-scope pattern (RLS-safe)

We will use the **service-role admin client we already create** (`admin`) but **always** add an explicit ownership filter derived from the verified `user.id` (from `userClient.auth.getUser()` against the caller's JWT). Why this over the user-JWT client:

- The user-JWT client would also work for `bestowals`/`provider_products`/`provider_orders` (RLS already restricts them), but it would couple correctness to RLS staying perfect on those tables forever. A service-role client + explicit `.eq` / join filter on the verified `user.id` is **belt-and-suspenders** and gives one consistent pattern across all four tools.
- The `user.id` comes from `auth.getUser()` on the caller's JWT — it cannot be spoofed by the prompt.
- The model **never** supplies a `user_id` argument. Tool input schemas deliberately omit any user/owner field; if the model tries, we ignore it.

Exact pattern, e.g. Beech:
```ts
// pseudo
const callerId = user.id; // from verified JWT, not from the model
const { data } = await admin
  .from("bestowals")
  .select("base_amount, amount, currency, payout_status, release_status, created_at, orchard_id, orchards!inner(user_id, title)")
  .eq("orchards.user_id", callerId)
  .gte("created_at", sinceIso)
  .limit(500);
```
Alder uses the same shape with `providers!inner(user_id)`. Thresh queries `seed_analytics_daily` with `.eq("user_id", callerId)` directly. Hawthorn's price benchmark intentionally has no caller filter — it's public reference data only.

Every tool result is capped (≤ 500 rows or pre-aggregated) before being stringified back to the model so we don't blow the context window or leak unbounded data.

## 4. companion-invoke/index.ts — file-level change plan

Inside `supabase/functions/companion-invoke/index.ts`:

1. Add a `TOOL_REGISTRY: Record<CompanionSlug, ToolDef[]>` mapping `beech`, `alder`, `thresh` (and optionally `hawthorn`) → an array of `{ name, description, parameters, execute(args, ctx) }`. Other companions stay unmapped → no tools sent → no behavior change for them.
2. Add `executeTool(name, argsJson, { admin, callerId })` that finds the registered handler, parses & validates args (zod-style guard inline; reject unknown fields, clamp `days`/`limit`/`threshold` to safe ranges), runs the query with the caller-scope pattern above, returns a compact JSON-serializable object or `{ error: "..." }`.
3. Refactor the single `fetch` to AI Gateway into a **tool loop**:
   - Build `aiBody` once. If the companion has tools, attach `tools` + `tool_choice:"auto"`.
   - Loop up to `MAX_TOOL_ROUNDS = 3`:
     - POST to gateway.
     - If response has `tool_calls`: append assistant message + one `tool` message per call (executed serially), continue.
     - Else: break with the final `content`/`images`.
   - If we exit the loop still pending tools, return the last `content` (or a graceful "I tried to look that up but couldn't finish — try again" message).
4. Logging in `s2g_companion_runs`: extend `output_summary` to note how many tool rounds + which tools fired (e.g. `"tools: get_bestowal_summary x1"`); count all rounds' usage tokens cumulatively for `tokens_in`/`tokens_out`. Keep `action` as-is; no schema change.
5. Quota: charge **one** quota unit per user request regardless of tool rounds (we already consumed it up front — leave that as-is). Tool-call rounds are internal.
6. Error model unchanged: 429 / 402 / generic 500 still surface the same way; if a tool itself errors we feed `{ error: "..." }` back to the model so it can apologize gracefully rather than crashing the whole request.
7. Image companion (`willow`) path is untouched — no tools attached, `modalities: ["image","text"]` still set, single round.

Loop sketch (in plain terms, not committed code):

```text
finalMessages = [system, ...history, user]
for round in 1..3:
  resp = POST gateway with finalMessages (+tools if any)
  msg  = resp.choices[0].message
  if !msg.tool_calls: return msg.content / msg.images
  finalMessages.push(msg)                          // assistant w/ tool_calls
  for call in msg.tool_calls:
    result = executeTool(call.function.name, call.function.arguments, ctx)
    finalMessages.push({ role:"tool", tool_call_id:call.id, name:call.function.name, content:JSON.stringify(result) })
return last msg.content  // safety net
```

## 5. Per-companion verdict (tools vs. pure chat)

| Companion | Verdict | Why |
|---|---|---|
| **Beech** | **Tools** (`get_bestowal_summary`) | `bestowals` ↔ `orchards.user_id` is the real receivables source for a sower. |
| **Alder** | **Tools** (`get_low_stock_products`, `get_open_orders`) | `provider_products.stock` + `provider_orders.status` are exactly the Field & Forge inventory/order rails. |
| **Thresh** | **Tools** (`get_seed_performance`) | `seed_analytics_daily` is a real per-user, per-seed metrics table with daily granularity. |
| **Hawthorn** | **Optional 1 tool** (`get_price_benchmarks`) | `products` price aggregates are real; "performance insights about you" is **not** real data we have — keep that framing out. If you'd rather stay pure-chat for Hawthorn this phase, that's honest too. |
| Linden, Maple, Cypress, Willow, Birch, Elm, Hickory, Acorn, Root, Bud, Hive, Nectar, Petal, Grain, Sheaf, Groundskeeper | **Pure chat** (no tools) | No first-party tables back their personas yet (no posting, no calling, no sending, no live-room state, no follower-graph reads with the right shape). Forcing tools here would re-create the overstated-claims problem we just fixed. |

## Scope lock

- No new tables, no migrations, no RLS edits, no UI edits, no companion text rewrites, no system-prompt rewrites beyond a one-line note appended to Beech/Alder/Thresh/Hawthorn telling them which tool they have. Drawer continues to render `text` + optional `image` exactly as today.
- Phase 0 wording stays as-is. If a tool fails or returns empty, the companion still answers honestly ("I checked and found no bestowals in the last 7 days") — that matches the honest-framing pass.

## Decisions I need from you before building

1. **Hawthorn**: include `get_price_benchmarks`, or keep Hawthorn pure-chat this phase? (Default if you don't answer: include it — it's small and honest.)
2. **`MAX_TOOL_ROUNDS = 3`** — OK, or do you want a different cap?
3. **Bestowal window default for Beech** — default to last 30 days if model doesn't pass `days`? (My pick: yes, 30.)

Reply with answers (or "all defaults, go") and I'll switch to build mode for Phase 1 only.