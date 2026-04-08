

# Convert "Book a Service" & "Connect with Providers" to Horizontal Carousels

## What changes

Convert the two grid sections in `GigActionCards.tsx` into horizontally scrollable carousels that show **one card at a time** and scroll continuously (infinite loop).

## How

**File: `src/components/dashboard/sections/GigActionCards.tsx`**

1. **"Book a Service"** (lines 85-106): Replace `grid grid-cols-4` with a horizontal scroll container using CSS `snap-x snap-mandatory`, each card being `min-w-full snap-center`. Add left/right arrow buttons (ChevronLeft/ChevronRight) positioned at the sides. Make it wrap infinitely by cloning cards or using modular index navigation with `useRef` + `scrollTo`.

2. **"Connect with Providers"** (lines 113-134): Same treatment -- replace `grid grid-cols-3` with a full-width horizontal snap carousel, one card visible at a time, with left/right arrows.

3. Each card will be taller (~160px) since it now gets the full width, showing the image more prominently with the text overlay at the bottom.

4. Add a dot indicator or counter badge (e.g., "2/4") below each carousel for context.

5. The "Become a Provider" grid stays as-is (no change requested).

## Technical details

- Use the same scroll-snap pattern already used in `ImageCarousel.tsx` (native scroll, no library needed)
- `useRef` for each scroll container, `useCallback` for `scrollTo` with smooth behavior
- Arrows: white/80 rounded buttons matching existing carousel style
- Infinite scroll: when reaching the last card and pressing next, scroll back to first (and vice versa)

