

# Beautify All Section Headings Across Dashboard & Feed

## Problem

All section headings (Services, Plant, Go Live, Chat, Social Feed, S2G Memry, Dashboard, ChatApp, 364yhvh Days, My Garden, Let It Rain, GoSat's) and sub-headings (BOOK A SERVICE, CONNECT WITH PROVIDERS, BECOME A PROVIDER) use plain text with basic styling — they look dull and lack visual distinction.

## Design Direction

Add gradient text effects, subtle glow, and decorative accents to all headings to make them vibrant and premium-looking, while keeping the existing layout structure intact.

**Main section headings** (h2): Gradient text using each section's theme accent colors, with a subtle text-shadow glow effect.

**Sub-headings** (BOOK A SERVICE, etc.): Replace plain uppercase text with a pill/badge style — a subtle gradient background with rounded corners, giving them a polished label look.

## Files to Edit

1. **Create `src/components/dashboard/sections/SectionHeading.tsx`** — A reusable component for all main section headings with:
   - Gradient text effect using `background-clip: text` and `webkit-text-fill-color: transparent`
   - Subtle text-shadow glow matching the section's accent color
   - Consistent sizing and spacing

2. **Create `src/components/dashboard/sections/SubSectionLabel.tsx`** — A reusable component for sub-headings (BOOK A SERVICE, etc.) with:
   - Pill-shaped container with subtle gradient background
   - Icon + text layout with better spacing
   - Slightly larger text (12px) with letter-spacing

3. **Update 11 section files** to use the new heading components:
   - `DashboardOverviewSection.tsx`
   - `GigActionCards.tsx` (main heading + 3 sub-headings)
   - `ChatAppSection.tsx`
   - `MemrySection.tsx`
   - `ChatFeedCards.tsx`
   - `GoLiveFeedCards.tsx`
   - `PlantFeedCards.tsx`
   - `YhvhDaysSection.tsx`
   - `MyGardenSection.tsx`
   - `LetItRainSection.tsx`
   - `GosatsSection.tsx`

4. **Update `src/components/feed/HomeFeed.tsx`** — Style the "Social Feed" heading with gradient text

## Visual Treatment

**Main headings**: Each gets a two-tone gradient pulled from its section theme (e.g., Services gets teal-to-cyan, Plant gets green-to-emerald). The gradient text is paired with a faint colored glow behind it.

**Sub-headings** (carousel labels): Transform from plain uppercase text into styled pills with a translucent gradient background, slightly rounded, with the emoji icon and text inside — giving them a tag/badge feel that pops against the dark background.

## Technical Details

- Gradient text via `backgroundImage` + `WebkitBackgroundClip: 'text'` + `WebkitTextFillColor: 'transparent'`
- Glow via `textShadow: '0 0 20px rgba(accent, 0.3)'`
- Sub-heading pills via `background: linear-gradient(...)` with `rgba` transparency + `border-radius` + padding
- All colors derived from the existing `theme.accent` / `theme.textPrimary` to stay on-brand

