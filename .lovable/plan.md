

## Fix Memry Page Layout for Desktop/TV + Live Banner Declutter

Three issues to address from the screenshot:

### 1. Move Action Buttons to the Left Side

Currently `renderActions` places buttons on the right (`right-4`). On wide screens/TVs the info panel (profile, chat, bestow) is at bottom-left while actions are far right — feels disconnected.

**Change**: Move the action buttons column from `right-4` to `left-4` so they sit on the left side of the media, forming a cohesive left-side control area alongside the info panel.

### 2. Fix Live Session Banner Clutter

The `LiveSessionAdBanner` uses `fixed top-[56px]` with `pt-14` causing it to overlap content and look cramped. 

**Change in `LiveSessionAdBanner.tsx`**:
- Remove `pt-14`, use `pt-2` instead
- Make the banner more compact — reduce padding from `p-3` to `p-2`
- Reduce icon size and tighten spacing
- Add a subtle top offset so it sits neatly below the header without overlapping the post nav controls

### 3. Add Left/Right Arrow Navigation for Desktop (PC/TV)

Touch swipe works on mobile but there are no visible clickable arrow buttons for horizontal post navigation on desktop. The current arrows are at `top-20` which is too high and small.

**Change**: Make the horizontal post navigation arrows larger, position them on the left and right edges of the viewport (vertically centered), and make them clearly visible on non-touch devices. Use `hidden md:flex` so they only show on larger screens where touch isn't the primary input.

### Files to Edit

- **`src/pages/MemryPage.tsx`**
  - `renderActions`: Change `right-4` to `left-4`, adjust positioning to not overlap the info panel (stack above it, use `top-28 bottom-[45%]` range)
  - Feed section (lines 1654-1675): Replace/augment the small top-center nav with large side-mounted arrows for desktop
  - `renderInfoPanel`: Keep `bottom-36 left-4 right-20` but change `right-20` to `right-4` since actions moved left; update to `left-20` to avoid overlapping the now-left-side action buttons

- **`src/components/memry/LiveSessionAdBanner.tsx`**
  - Reduce `pt-14` to `pt-1`, tighten padding, make it less visually dominant

