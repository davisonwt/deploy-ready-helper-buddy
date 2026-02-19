
# Add "View Sower Profile" on Hover in Memry Feed

## What This Does
When you hover over a sower's profile picture or name in the Memry feed, a small popup card will appear showing the sower's name, avatar, and a "View Profile" button that navigates to their public member profile page (`/member/:id`).

## Changes

### 1. Add HoverCard to the Bottom Info Avatar (MemryPage.tsx)
The bottom-left sower info section (avatar + name) currently has no interaction. We will wrap it with a **HoverCard** component that shows:
- Sower's avatar (larger)
- Display name and username
- A "View Profile" button linking to `/member/:userId`

### 2. Enhance the Right-Side Avatar
The right-side avatar already links to the profile on click. We will also add a **HoverCard** to it so hovering shows a quick preview before clicking.

### 3. Keep Existing Click Behavior
The right-side avatar will retain its direct link navigation. The hover card is an enhancement, not a replacement.

## Technical Details

**File to modify:** `src/pages/MemryPage.tsx`

**Components used:**
- `HoverCard`, `HoverCardTrigger`, `HoverCardContent` from `@/components/ui/hover-card` (already installed)
- Existing `Avatar`, `AvatarImage`, `AvatarFallback` components
- Existing `Button` component with `Link` for navigation

**Implementation approach:**
- Import `HoverCard`, `HoverCardTrigger`, `HoverCardContent` 
- Wrap the right-side avatar (around line 1390) with a HoverCard that shows sower info + "View Profile" button
- Wrap the bottom-info avatar section (around line 1590) with a HoverCard with the same preview card
- The HoverCard content will include: avatar, display name, @username, and a "View Profile" button linking to `/member/:userId`
- On mobile (touch devices), tapping the avatar will still navigate directly to the profile since hover isn't available

**No database changes required** -- all profile data is already available in `currentPost.profiles` and `currentPost.user_id`.
