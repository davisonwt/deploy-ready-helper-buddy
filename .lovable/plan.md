

## Fix Memry Page: Vertical Nav, Bottom Info Panel, Single-Post Audio

Three changes:

### 1. Convert Bottom Nav to Vertical Stack (Left Side)

The Home/Discover/+/Recipes/Profile bar is currently horizontal at the bottom. Convert it to a vertical column on the left edge of the screen — similar to how the action buttons are stacked vertically on the right.

- Position: `fixed left-2 top-1/2 -translate-y-1/2 z-50`
- Layout: `flex flex-col items-center gap-2`
- Each button: rounded icon + tiny label below, same styling as current
- The "+" button keeps its gradient pill shape
- Remove the horizontal bottom bar entirely

### 2. Move Info Panel to Very Bottom

Currently at `bottom-36`. Move it to `bottom-2` (or `bottom-[env(safe-area-inset-bottom,8px)]`) so the profile/name/chat/bestow block sits flush at the bottom of the screen. Adjust `right` to `right-4` since the nav is no longer at the bottom.

### 3. Fix Audio: Only Currently Visible Post Plays

The bug: `isActive` is set to `activeCreatorId === creator.userId`, meaning ALL posts from one creator are "active" — but only one post is displayed at a time via `postIdx`. When that creator has multiple music/audio posts, they all try to play simultaneously.

**Fix**: Pass a unique active key combining `creatorId + postIdx`. In `renderMedia`, compare not just the creator but also the specific post index. Change the `isActive` prop to:
```
isActive={activeCreatorId === creator.userId && postIdx === (creatorPostIndices[creator.userId] || 0)}
```

Wait — `postIdx` in the map IS always the current index. The issue is that `renderMedia` is only called for the single visible post. Let me re-examine...

Actually, only one post per creator is rendered (line 1646: `const post = creator.posts[postIdx]`), so the render itself is correct. The real issue is that `MusicPreviewPlayer` creates a new audio element each time it mounts but when `postIdx` changes, the old component unmounts and the new one mounts — the old audio may not be cleaned up fast enough, or the `useEffect` cleanup race with the new autoplay causes overlap.

**Real fix**: Call `globalAudioManager.stopAll()` inside `navigateCreatorPost` (already done at line 1058) AND also add it to the `useEffect` that runs when `creatorPostIndices` changes. Additionally, ensure the `MusicPreviewPlayer` cleanup in its `useEffect` return properly stops audio before the new instance starts.

### Files to Edit

**`src/pages/MemryPage.tsx`**:
- Lines 1732-1774: Replace horizontal bottom nav with vertical left-side nav
- Line 1295: Change `bottom-36` to `bottom-2` and adjust `right-20` to `right-4`
- Line 1187: Adjust action buttons `bottom-32` to `bottom-2` to match new layout (or keep right-side as-is since nav moved to left)
- Add `useEffect` watching `creatorPostIndices` to call `globalAudioManager.stopAll()`

