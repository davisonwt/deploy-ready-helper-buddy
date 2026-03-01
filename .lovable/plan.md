

# Fix: 30-Second Preview Enforcement Across All Music Pages

## Problem Identified

After inspecting all audio playback code, there are multiple places where songs can play in full instead of being limited to 30 seconds:

### Bug 1: `S2GCommunityMusicPage.tsx` (lines 194-252)
The `handlePlay` function has two branches:
- If `hasAccess(item)` returns **false**: plays 30-second preview (correct)
- If `hasAccess(item)` returns **true**: plays the **full song** with no time limit

`hasAccess` returns true when `item.price === 0` or `item.is_giveaway === true`. If Ed Esterline's track "Truth Will Mend" has a price of 0 or is tagged as a giveaway, the full song plays unrestricted.

### Bug 2: `S2GCommunityMusicPage.tsx` - No toggle on preview
In the non-access branch, clicking play again does NOT stop the current audio. It creates a second `Audio` instance, so two copies play simultaneously.

### Bug 3: `S2GCommunityMusicPage.tsx` - No `resolveAudioUrl`
Unlike `CommunityMusicLibraryPage` and `AudioSnippetPlayer`, this page creates `new Audio(item.preview_url || item.file_url)` directly without resolving signed URLs, which can cause playback failures on Supabase storage files.

### Bug 4: `PublicMusicLibrary.tsx` (lines 121-172)
Plays full tracks for purchased users with no 30-second snippet limit at all.

## Fix Plan

### Step 1: Fix `S2GCommunityMusicPage.tsx` `handlePlay`
- Remove the full-access branch that plays unlimited audio
- ALL playback uses the 30-second preview timer, regardless of access status
- Add toggle logic: clicking play while playing stops current audio
- Use `resolveAudioUrl` for signed URL resolution
- Clean up audio instances properly on stop

### Step 2: Fix `PublicMusicLibrary.tsx` `handlePlay`
- Add 30-second preview timer to all playback
- Use `resolveAudioUrl` for signed URL resolution

### Step 3: Verify `CommunityMusicLibraryPage.tsx` and `AudioSnippetPlayer.tsx`
- These already have correct 30-second limits - no changes needed

## Technical Detail
All preview playback will follow the same pattern:
```
audio.play()
timer = setTimeout(() => { audio.pause(); }, 30000)
audio.onended = () => clearTimeout(timer)
```
Full track access (download) remains gated behind bestowal/purchase - but in-browser playback is always 30-second preview.

