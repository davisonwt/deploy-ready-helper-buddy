
Issue report (what was changed, why it still broke, and what I found)

I hear you. You asked for a detailed report, so this is a straight technical postmortem.

1) What was changed during the previous fixes
- `src/components/journal/CalendarGrid.tsx`
  - Omer/New Wine/New Oil overlap logic was changed (50th day overlaps with next cycle day 1).
  - Rendering changed from single count to array badges.
  - A null guard was later added after the crash (`omerCount.map` on null).
- `src/utils/gardenRestDays.ts`
  - Month 2 feast labels were expanded (full Unleavened Bread week, rest day markers, etc.).
- `src/components/journal/Journal.tsx`, `CalendarGrid.tsx`, `JournalDayPage.tsx`, and new `src/utils/journalDateMapping.ts`
  - Date mapping was centralized to noon-based parsing.
  - “Ghost entry” filtering was added.
  - Auto-repair logic was added to rewrite stored YHWH fields based on `gregorian_date`.

2) Why this still failed (root causes)
Do I know what the issue is? Yes.

Root Cause A: Two different calendar engines are still active
- `dashboardCalendar.calculateCreatorDate()` = sunrise/location-based
- `journalDateMapping.calculateYhwhDateFromCivilDate()` = civil noon-based
- These are both used in journal flow, so the same date can resolve differently in different components.

Root Cause B: Silent auto-rewrites in load path
- `Journal.tsx` has two mutation blocks inside `loadEntries()`:
  - “legacy offset repair”
  - “calendarRepairPayload” mismatch repair
- That means simply opening journal can rewrite rows.
- This is high-risk and can move entries unexpectedly when mapping logic changes.

Root Cause C: URL date params are ignored in Profile/Journal entry flow
- `BeadPopup.tsx` navigates with `?tab=journal&year=...&month=...&day=...&view=...`
- `ProfilePage.jsx` only reads `tab` and ignores year/month/day/view.
- Result: user thinks they opened a chosen sacred day, but Journal defaults to current date state. Saving can land on a different day than intended.

Root Cause D: Empty rows still exist in DB
- There is a saved row at Month 1 Day 7 with empty content/media/tags.
- Even if marker filtering tries to hide empty entries, empty rows still create confusion in “exists / no exists” behavior across views.

3) Verified data findings from your account rows
From `journal_entries` for your user:
- New Year note exists at:
  - `yhwh_year=6029, yhwh_month=1, yhwh_day=1, gregorian_date=2026-03-20`
- Pesach note exists at:
  - `yhwh_year=6029, yhwh_month=1, yhwh_day=14, gregorian_date=2026-04-02`
- There is an empty row at:
  - `yhwh_year=6029, yhwh_month=1, yhwh_day=7, content=''` (no tags/media)

So the DB has a real empty day-7 record and valid day-1/day-14 records. The UI mismatch is from resolution/render/save flow inconsistencies, not from one single bad row.

4) Why “fixed” reports didn’t hold
- The prior fixes treated symptoms in isolation (ghost marker, null crash, specific day shifts).
- But the root system stayed inconsistent:
  - dual date calculators
  - write-on-read repair logic
  - ignored URL-selected day
- So each patch could fix one view while another path still remapped differently.

5) Corrective plan (implementation plan to actually stabilize)
Step 1 — Freeze destructive behavior
- Remove all automatic row-rewrite logic from journal load (`Journal.tsx` repair blocks).
- No data mutations during read/render.

Step 2 — Single source of truth for persisted journal dates
- Use one canonical mapping for all journal persistence and lookup (recommend noon-based civil mapping in `journalDateMapping.ts` for stability).
- `dashboardCalendar` can remain for display features, but not for journal row identity.

Step 3 — Respect deep-linked selected day
- Parse `year/month/day/view` query params in Profile/Journal init.
- Convert selected sacred day to Gregorian once and initialize `selectedDate` from that.
- This directly fixes “I clicked day X but save went to Y”.

Step 4 — Unify save keys and lookup keys
- Save and find entries by one canonical key path (prefer `gregorian_date` + canonical derived YHWH tuple at save time).
- Ensure all forms and day page follow identical save/update criteria.

Step 5 — Stop creating empty placeholder entries
- Guard saves: if no meaningful content (text/gratitude/tags/media/recipes/prayer), do not insert a new row.
- Optionally delete existing empty rows for same date when user clears everything.

Step 6 — One-time explicit repair script (manual trigger only)
- Build a deliberate migration/repair action (dry-run + confirm) to clean mismatched historic rows.
- Never run repairs automatically on page load again.

6) Validation checklist after implementation
- Click Month 1 Day 1 from calendar → save note → appears only on M1D1.
- Click Month 1 Day 14 → save/edit → never appears on day 13.
- Month 1 Day 7 with empty row shows no entry marker.
- Deep link `/profile?tab=journal&year=...&month=...&day=...&view=diary` opens exactly that date.
- Reopen app/reload page and confirm no dates shift without user action.

Technical detail summary (files to change in fix pass)
- `src/components/journal/Journal.tsx`
  - Remove load-time auto-repair mutations
  - Initialize selected date from URL params
  - Keep canonical read mapping only
- `src/components/journal/CalendarGrid.tsx`
  - Ensure marker logic checks meaningful content consistently
  - Keep canonical mapping only for matching
- `src/components/journal/JournalDayPage.tsx` + all date option forms
  - Shared save helper; reject empty inserts
- `src/pages/ProfilePage.jsx`
  - Parse year/month/day/view and pass/initialize Journal date context
- `src/utils/journalDateMapping.ts`
  - Remain canonical utility used everywhere for journal persistence
