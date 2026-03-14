

## Redesign "Create & Manage" into a Compact Quick-Create Grid

Right now the "Create & Manage" section has only 4 large buttons (Plant New Seed, Browse Orchards, My Orchards, My Profile). You want to expand this to cover all the things users can create across the platform — but with smaller, cleaner buttons so it doesn't feel cluttered.

### Proposed Design: Icon-Chip Grid

Replace the 4 large cards with a compact grid of smaller icon+label chips — think pill-shaped buttons arranged in a flowing wrap layout. Each one is ~40px tall with a small icon and short label. This fits 8-12 actions without taking more vertical space than the current 4 cards.

```text
Create & Manage
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ + Seed   │ │ 🌳 Orchard│ │ 💬 Chat  │ │ 🎓 Class │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 🏋 Training│ │ ⚡ SkillDrop│ │ 📻 Radio │ │ 👤 Profile│
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

- **4 columns on desktop, 3 on mobile** — compact pill buttons (~h-12)
- Each button: small icon + short label, theme-colored gradient background
- Actions included:
  1. **Plant Seed** → `/create-orchard` (new product/seed)
  2. **New Orchard** → `/browse-orchards`
  3. **New Chat** → `/community-chat` (start a conversation)
  4. **New Classroom** → `/create-session?type=classroom`
  5. **New Training** → `/create-session?type=training`
  6. **New SkillDrop** → `/create-session?type=skilldrop`
  7. **New Radio** → `/create-session?type=radio`
  8. **My Profile** → `/profile`
- Sub-links row (364YHVH Orchards, My S2G Tribe) stays as-is below

### Changes

**`src/pages/DashboardPage.jsx`** (lines 914-985)
- Replace the 4 large `h-20/h-24` buttons with 8 compact `h-12` pill buttons
- Grid changes from `grid-cols-2 sm:grid-cols-4` to `grid-cols-3 sm:grid-cols-4`
- Each button uses a subtle gradient with theme colors, smaller icons (`h-4 w-4`), and `text-xs` labels
- Keep sub-links row unchanged

This keeps the "less is more" philosophy — more options, less visual weight.

