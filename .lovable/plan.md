

# Redesign Provider Action Card to Match Gig Services Style

## What

Redesign `ProviderActionCard` to use the same visual pattern as `GigActionCards` — a section header, then a row of 3 image-backed cards (Farmer, Homesteader, Manufacturer), each with a background photo, dark gradient overlay, icon, title, and subtitle. Below: the "Register as Provider" button, "Browse All Providers" button, and escrow badge.

## Changes

### 1. Add 3 provider background images
Source or generate 3 stock-style images and place in `public/images/providers/`:
- `farmer.jpg` — farmland, crops, fresh produce
- `homesteader.jpg` — homestead, handmade goods, garden
- `manufacturer.jpg` — factory, production line, packaging

### 2. Rewrite `ProviderActionCard.tsx`
Replace the current plain-row layout with the Gig Services pattern:

```text
┌─────────────────────────────────────────┐
│ 🌿 icon  Providers                     │
│          Sell directly to community     │
├─────────────────────────────────────────┤
│ 🌾 REGISTER AS                          │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │  farmer  │ │homestead │ │manufactur│ │
│ │  photo   │ │  photo   │ │  photo   │ │
│ │ 🌾       │ │ 🏡       │ │ 🏭       │ │
│ │ Farmer   │ │Homestead │ │Manufactur│ │
│ │ Grow &.. │ │Handmade..│ │Produce.. │ │
│ └──────────┘ └──────────┘ └──────────┘ │
│                                         │
│  [ Register as Provider ]  (primary)    │
│  [ Browse All Providers ]  (outline)    │
│  🔒 Escrow trust badge                 │
└─────────────────────────────────────────┘
```

- Each subtype card is a clickable image card (same `h-[100px]`, rounded-2xl, with photo background + dark gradient overlay + icon + title + subtitle) — identical to the Gig "Book a Service" row
- Clicking a subtype card navigates to `/register-provider?type=farmer` (pre-selects the subtype)
- Section header uses theme styling like GigActionCards (icon + title + subtitle)
- Accept `theme: DashboardTheme` prop to match surrounding sections
- Keep the two buttons and escrow badge below

### 3. Update `InlineMemryFeed.tsx`
Pass the `theme` prop to `ProviderActionCard` (or use a default theme if rendered in feed context).

### 4. Image sourcing
Use royalty-free placeholder images. If no suitable images are available locally, use simple gradient fallbacks initially.

