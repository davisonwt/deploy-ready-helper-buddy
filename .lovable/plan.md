## Architecture confirmed (flag first)

Training does **not** use the shared `ChatRoom` component for its main view. `PremiumRoomViewPage.tsx` has two branches:

- **`hasAccess === true`** (the real Training experience): renders `DiscordStyleRoomView` — a **separate** messaging implementation with its own `chat_messages` fetch, own realtime subscription, own input box, and only `ChatMessage` shared with other surfaces.
- **`hasAccess === false`** (paywall preview): renders a small `ChatRoom` panel at the bottom of the locked layout (line 726). Users here can't post, so the streak is irrelevant on this branch.

**Implication:** all Training styling + streak work lands in `DiscordStyleRoomView.tsx` and `PremiumRoomViewPage.tsx`. **`ChatRoom` is NOT touched** — zero risk to ChatApp / Classroom / SkillDrop / community-chat. `ChatMessage` is also not touched (no new props needed; Training doesn't need instructor/drop affordances).

## Streak — real data, no fabrication

`DiscordStyleRoomView` already fetches every `chat_messages` row for `room.id` ordered ascending. The streak derives **for free** from that same array:

1. Filter `messages.filter(m => m.sender_id === user.id)`.
2. Map each `created_at` to a `YYYY-MM-DD` key in the user's local timezone.
3. Walk backwards from today's local date: count consecutive days present in the set; stop at the first gap.
4. If today has no qualifying message yet, the streak shown is yesterday's run (still "live" — it only breaks when a full day passes with no post). The badge is honest: it shows the current unbroken run, including today once they post.

**Real constraint flagged:** the existing fetch has no `limit` / no date window. For long-lived busy rooms this is already an O(all-messages) load — pre-existing, not introduced here. Streak is computed in-memory off the same array, so it adds zero extra queries. If the room ever crosses thousands of messages we'd want a dedicated `select created_at where sender_id = me` query, but I'm not introducing that now since it'd be premature for current room sizes — flagging so you can tell me if you want it preempted.

Tick animation: when streak count increments vs. its previous value, run a short count-up + flame pulse via CSS keyframes. `@media (prefers-reduced-motion: reduce)` collapses it to an instant value swap.

## Design tokens (Training-only, additive)

Add to `tailwind.config.ts` under `colors.training`:
- `bg: '#1A0F12'` (dark coral-charcoal)
- `coral: '#F43F5E'` (primary)
- `coral-glow: '#FB7185'` (secondary accent for hover/glow)
- `ash: '#2A1A1F'` (surface)
- `ember: '#FCA5A5'` (subtle text accent)

Add **Oswald** to `index.html` Google Fonts link, alongside Spectral / Space Grotesk already added for Classroom/SkillDrop. Register `font-oswald` in `tailwind.config.ts`. Body stays Inter (default).

Add `training-streak-tick` keyframe to `src/index.css` (scale + glow pulse on the badge container, ~600ms), gated by `@media (prefers-reduced-motion: no-preference)`.

## Files to change

1. **`index.html`** — append Oswald to existing Google Fonts `<link>`.
2. **`tailwind.config.ts`** — add `training` color scale + `oswald` font family.
3. **`src/index.css`** — add `@keyframes training-streak-tick` + `.training-streak-tick` class with reduced-motion fallback.
4. **`src/components/premium/DiscordStyleRoomView.tsx`**:
   - Wrap root in `bg-training-bg text-foreground` shell; sidebars use `bg-training-ash` with coral border accents.
   - Top bar `h1` ("general-chat") → `font-oswald uppercase tracking-wide text-training-coral`.
   - Left sidebar `h2` (room title) → `font-oswald uppercase tracking-wide`; Crown icon coral.
   - Active tab underline → `border-training-coral`; participant count chip and section labels → coral/ember.
   - Send button → coral with coral-glow hover; input border focus → coral.
   - **Streak badge** rendered in the top bar (right of `general-chat`, left of call controls): flame icon + `"N-day streak"` in `font-oswald`, coral background `bg-training-coral/15` with coral border, animates `training-streak-tick` when N increases (track previous value in a `useRef`).
   - Compute streak with a `useMemo` over `messages` + `user.id`; recomputes on each message append (realtime already wired).
5. **`src/pages/PremiumRoomViewPage.tsx`**:
   - Restyle ONLY the `hasAccess` branch's "Back to Go-Live" container wrapper to `bg-training-bg` so the page background continues the identity above DiscordStyleRoomView.
   - The non-access (paywall) branch is left untouched — it uses generic tokens and the shared `ChatRoom`; restyling it risks regressing other premium-room types that aren't "Training".
   - **Note:** "Training" is currently a label for the whole premium-room concept in this codebase — every premium room flows through this page. If you want the visual identity gated to a specific subtype (e.g. only when `room.room_type === 'training'`), tell me and I'll add the conditional. Default assumption: apply to all premium rooms (matches the "Live Training Chat" copy already in the page).

## Regression guarantees

- `ChatRoom` and `ChatMessage` files are not modified → ChatApp, Classroom, SkillDrop, community chat unaffected.
- New Tailwind tokens are namespaced (`training-*`) → no token collisions.
- Oswald is added alongside existing fonts → no replacement of Spectral/Space Grotesk.
- Streak logic is local to `DiscordStyleRoomView`, no schema/API/edge-function changes.

## Verification

- `tsgo --noEmit` clean.
- Visual spot-check: navigate to `/premium-room/:id` for an accessible room → coral identity visible, streak badge shows; navigate to `/chatapp`, `/classroom`, `/skilldrop` → unchanged.

## Open question (answer before I build, or I'll default)

Apply Training identity to **all** premium rooms, or **only** rooms where `room.room_type === 'training'` (and leave other premium-room types on the current neutral styling)? Default if you don't reply: all premium rooms.
