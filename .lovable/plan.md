

# Merge Support Panel into Let It Rain Panel

## Overview
Consolidate the **Support** panel into the **Let It Rain** panel to eliminate duplication and simplify navigation. The unified panel will use the app's unique "Rain" terminology and include all giving options in one place.

---

## Current State

### Duplicate Links (in both panels)
| Link | Route |
|------|-------|
| Tithing | `/tithing` |
| Free-Will Gifting | `/free-will-gifting` |
| Community Orchards | `/364yhvh-orchards` |

### Unique to Let It Rain
- Quick Rain (0.50 USDC instant action)
- Body Rain (1.00 USDC instant action)

### Unique to Support
- Support Us page link (`/support-us`)

---

## Changes

### 1. Enhance Let It Rain Panel
**File:** `src/components/LetItRainPanel.tsx`

Add the "Support Us" link from the Support panel:

```text
QUICK ACTIONS (4 buttons):
├── Tithing
├── Free-Will Gift  
├── Quick Rain 0.50
└── Body Rain 1.00

CARDS (4 items):
├── Tithing - Give 10% · Support the work
├── Free-Will Gifting - Give as led · Any amount
├── Rain on Orchards - Support community projects
└── Support Us - Help grow the community  ← NEW
```

### 2. Remove Support Button from Navigation
**File:** `src/components/Layout.jsx`

- Remove the Support (Heart) button from the navigation bar
- Remove SupportPanel import and state management

### 3. Delete Support Panel Component
**File:** `src/components/SupportPanel.tsx`

- Delete this file entirely (no longer needed)

---

## Updated Let It Rain Panel Structure

```text
┌─────────────────────────────────────────┐
│  ☁️ Let It Rain!                        │
│  Support the work · Bless the community │
├─────────────────────────────────────────┤
│  [Tithing]        [Free-Will Gift]      │
│  [Quick Rain]     [Body Rain]           │
├─────────────────────────────────────────┤
│  📋 Tithing                             │
│  📋 Free-Will Gifting                   │
│  📋 Rain on Orchards                    │
│  📋 Support Us  ← Added from Support    │
└─────────────────────────────────────────┘
```

---

## Files to Modify
1. `src/components/LetItRainPanel.tsx` - Add "Support Us" card
2. `src/components/Layout.jsx` - Remove Support button and panel state

## Files to Delete
1. `src/components/SupportPanel.tsx` - No longer needed

---

## Benefits
- **Simpler navigation**: One button instead of two for giving
- **Clearer purpose**: "Let It Rain" = all ways to give/support
- **Consistent branding**: Uses the app's unique "Rain" metaphor
- **Less cognitive load**: Users don't need to choose between similar options

---

## Feature Preservation
All routes remain accessible:
- `/tithing` ✓
- `/free-will-gifting` ✓
- `/364yhvh-orchards` ✓
- `/support-us` ✓ (moved to Let It Rain)

