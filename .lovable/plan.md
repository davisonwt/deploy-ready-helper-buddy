

## Add Sacred Calendar Biblical Notes to Bead Popups

### What
Extract all biblical/historical event notes from the uploaded spreadsheet and embed them as a static data file. When a bead is tapped, the popup will display the relevant historical notes for that month/day alongside existing journal entries.

### The Data
The spreadsheet contains 364+ rows mapping each sacred calendar day (Month 1 Day 1 through Month 12 Day 31) to:
- **Main notes** (column H): Biblical events, feast details, historical references from Jubilees, Enoch, Exodus, etc.
- **Secondary notes** (column I): Song of the Sabbath Sacrifice numbers, additional context

Columns E (Gregorian date) and F (Gregorian day name) will be skipped as requested.

### Technical Approach

**1. Create data file: `src/data/sacredCalendarNotes.ts`**
- Export a `Record<string, { notes: string[]; secondaryNotes?: string[] }>` keyed by `"M{month}_D{day}"` (e.g., `"M1_D14"`)
- Parse each `<br/>` and bullet (`•`) into separate array items for clean rendering
- Cover all 12 months, all days (1-30/31), plus DOT days and intercalary days
- This will be a large file (~2000+ lines) but it's static data — no runtime cost

**2. Update `src/components/watch/BeadPopup.tsx`**
- Import the notes data
- Look up `sacredCalendarNotes[`M${month}_D${day}`]`
- Add a new "Sacred History" section (with a scroll icon) between the header and journal entries
- Each note bullet rendered as a styled list item
- Secondary notes shown in a smaller, muted style below
- Section is collapsible (starts expanded) so it doesn't overwhelm the popup when journal entries also exist

### UI Design for the Notes Section
```text
┌─────────────────────────────────────┐
│  📜 Sacred History                  │
│  ─────────────────────────────────  │
│  • Passover Begins at Sunset...     │
│  • Abraham offered Isaac...         │
│  • Death Angel killed the 1st...    │
│  • Moses & Israel kept Passover...  │
│                                     │
│  Song of the Sabbath Sacrifice #2   │
│─────────────────────────────────────│
│  📝 Your Journal Entry (existing)   │
└─────────────────────────────────────┘
```

Styled with an amber/parchment background (`bg-amber-50/80`) to distinguish from the user's personal journal entries (blue).

### Build Error Note
The `@swc/core` native binding error is an infrastructure/build environment issue, not caused by code changes. It should resolve on retry.

### Files to Create/Edit
- **Create:** `src/data/sacredCalendarNotes.ts` — all 364 days of notes extracted from the spreadsheet
- **Edit:** `src/components/watch/BeadPopup.tsx` — add Sacred History section

