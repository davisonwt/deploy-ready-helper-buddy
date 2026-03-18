

## Redesign Ed's Beads — Single Month Focus with Swipe Navigation

### The Problem
Currently, 3 months are crammed side-by-side at `scale(0.32)` in tiny 200px boxes. The beads are barely readable, the scrollable "beads in your hands" feel is completely lost at that scale, and it looks cluttered. The beautiful 7-bead scroll window you built is invisible.

### The Proposal: Single Month Carousel

Show **one month at a time**, full-size, centered on screen — preserving the tactile bead-scrolling experience. Users swipe left/right (or tap arrows) to move between months.

```text
  ┌─────────────────────────────────────┐
  │  ❄ Winter          ☀ Summer         │  ← season header
  │                                     │
  │     ◀  MONTH 12  ▶                  │  ← month nav arrows
  │                                     │
  │         ○ Day 30     (large)        │
  │         ○ Day 29                    │
  │        DOT 1                        │
  │        ◉ Day 28 ◉   ← today        │  ← full-size 7-bead window
  │         ● Day 27                    │
  │         ● Day 26                    │
  │         ● Day 25                    │
  │                                     │
  │      ↕ SCROLL                       │
  │                                     │
  │   ○ ○ ○ ○ ○ ○ ● ● ● ● ● ◉         │  ← month dots (1-12)
  └─────────────────────────────────────┘
```

### Key Design Elements

1. **Full-size single month** — the bead strand renders at 100% scale in a centered column (`max-w-md`), fully interactive and scrollable
2. **Left/Right navigation** — arrow buttons + swipe gesture to move between months 1-12; animates with a slide transition
3. **Month dot indicator** — 12 small dots at the bottom showing which month you're viewing, current month highlighted pink
4. **Season header** — compact bar at top showing Northern/Southern season labels + icons for the currently viewed month's season
5. **Auto-starts on current month** — opens directly to the user's current month
6. **Current month badge** — pink glow/ring on the active month's dot indicator so you can always find "now"

### Technical Changes

**File:** `src/pages/EnochianCalendarDesignPage.jsx`

- Replace the `grid grid-cols-3` seasonal layout with a single `useState` tracking `activeMonth` (1-12, defaults to `enochianDate.month`)
- Render only `MonthComponents[activeMonth]` at full size inside a centered container
- Add prev/next buttons (chevron icons) on either side
- Add touch swipe support using `onTouchStart`/`onTouchEnd` handlers (no library needed)
- Add a row of 12 clickable dots below the strand for direct month jumping
- Derive the season header dynamically from `activeMonth` using the existing `BASE_SEASONS` array
- Keep the "Days Outside Time" section and legend below, unchanged
- Wrap month transitions in `AnimatePresence` + `motion.div` for smooth slide animations

### What stays the same
- All bead logic, colors, scroll behavior, popups, journal/diary links
- The `BeadScrollWindow` 7-bead tactile feel — now fully visible and usable
- Days Outside Time section at the bottom
- Legend section
- Header with year/month/day/part info
- Location verification

