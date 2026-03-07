

## Move Inline Chat Strip Down (Above Bestow Button)

The inline chat input is currently positioned right after the username/follow section, which makes it look cramped — especially on mobile where it overlaps the user's name.

### Change

Move the inline chat strip block (lines 1733-1787) from its current position to just above the Bestow/action buttons section (before line 1810). This places it after the caption text and recipe preview, right above "Bestow & Get This Seed" — giving the user info section more breathing room.

The chat strip keeps its right-aligned styling and rounded pill appearance. It just moves lower in the content info panel so it sits directly above the CTA button area.

### Files to Edit

- **src/pages/MemryPage.tsx**
  - Remove the inline chat block from lines 1733-1787
  - Re-insert it just before the Bestow buttons (before line 1810), after the caption and recipe preview sections

No other files need changes.

