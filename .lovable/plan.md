## Approach to keeping ChatRoom safe (the important call)

`ChatRoom` is used by 4 callers (SessionPage classroom, SessionPage skilldrop, ChatApp, PremiumRoomView, plus others via wrappers). I will NOT branch its internal styling. Two surgical, opt-in extension points only — both default-off so the other 3+ callers are byte-identical:

1. Add optional prop `instructorId?: string` to `ChatRoom` (and pass through to `ChatMessage` per-message as `isInstructor` boolean). When unset (every non-classroom caller), nothing changes.
2. Add optional prop `rail?: React.ReactNode` to `ChatRoom` that, if provided, renders a slim left column alongside the chat (desktop) / collapsible drawer (mobile). Unset = no layout change.

The "lesson rail" itself lives in `SessionPage` (classroom kind only). It owns its own supabase fetch + realtime subscription on `chat_messages` filtered to `session.chat_room_id`, derives numbered instructor points, and is passed into ChatRoom via the new `rail` prop. SkillDrop renders SessionPage without setting `instructorId`/`rail`, so its ChatRoom is untouched.

`ChatMessage.jsx` gets one optional prop `isInstructor` — when false AND not own message, render a small "raised hand" (✋ `Hand` icon from lucide) badge next to the bubble. Default behavior unchanged.

## Files touched

- `src/pages/SessionPage.tsx` — classroom-only restyle + lesson rail logic; skilldrop branch keeps current styling.
- `src/pages/ClassroomPage.tsx` / `SessionListPage.tsx` — refine purple tokens to the exact palette for `kind==='classroom'` only.
- `src/components/chat/ChatRoom.tsx` — add 2 optional props (`instructorId`, `rail`); render rail column when provided; pass `isInstructor` to `ChatMessage`.
- `src/components/chat/ChatMessage.jsx` — accept optional `isInstructor`; render raised-hand badge for student messages.
- `index.html` — add Spectral Google Font link (Inter likely already present; verify).
- `tailwind.config.ts` — add `fontFamily.serif: ['Spectral', ...]` and classroom tokens (`classroom-bg #14101F`, `classroom-violet #8B5CF6`, `classroom-chalk #E8D9B5`).

No DB changes. No functionality changes. No edits to ChatApp, PremiumRoomViewPage, or other ChatRoom callers.

## Design application

**Classroom SessionPage**
- Background: `#14101F` with subtle violet radial glow.
- Header card: thin `#8B5CF6` border, Spectral title in chalk `#E8D9B5`, violet status pill, parchment-toned meta row.
- "Back to Go-Live" stays, restyled to chalk-on-aubergine.
- Chat container: violet border instead of fuchsia.

**Lesson rail (desktop ≥lg)**
- Slim column (~260px) left of chat. Sticky header "Lesson Outline" in Spectral.
- Numbered list (1., 2., 3. …) of instructor messages, label = first ~40 chars, timestamp underneath in muted chalk. Auto-updates via supabase realtime channel on `chat_messages` for `room_id=session.chat_room_id`.
- Mobile: collapsible `<Collapsible>` above the chat, same content.

**Student messages in thread**
- Small `Hand` icon + "raised" label next to bubble (non-own, non-instructor) — gated by `isInstructor` prop.

**ClassroomPage list cards**
- Replace ad-hoc purples with `#8B5CF6` primary + `#E8D9B5` accent text on `#14101F` surface. Spectral for card titles. Keep layout/structure unchanged.

## Verification

- `tsgo --noEmit` clean.
- Visually confirm `/chatapp`, `/skilldrop/:id`, `/premium-room/:id` look identical to before (ChatRoom prop defaults).
- Confirm `/classroom` list and `/classroom/:id` show the new palette + rail.
