# CLAUDE.md

## This app is live and published
Changes reach real users. There is no staging buffer implied by default — treat every change as production-impacting unless told otherwise.

## Stack
- Vite + React + TypeScript, shadcn-ui, Tailwind CSS
- Supabase (Postgres, Auth, Edge Functions) as the backend
- Payments: Cryptomus (primary) and Binance Pay (legacy) — edge functions live in `supabase/functions/`
- Testing: Vitest + React Testing Library (`src/test/`), Cypress for e2e (`cypress/e2e/`), k6 for load testing
- This is a Lovable-managed project — Lovable's AI agent can push commits directly to this repo. Pull before starting work to avoid clobbering Lovable-side changes, and expect commit history to include Lovable's own auto-commits.

## Golden rule: every page needs a way back
Every routed page must have a visible Back/Return control (a real back action, or a Home/parent-page link — not just relying on the browser's back button). Apply this whenever touching a page for any other reason, and treat a missing one as worth fixing on sight, not just when asked.
Exempt: `/` (Index) and `/dashboard` (DashboardPage) — they're the app's home destinations. Don't re-flag them in a future audit.

## Product principles
- Forms should feel like planting, not paperwork. Show visible progress toward a satisfying completion, ideally using the sower's own content.
- Errors are always plain, specific and actionable. Never gamify a mistake — tell the person exactly what's wrong and how to fix it.
- Keep it simple. If a field isn't needed for this category of seed, don't show it.

## Stay in scope
- Don't refactor unrelated code, restyle unrelated screens, change branding, alter database structure, add dependencies, or change business rules that weren't asked for.
- Before editing a shared component, check everywhere else it's used.
- Only touch files directly required for the requested change. Propose unrelated cleanups separately rather than bundling them in.

## Stop instead of guessing
If a request conflicts with the codebase, or you're missing information needed to do it correctly, say so and make no changes. Don't work around it or guess at intent.

## Diagnose before fixing
Before changing code to fix a bug, state:
1. What should have happened
2. What actually happened
3. Which layer caused it (UI, client logic, edge function, database, third-party API)
4. The likely root cause

Then make the smallest correct fix. Don't stack fixes on top of each other or patch symptoms without identifying the cause.

## Protected areas
Treat these as protected unless explicitly asked to change them: auth, user roles, Ambassador/Tribal tiers, RLS policies, existing tables, the Bestowal ledger, payments, messaging, notifications, live streaming, Jitsi calls, Orchard Companions, Tribal Hearts, navigation.

## TypeScript migration ratchet
(see `CONTRIBUTING.md` for full detail)
- All new files must be `.ts`/`.tsx` — no new `.js`/`.jsx`.
- Only convert an existing `.jsx` file to `.tsx` when you're already touching it for a real change. No standalone "convert to TS" PRs.
- Existing `.jsx` files are grandfathered — leave them alone until naturally touched.

## Payment code
- Payment/fee logic (Cryptomus, Binance Pay, bestowal distribution, wallet balances) is the most incident-prone part of this codebase — recent commit history shows repeated fee-bypass and payment-flow bugs. Changes here need extra care:
  - Trace the full money path (client → edge function → Supabase tables) before changing fee or distribution math.
  - Don't touch payment/fee code as a side effect of an unrelated change.

## Testing
- `npm run lint` — ESLint
- `npm test` — Vitest unit/integration tests
- `npx cypress run` — e2e tests
- Run lint + relevant tests before considering a change done, especially for payment or edge-function changes.

## Supabase edge functions
- Live in `supabase/functions/`. Required env vars for payment functions are documented in `README.md`.
- Treat RLS policies as part of the security surface — don't bypass them from client code.
