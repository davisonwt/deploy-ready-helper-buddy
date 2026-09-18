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

## Golden rule: every commit is pushed immediately
Every commit is pushed immediately; never leave commits local. State "pushed" in the summary only after `git push` succeeds.

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

## Golden rule: `npm run typecheck` is the only typecheck that counts
Run **`npm run typecheck`** (`tsc -p tsconfig.app.json --noEmit`). Nothing else
is evidence.

- **`npx tsc --noEmit` checks NOTHING.** The root `tsconfig.json` has
  `"files": []` and only project references, so it exits 0 having examined
  zero files. Every "typecheck clean" claimed in the week to 2026-09-17 was
  that command, and it meant nothing.
- **`npm run build` does not typecheck.** It is `vite build`, which uses
  esbuild; esbuild strips types rather than checking them. An undefined
  identifier builds happily and crashes in the browser.
- **ESLint does not catch undefined identifiers** in `.ts`/`.tsx` either; the
  TypeScript ESLint config leaves that to `tsc`.
- **Never pipe it.** `tsc … | head` reports the pipe's exit code, not tsc's,
  so it always looks like 0, and `head` closing the pipe truncates the errors.
  Redirect to a file instead: `npm run typecheck > out.log 2>&1; echo $?`.
- **It takes roughly ten minutes on this machine.** That is normal. Run it in
  the background and wait, rather than reaching for a faster command that
  checks nothing.

This is how a crash reached production on 2026-09-17: three "clean"
typechecks, a successful build, and a clean lint, all blind to a call to a
function that was never imported.

## Golden rule: a patch asserts its anchor matched
Any scripted edit to a file — a string replace, a regex substitution, a
generated patch — must **assert that its anchor matched before proceeding**,
and fail loudly when it does not. Never let a replace that matched nothing
pass for a replace that worked.

On 2026-09-17 an import was patched with a plain string replace written
against a single-line form of an import that actually spans three lines. It
matched nothing, changed nothing, reported nothing, and shipped a crash that
took the Sleeping Seeds hub down for every member. The neighbouring edits in
the same script all asserted; that one did not, which is the only reason it
got through.

Assert the count is exactly what you expect (usually 1), and when an edit
applies to one of several similar blocks, slice the file to that block first
rather than relying on a longer and more brittle match.

## Golden rule: icons are lucide-react, full stop
This project uses **`lucide-react`** for icons. No skill, template, dataset or
recommendation introduces Phosphor, Heroicons or any other icon set, and **no
new icon dependency is added without the user's explicit approval.** If a
suggested icon does not exist in lucide, pick the closest lucide icon or ask.
Do not install a second set to get one glyph.

Why this is written down: `.claude/skills/ui-ux-pro-max/SKILL.md` declares
Phosphor (`@phosphor-icons/react`) as its default icon library, tells the
agent to pick any semantically closer icon from Phosphor's full set, and
offers Heroicons as a fallback. That guidance sits at lines 633 to 636, in
Chinese, well below the description, so it is easy to follow without noticing
it contradicts this repo. As of 2026-09-17 `lucide-react` is the only icon
dependency and is imported in 515 files; adding a second set would mean two
icon languages in one interface for no gain.

## Golden rule: snapshot member content before overwriting it
Before ANY script or migration that overwrites or nulls a column holding
member-created content, first write a snapshot of the affected rows to
`scripts/studio/` as an executable restore script, and give the user its full
path. No exceptions, no matter how small the change looks.

Member-created content is anything a member placed or typed themselves:
`stalls.hotspots` and `stalls.tiles`, the `*_seed_details` rows behind a
listing, profile fields, stall names, taglines and stories, references,
rates. If you are unsure whether a column qualifies, it qualifies.

The restore script must be runnable on its own and must name the rows it
restores explicitly, not by a `WHERE` clause that could match differently
later.

Why: on 2026-09-11 `scripts/studio/use-template-interior.sql` set one
member's `stalls.hotspots` to NULL so his stall would inherit a shared
template's hotspots instead. The intent was reasonable and the change was
small. His own placements were unrecoverable, and he discovered it six days
later. A snapshot would have made it a one-line fix.

## Golden rule: regression check before claiming done
Before reporting any change as verified, re-run the existing live specs in
`tests/live/` for anything the change could plausibly touch. A new test for
the thing you just built proves that thing works. It proves nothing about
what you broke on the way.

**When this is mandatory**, not optional: the change touches a shared
component or helper, a database constraint or trigger, or more than a
handful of files. In those cases the report must **name which existing specs
you re-ran and their results**. "My new test passes" is not evidence that
nothing else broke, and must not be offered as though it were.

**Test the real path, not a convenient approximation of it.** A rehearsal
inside a single transaction does not prove behaviour through PostgREST,
which gives every request its own transaction. A database-level probe does
not prove the form works. If the thing that can break is a live form
submission, submit the form.

Two outages came through this gap, both with a test already written that
nobody re-ran:

- **2026-09-16** — a cosmetic image-loading sweep across 38 files took down
  every stall interior, because one converted tag carried a React ref the
  new component silently dropped. `tests/live/stall-hotspots.spec.ts`
  existed and would have caught it.
- **2026-09-17** — a deferred constraint trigger blocked every household
  Hand listing. Only an in-transaction rehearsal was run, and a transaction
  is exactly the condition that does not hold in production. One live form
  submission would have caught it.

## Golden rule: a live spec never skips silently
If a spec cannot run -- missing credentials, missing fixture, missing seeded
row -- it **FAILS and says why**. It must never `test.skip` its way to green.

On 2026-09-18 an audit found **nine of 42 live specs reporting green having
never executed**. They gated on `process.env.TEST_USER_EMAIL ?? ''` and
friends, names that `.env.test` has never defined, so `test.skip(!HOST_EMAIL,
...)` fired on every run. That silence covered **every spec on the live-session
audio path** -- `gathering-room`, `gathering-room-3way`,
`mic-silence-and-portrait`, `live-now-directory`,
`scripture-study-speaker-queue` -- which is precisely where two real
multi-person audio bugs reached members: participants going silent on each
other, and remote audio stopping on a view change. The suite was green
throughout.

A green suite that never ran is worse than a red one. Red gets investigated;
green gets trusted.

- `test.skip` is for a case that genuinely does not apply on this run (a
  desktop-only check on mobile), never for "I could not get set up."
- A missing fixture throws with the exact command that creates it.
- When adding a spec that reads `process.env.X`, confirm `X` exists in
  `.env.test`. If it needs a new identity, add it there in the same commit.
- The audit is one script:
  `node scripts/audit-spec-skips.mjs` -- it cross-references every
  `test.skip` against the names `.env.test` actually defines. Note that
  `?? ''` is NOT a default; it is exactly what makes the skip fire.

## TypeScript migration ratchet
(see `CONTRIBUTING.md` for full detail)
- All new files must be `.ts`/`.tsx` — no new `.js`/`.jsx`.
- Only convert an existing `.jsx` file to `.tsx` when you're already touching it for a real change. No standalone "convert to TS" PRs.
- Existing `.jsx` files are grandfathered — leave them alone until naturally touched.

## Decided: currency, conversion and disclosure
When a listing's currency and the guest's card currency differ, **the rail
converts and the rate is disclosed before the guest pays.** We do not restrict
who can pay. Decided by the user on 2026-09-17; build toward it.

Context, so the shape of the work is clear:

- A listing carries its own currency (`pillow_seed_details.currency` and the
  wheel and hand equivalents) and always has. `bookings.currency` now carries
  it too, set from the listing by a trigger that ignores anything the client
  sends, because a guest's browser must not choose what it is charged in.
- **PayPal cannot charge ZAR.** ZAR is not among PayPal's 28 supported
  currencies, and that is not an account setting. Any rand listing paid by
  PayPal is converted by definition.
- The Paystack helper converts *from* USD (`amountUsd * fxRate`), so it is
  correct only when the stored amount really is dollars. A rand listing sent
  through it today would be multiplied by the rate, not divided.
- Still to do, and deliberately not done yet: carry the currency into the
  rails, the capture path, the ledger, `sower_balances`, Books and the
  treasury. Several of those columns default to `'USD'`, which is how the
  original bug survived.

## Payment code
- Payment/fee logic (Cryptomus, Binance Pay, bestowal distribution, wallet balances) is the most incident-prone part of this codebase — recent commit history shows repeated fee-bypass and payment-flow bugs. Changes here need extra care:
  - Trace the full money path (client → edge function → Supabase tables) before changing fee or distribution math.
  - Don't touch payment/fee code as a side effect of an unrelated change.

## Testing
- `npm run typecheck` — the real typecheck, ~10 min, never piped. See the
  golden rule above; `npx tsc --noEmit` and `npm run build` check nothing.
- `npm run lint` — ESLint
- `npm test` — Vitest unit/integration tests
- `npx cypress run` — e2e tests
- Run lint + relevant tests before considering a change done, especially for payment or edge-function changes.

## Supabase edge functions
- Live in `supabase/functions/`. Required env vars for payment functions are documented in `README.md`.
- Treat RLS policies as part of the security surface — don't bypass them from client code.

## Speed rules
1. Never stash/revert source to prove a test fails before restoring it. Trust the diff.
2. No hermetic fixtures when `.env.test` creds exist — test against the live `TEST_BASE_URL` instead.
3. Run only the spec you touched, not the whole suite — **unless the
   regression rule above applies** (shared component or helper, database
   constraint, or more than a handful of files), in which case the
   regression rule wins and you re-run the affected specs too. Speed
   never overrides it; the two outages it names both cost more time than
   every skipped spec has ever saved.
4. Reports are ≤ 10 lines: hash, what changed, what's verified, what's not.
5. Don't rewrite comments or explain history in code — say it in the commit message instead.
6. One commit per task, pushed immediately.
