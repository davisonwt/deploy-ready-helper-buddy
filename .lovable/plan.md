

# Switch to Free Jitsi Meet for All Voice/Video Calls

## The Solution

**Jitsi Meet** (the open-source project behind JaaS) runs a free public server at `meet.jit.si`. Your app already uses the Jitsi External API -- the only change needed is switching the domain from `8x8.vc` (paid) to `meet.jit.si` (free). No JWT tokens, no API keys, no expiration issues.

This will immediately restore:
- 1-on-1 voice and video calls in ChatApp
- Classroom live sessions
- Lecture hall sessions
- Training sessions
- Radio DJ live broadcasts
- Group calls

## Why This Works for Your Scale

- Free for unlimited rooms and calls
- Each call/session is its own isolated room (2-50 participants per room)
- Handles 1,000+ users easily since not everyone is in one room at the same time
- No account, no JWT, no tokens needed
- Same quality video/audio as JaaS (same underlying technology)
- When you grow and need premium features (recording, analytics, branding), you can switch back to JaaS or self-host

## Future Growth Path

```text
Now (0-1,000 users)          Later (1,000+ users)
--------------------         ----------------------
meet.jit.si (FREE)     -->   Self-hosted Jitsi OR JaaS
No JWT needed                Your own server = full control
No cost                      Add recording, branding, SIP
Unlimited rooms              Handle higher concurrency
```

## What Changes

### 1. Update `src/lib/jitsi-config.ts`
- Change domain from `8x8.vc` to `meet.jit.si`
- Change script URL to `https://meet.jit.si/external_api.js`
- Remove the JaaS `appId` prefix from room names
- Remove the expired JWT token entirely
- Keep all existing config options (resolution, toolbar buttons, etc.)

### 2. Update `src/hooks/useJitsiCall.tsx`
- Remove JWT injection from the Jitsi initialization options
- Room names use simple format (no JaaS prefix needed)
- Everything else stays the same (event listeners, call status tracking, mute controls)

### 3. Update `src/components/video/JitsiVideoWindow.tsx`
- Remove JWT and JaaS room name prefix
- Point to `meet.jit.si` domain

### 4. Update `src/components/jitsi/JitsiRoom.tsx`
- Remove JaaS-specific room naming
- Remove JWT injection

### 5. Update any other Jitsi components
- `JitsiAudioCall.tsx` and `JitsiVideoCall.tsx` -- remove JaaS references
- All components already import from `jitsi-config.ts`, so most changes cascade automatically

## What Stays the Same (no changes needed)

- All call signaling (Supabase Realtime)
- Call session tracking (call_sessions table)
- Incoming call overlay with ringtone
- Chat integration (voice/video buttons in conversations)
- Radio session lobby and participant management
- Classroom/Lecture/Training session UIs
- All UI components and layouts

## Summary

This is a simple configuration change -- swap the paid JaaS domain for the free Jitsi public server. No new infrastructure, no API keys, no tokens to expire. All your existing call and session logic stays intact. When your app grows beyond 1,000 users or you need features like call recording, you can self-host Jitsi on a VPS (around $20-40/month) or return to JaaS.

