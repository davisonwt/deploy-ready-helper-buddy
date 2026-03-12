

## Merge "My Tribe" into the "My Followers" Card

Instead of adding a 6th card, we'll enhance the existing "My Followers" card to show both followers and tribe size in a single, clean layout.

### Design

The card title becomes **"My Followers & Tribe"**. Below the main followers count, a subtle secondary line shows tribe size — keeping the card compact.

```text
┌─────────────────────────┐
│ ❤️  My Community        │
│                         │
│  142  followers         │
│   22  tribe members     │
│        +3 today         │
└─────────────────────────┘
```

### Changes

**1. `src/hooks/useMyStats.ts`**
- Add `tribeSize: number` to `StatsData`
- Query `referral_circle` count where `referrer_id = userId`
- Default to 0 on error

**2. `src/components/dashboard/StatsCards.tsx`**
- Rename Card 2 from "My Followers" to "My Community" (or "Followers & Tribe")
- Show followers count on one line, tribe size on a second line beneath it
- Keep the existing delta badge for followers
- Add a small Users icon + tribe count as a secondary stat
- Grid stays at 5 columns — no layout change

This keeps the dashboard clean while surfacing tribe data where it's contextually relevant.

