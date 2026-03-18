

## Add Diary & Journal Links to Bead Popup

### What
When a bead is clicked and the popup opens, add two action buttons — "Diary" and "Journal" — that link the user to the diary/journal page for that specific date. Currently the popup says "No entries for this day / Click on this date in the calendar to add entries" but provides no actual links.

### Where
**File:** `src/components/watch/BeadPopup.tsx`

### Changes

1. **Import `useNavigate`** from `react-router-dom` and `BookOpen`, `PenLine` from `lucide-react`.

2. **Add two styled action buttons** below the existing content (both in the "has content" and "no content" states):
   - **"Open Journal"** — navigates to `/profile?tab=journal` with date query params (e.g., `&year=6028&month=12&day=30`) so the journal can pre-select that date
   - **"Write Diary Entry"** — navigates to the same journal tab (since diary lives within the Journal component on the profile page)

3. **Button placement**: Add a sticky footer section at the bottom of the popup content area with two side-by-side buttons styled consistently with the cloud theme (rounded, gradient backgrounds).

4. **Replace the empty state text** "Click on this date in the calendar to add entries" with the actual clickable buttons.

5. **Close popup on navigation** — call `onClose()` before `navigate()` so the portal is cleaned up.

### Implementation Detail
The journal/diary both live at `/profile?tab=journal`. The two buttons will be:
- "📖 Open Journal" — links to `/profile?tab=journal&year={year}&month={month}&day={day}`
- "📝 Write Diary" — same destination, different visual emphasis

Both will use `useNavigate` and pass the sacred calendar date as URL params.

