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

## Golden rule: a live spec never mutates real member data

A spec may edit, pause, publish, archive or delete **only rows it created
itself, this run, under its own QA title**. The founder's account is not
an exception -- `TEST_GOSAT_EMAIL` is `davison.taljaard@icloud.com`, a
real member with real listings and a real stall, and 36 live specs sign
in as him.

Read his rows freely. Never write to them.

"Act on it and put it back afterwards" is not a safe pattern and is not
allowed. Both attempts at it in this repo failed open, and both failed
**silently**:

- **2026-09-22** -- `my-listings` test 4 clicked "Make unavailable" on
  "Silver Hyundai Venue", then failed on the next assertion, so the
  re-enable never ran. Its `afterAll` net looked for a "Make available"
  button, found none, did nothing and logged nothing. The listing left
  `/sleeping?tab=wheels` (the RPC requires `and d.availability`) while
  still showing in My Listings, which is exactly how the owner found it.
  The same spec did the same thing on **2026-09-17**.
- **2026-09-22** -- `stall-hotspot-editor` deleted the mugs shelf from his
  stall and published. Its header said "the caller restores the row
  afterwards". There was no caller and no restore. Hotspots went 11 -> 10.

The second one carries the sharper lesson: the obvious repair,
re-running `scripts/studio/add-mug-hotspot.sql`, would have restored the
**template's** box -- label "Mugs", x 11.5, w 6.5 -- when what was lost
was the owner's own, renamed, moved and resized ("Coffee Mugs", x 3.697,
w 12). The count would have read 11 again and his placement would have
been gone. Restore from the dump, never from the thing that looks like
it.

How to do it instead, both now in `tests/live/support/fixtures.ts`:

- Need a listing to edit, pause or delete? `createWheelListing()` makes
  one and `sweepProducts()` removes it in `afterAll`.
- Need a hotspot to delete? `addHotspot()` appends yours;
  `restoreHotspots()` puts the whole array back **unconditionally** in
  `afterAll` and fails loudly if the row does not come back the right
  length.
- Teardown belongs in `afterAll`, never in a final test: these files are
  `test.describe.serial`, so one failure marks every later test "did not
  run" and a cleanup test is skipped on exactly the runs that leak.
- Scope every destructive locator to the fixture's own card, and assert
  the target contains the QA title before clicking. `.first()` on an
  unscoped locator took a real listing offline on 2026-09-17.

Row counts do not catch this class of damage. A paused listing and a
deleted hotspot both leave the counts unchanged, which is why the
residue check now also asserts per-listing `availability` and `status`
and per-stall `hotspots`/`tiles` lengths.

## Test fixtures
Live verifications create their own fixtures at run start and **DELETE
them at run end**. No test stall, seed, slot, or upload may outlive its
run -- not "cleaned up eventually," not "left for the next session to
find," gone before the report is written.

Every verification report ends with an explicit residue check: list what
was created, prove it's gone (a count query, a screenshot, a "0 rows
left" -- something checkable, not just "cleaned up"). A report that
claims cleanup without showing the check is the same failure mode as a
spec that skips silently and reports green.

A run that needs a stall to test against creates a minimal one (no
template, unpublished unless the test specifically needs published) and
tears it down in the same run -- never reuses a "the test stall" left
over from a previous session, and never leaves one behind for a future
session to reuse. Reuse is exactly how "Sabbath Test Stall" on
davisontest1 became a persistent fixture that had to be torn down
explicitly on 2026-09-21, complete with 14 unrelated leftover product
rows and 8 stray storage objects from earlier, uncleaned rounds.

This costs real time on every run that needs a stall/seed/slot to exist
-- setup and teardown are now mandatory work, not something to skip
because "davisontest1 already has one." State that cost plainly when it
applies; do not quietly build a persistent fixture to avoid paying it.

## Golden rule: back up before you destroy anything

Two separate rules, because the two backups cover different things and one
of them covers nothing at all.

**Before any destructive migration or bulk data operation, take a local
database dump:**

```
pwsh -File scripts/studio/local-db-dump.ps1
```

It writes to `C:\Users\Ezra\S2G-backups\` -- outside the repo, and the
script refuses to write anywhere inside it. The dump holds real member
data: never commit it, never push it, never move it into the repo to "keep
it with the code". The connection string is read from `$env:S2G_DB_URL` (or
`DATABASE_URL` / `SUPABASE_DB_URL`) and is never hardcoded; put it in a
gitignored file such as `.env.db`, which the `.env*` rule in `.gitignore`
already covers.

It also runs unattended as the Windows Task Scheduler job **"S2G daily DB
dump"**, daily at 07:00 local, with *Run task as soon as possible after a
scheduled start is missed* on. Two honest limits: the PC has to be awake
for it to fire, and a skipped day means the newest dump is the previous
one -- up to 48 hours stale by the following morning. It is a
laptop-availability backup, not a guarantee; Supabase's own dailies remain
the floor, and PITR is off.

**Destructive Storage operations (bulk object deletes, teardowns) archive
the exact bytes to a local folder outside the repo BEFORE deleting, and the
report names the archive path. Database backups do NOT contain Storage file
bytes -- a deleted object is gone forever.**

That second rule is the one that is easy to get wrong, because a database
backup feels like it covers everything. It does not. Supabase's daily
backups are physical Postgres backups; every stall image, PDF, voice note
and cover lives in S3 and is not in them. Measured 2026-09-21: daily
backups on, 7 days present, **PITR off** -- so even for the database the
granularity is one snapshot per morning.

On 2026-09-21, 39 orphaned Gathering objects were deleted from the `stalls`
bucket with only a written manifest of their names and sizes
(`scripts/studio/gathering-orphans-2026-09-21.md`). The manifest says
plainly that it is not a restore script. It should have been an archive of
the bytes.

## Golden rule: repeated hotspots on a stall interior are the point

Multiple hotspots of the same kind or the same label on one stall
interior are **intentional**. The interior is a room to explore: a
sower's products, books and story pieces are hidden in different places
in the image, and finding them is the mechanic. Two boxes opening the
same shelf from opposite corners is a treasure hunt, not a bug.

So:

- **Never dedupe, consolidate or auto-clean same-kind hotspots**, and
  never report them as an error, a warning or "drift" in an audit.
- **No spec may assume label or kind uniqueness on any stall.** Locate a
  hotspot with `.first()` or by position, compare label sets as
  multisets, and never assert that a kind appears once.
- A count that looks "too high" for a stall is not evidence of
  duplication. Ask the owner before touching it; the answer is usually
  that they put it there.

Why this is written down: on 2026-09-21 davison.taljaard's 11 hotspots
(3x story, 3x books, 3x music, lyrics, mugs) were taken for duplicates
left behind by `0222fb67` and queued for cleanup. They were not. A
snapshot from 2026-09-18 -- two days before that commit -- holds the same
11 entries byte for byte, ids and order included. They are the hunt.
Deleting the three "extra" boxes would also have broken five live specs
that locate hotspots on that stall by stored label.

`tests/live/stall-interior-framing.spec.ts` asserting 11 with repeated
labels is the CORRECT shape, not a stale expectation to be tidied down
to something prettier.

## Golden rule: crypto on S2G is Solana, via Phantom

**Do not propose NOWPayments.** It has been raised and rejected more than
once. Crypto in and crypto out are both Solana; members connect a Phantom
wallet and are paid in USDC on Solana.

What is actually live, measured 2026-09-18:

- **Crypto out is the ONLY payout rail any member has configured.**
  `profiles.payout_network` reads `solana_usdc` for 7 members, each with an
  address; **nobody** has any other network set. `payout-earnings` splits
  owed rows on that column and sends the Solana leg straight from the hot
  wallet (`_shared/solanaPayout.ts`); the PayPal leg is real code that no
  member has selected.
- **Crypto in** is `create-solana-bestowal-order`, `check-solana-payment`,
  `sweep-solana-payments`, `solana-rpc-proxy`.
- `PayoutProviderId` in `src/lib/payments/providerFees.ts` is
  `'solana' | 'paypal' | 'balance' | 'paystack'` -- NOWPayments is already
  absent from the enum that decides behaviour.

The NOWPayments code that remains is dead at checkout but **not inert in the
database**, and that is the trap: `_shared/resolveSowerPayout.ts` still
queries `wallet_type IN ('nowpayments_crypto','paypal_email')`, and two
members (`callth3guy`, `amberswheeles`) hold active, verified wallets typed
`nowpayments_crypto`. Both are 44-character Solana addresses with no
NOWPayments API key or merchant id -- Phantom wallets wearing the wrong
label. Deleting the label without migrating those rows first would orphan
their payouts. Rename the rows, then remove the string.

## Golden rule: the S2G treasury address is `SOLANA_HOT_WALLET_ADDRESS`

The S2G treasury is the Supabase secret `SOLANA_HOT_WALLET_ADDRESS`,
fallback-hardcoded in `supabase/functions/treasury-balances/index.ts` and
`_shared/solanaPayIn.ts` as **`6zbpF3HQbxFVMfUPMRzZZ52nwA7PSvqeq2Cqibq2BcxZ`**
-- on-chain verified 2026-09-19 at **12.942069 USDC**, exceeding the ~$4.03
then owed to members. Any session checking the treasury balance must use
this address. Do not trust a report naming `system_settings` or a "gosat
wallet row" -- as of 2026-09-19 neither exists in this database.

The two retired `organization_wallets` rows (`s2gholding` / `s2gbestow`,
NOWPayments era) differ by one trailing character, which is not how two
independently generated keypairs look -- they read as hand-typed. Never use
either as a payment destination.

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

## Golden rule: a rail is never handed a currency it cannot charge

Any code path that passes a member-set price to a payment rail MUST verify
the rail supports that currency **before** the request. Never send an amount
with a `currency_code` the amount is not denominated in.

On 2026-09-19 four paths were found relabelling a ZAR price as USD -- a
R1,449.99 listing charged $1,449.99, roughly 18x -- and only one was caught
by the task that started as a display fix. The other three were found only
by going and looking:

- `create-booking-paypal-order:154` -- `currency_code: "USD"` hardcoded,
  while `bookings.currency` (trigger-set from the listing since
  `20260917140000`) was never read.
- `create-invoice-payment:260` -- same hardcode, against
  `invoices.currency_display`.
- `create-orchard-bestowal-order:339` -- same hardcode, against
  `orchards.currency`.
- `create-solana-bestowal-order:98/151` -- reads `orchard.currency`, then
  sends the number as `amountUsdc` regardless. USDC is dollars, so this is
  the same bug on a rail with no chargeback.

The gate lives in `src/lib/payments/railAvailability.ts`. Use it; do not
re-derive a currency list at a call site. Blocking is the correct outcome --
a screen that honestly reads "you will be charged $1,650" for an R1,650
listing is still a broken product, so the rail is hidden with a plain
reason rather than relabelled.

Which tables carry a member-set currency, measured 2026-09-19:
`pillow_seed_details`, `wheel_seed_details`, `hand_seed_details`, `bookings`,
`orchards`, `invoices` (`currency_display`), `companies`, `bestowals`.
`products` has **no** currency column -- its prices are USD by construction.

A corollary that cost a commit: when removing or gating a rail, fix it at the
choke point, not per call site. There are seven `ProviderPicker` call sites;
a change applied to four of them leaves three doors open and reads as done.

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

## Session reporting rules

These are about the session, not the code. They exist because a silent
agent is indistinguishable from a stalled one.

1. **Never end a turn on a silent wait.** If something is running, say what
   it is, how long it has been going, the ETA, and when the next update
   lands. "Running the typecheck (~10 min, started 14:02, next update when
   it exits)" -- never a turn that just stops with work in flight.
2. **Every wakeup while a task is running gets one status line.** One. Not
   a re-plan, not a re-derivation of what is already known.
3. **The moment a background task completes, its report is the FIRST
   output** of that turn, before anything else is picked up.
4. **"status?" means the status table and nothing else.** No tool calls, no
   side work, no starting the next thing.
5. **A new task arriving while work is pending:** say what is pending,
   deliver any results not yet reported, then say whether the new task is
   queued or runs in parallel -- all of that BEFORE starting it.
6. **A re-pasted prompt for work already done** gets a one-line pointer to
   the existing report. Do not re-run it.

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
