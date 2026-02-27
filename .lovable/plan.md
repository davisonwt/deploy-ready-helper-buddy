

## Add Weather Widget Next to Live Chat on Radio Page

The "chat" tab (line 158-200) already uses a 2-column grid: `ListenerInteractions` on the left and "Chat Guidelines" card on the right. I'll replace the static "Chat Guidelines" card with a layout that stacks the `WeatherWidget` (full mode) on top and keeps a condensed version of the guidelines below it.

### Changes

**`src/components/radio/RadioPage.tsx`** (lines 158-200, chat tab):
- Replace the right-column "Chat Guidelines" card with a `div` containing:
  1. `<WeatherWidget />` (full version, not compact) at the top
  2. A smaller condensed "Chat Guidelines" card below it
- This places weather right next to the live chat as requested

Single file change only.

