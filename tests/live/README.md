# tests/live

Playwright specs that drive **production** with the `.env.test` accounts.
Run with `npx playwright test --config=playwright.live.config.ts <spec>`.

## Re-run these before claiming a change is done

The rule is in `CLAUDE.md` under "Golden rule: regression check before
claiming done". It is repeated here because this is the folder where it gets
skipped.

A new spec for the thing you just built proves that thing works. It proves
nothing about what you broke on the way. If your change touches a shared
component, a shared helper, a database constraint or trigger, or more than a
handful of files, re-run the specs below that overlap it and **name them and
their results in your report**.

| If you touched | Re-run |
|---|---|
| `SignedImg`, `useSignedImage`, any image path | `stall-hotspots`, `private-bucket-images`, `stall-hotspot-audit` |
| `StallInteriorView`, hotspots, stall layout | `stall-hotspots`, `stall-interior-framing`, `stall-tap-targets`, `stall-hotspot-editor` |
| Any `/sow/*` form | `sow-step-indicator`, `sow-form-overlays`, `sleeping-wheels`, `sleeping-pillows`, `sleeping-hands` |
| `hand_seed_details` or its triggers | `hand-household-registration`, `hand-callout-rates`, `sleeping-hands` |
| `MyListingsPage`, share, copy link | `my-listings`, `my-listings-share`, `my-listings-copy-link`, `share-dialog-layout` |
| Global overlays, banners, `GlobalChrome` | `sow-form-overlays`, `stall-hotspots` |
| Lazy routes, chunking, `main.tsx` | `stale-chunk-recovery` |
| Geocoding, coordinates, proximity | `pillow-placement`, `sleeping-wheels`, `sleeping-pillows` |

## Test the real path

A rehearsal inside a single transaction does not prove behaviour through
PostgREST, which gives every request its own transaction. A database probe
does not prove the form works. If the thing that can break is a live form
submission, submit the form.

Two outages came through exactly this gap, both with a spec already written
that nobody re-ran:

- **2026-09-16** — an image-loading sweep across 38 files took down every
  stall interior. `stall-hotspots.spec.ts` existed and would have caught it.
- **2026-09-17** — a deferred constraint trigger blocked every household Hand
  listing. Only an in-transaction rehearsal was run, and a transaction is the
  one condition that does not hold in production.

## Test identities (`.env.test`, gitignored)

| Env names | Account | Roles | Use it for |
|---|---|---|---|
| `TEST_A_*` (also `TEST_USER_*`) | davisontest1 | none | A plain member; the one test account with a sower row, so stall and seed fixtures go on it. |
| `TEST_B_*` (also `TEST_USER3_*`) | davisontest2 | none | A second member: buyer, sender, customer. Already has a DM with davisontest1. |
| `TEST_C_*` | davisontest3 | none | A member with **no chat history**, for anything that only happens on a room's first message (the seed-quote card). Created 2026-09-25. |
| `TEST_GOSAT_*` (also `TEST_USER2_*`) | davison.taljaard | gosat, admin, radio_admin | **A real member.** Read his rows; never write to them. |

All three davisontest accounts are `profiles.is_test` and `is_system`: they stay
out of member counts and public stall feeds, but they do appear in New Chat
(only `is_place_account` rows are hidden there). A new test account must be
created with `user_metadata.is_test = true`, or its signup posts a "just joined"
welcome to every member in the Global room.

Anything a first-message test creates in davisontest3's rooms must be deleted
in `afterAll`, **including the room**, or the account stops being history-free
for the next run.

## Housekeeping

- These specs write to production. Anything they create must be deleted by
  the end of the run, and the report must state the row counts.
- Never touch a member's real listings. Prefix test rows `QA…` so cleanup can
  find them.
- `test-results/` is wiped at the start of every run, so a filtered re-run
  destroys the screenshots from the previous full run. Regenerate them before
  citing them as evidence.
