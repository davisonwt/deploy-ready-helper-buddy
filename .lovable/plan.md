

# Fix: Replace Jitsi Native Toolbar with Custom S2G Control Bar

## The Root Cause

The self-hosted Jitsi server at `meet.sow2growapp.com` has its own server-side configuration that **overrides** the client-side `toolbarButtons` and `disableInviteFunctions` settings. CSS injection into the iframe fails because it's cross-origin. No amount of client config flags will reliably hide that native invite button.

## The Solution

**Hide the entire Jitsi native toolbar** and use only our custom control bar overlay, which already has the working member-search invite button.

### Changes Required

**1. `src/components/jitsi/ResilientJitsiMeeting.tsx`**
- Set `toolbarButtons: []` (empty array) in `configOverwrite` to suppress the native toolbar
- Add `filmstripOnly: false`, `TOOLBAR_ALWAYS_VISIBLE: false`, and `TOOLBAR_TIMEOUT: 0` to ensure the native bar never shows
- Set `interfaceConfigOverwrite.TOOLBAR_BUTTONS: []` as well
- Remove the CSS injection code (it doesn't work cross-origin and is no longer needed)

**2. `src/components/jitsi/JitsiRoom.tsx`**
- Update `configOverwrite.toolbarButtons` to `[]` (empty)
- Update `interfaceConfigOverwrite.TOOLBAR_BUTTONS` to `[]` (empty)
- Add missing control buttons to the custom overlay bar to replace what the native toolbar provided:
  - **Screen share** button (calls `api.executeCommand('toggleShareScreen')`)
  - **Chat** button (calls `api.executeCommand('toggleChat')`)
  - **Fullscreen** button (calls `api.executeCommand('toggleFilmStrip')` or browser fullscreen)
  - **Tile view** button (calls `api.executeCommand('toggleTileView')`)
- Keep the existing custom buttons: mute/unmute audio, mute/unmute video, raise hand, settings, invite (UserPlus), and leave

**3. `src/lib/jitsi-config.ts`**
- Update `getJitsiInterfaceConfig` to default `TOOLBAR_BUTTONS: []` so all Jitsi entry points consistently hide the native bar

### Technical Details

All Jitsi External API commands used in the custom bar:
- `toggleAudio` -- already implemented
- `toggleVideo` -- already implemented
- `toggleRaiseHand` -- already implemented
- `toggleSettings` -- already implemented (as `executeCommand('toggleSettings')`)
- `toggleShareScreen` -- new
- `toggleChat` -- new
- `toggleTileView` -- new

The custom invite (UserPlus) button triggers the existing `Dialog` that searches the `profiles` table and sends a `call_sessions` record with `status: 'ringing'` -- this already works and is unaffected.

### Why This Is the Permanent Fix

- No dependency on Jitsi server-side config
- No cross-origin CSS hacks
- No config flag guessing
- The native toolbar simply never renders
- Our custom bar is the single source of truth for all meeting controls

