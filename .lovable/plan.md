

## Problem
The embedded Memry feed in the HomeFeed section shows fewer action buttons than the full MemryPage. Image 1 (full page) has all buttons: Follow, Message, Heart, Bestow, Comments, Bookmark, Share. Image 2 (embedded) cuts off some due to `scale-75` and the constrained 70vh container.

## Solution: Redesign embedded action buttons for compact layout

### Approach
Instead of scaling down the full-size buttons (which clips them), redesign the embedded layout to use **smaller but fully visible buttons** that fit the container naturally.

### Changes

**1. `src/pages/MemryPage.tsx` — `renderActions` embedded styling**
- Remove `scale-75 origin-right` for embedded mode
- Use smaller button sizes (w-9 h-9 instead of w-12 h-12) and smaller icons (w-4 h-4) in embedded mode
- Reduce gap between buttons from `gap-2` to `gap-1.5`
- Hide text labels in embedded mode to save vertical space (keep just icons)
- This ensures all 7 action buttons (Follow, Message, Heart, Bestow, Comments, Bookmark, Share) fit vertically

**2. `src/pages/MemryPage.tsx` — `renderInfoPanel` embedded sizing**
- Adjust `right` offset to account for the smaller action column so the info panel doesn't overlap

**3. `src/components/feed/cards/InlineMemryFeed.tsx` — container height**
- Increase `minHeight` slightly if needed to ensure all buttons are visible on smaller screens

### Technical detail
The `renderActions` function will check the `embedded` flag and conditionally render compact versions:
```
embedded ? 'w-9 h-9' : 'w-12 h-12'   // button circles
embedded ? 'w-4 h-4' : 'w-6 h-6'     // icons
embedded ? 'hidden' : ''               // text labels
embedded ? 'gap-1.5' : 'gap-2'        // spacing
```

This keeps all buttons accessible while fitting the embedded container cleanly.

