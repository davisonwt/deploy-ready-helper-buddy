
## Goal

Make the **“Become a Sower in 60 Seconds”** and **“Tribal Hearts”** cards match the rest of the marketing video cards by putting the S2G logo into the actual video composition in the same top-left position/size/style as the existing banner videos.

## What went wrong before

The previous change added this kind of overlay in the page UI:

```tsx
<img className="absolute top-2 left-2 ..." />
```

That is not the same as the rest of the video cards because:

- It only affects the website card layer.
- It does not become part of the actual video.
- It can look slightly different depending on card size, responsive layout, and video crop.
- The other Remotion-generated S2G banner videos already include the logo as part of the rendered video asset.

## Correct fix

### 1. Remove the temporary page-level overlay

In `src/pages/MarketingVideosPage.tsx`, remove the special-case overlay currently applied only to:

- `onboarding-sower`
- `tribal-hearts`

This prevents those two cards from having a mismatched HTML logo layer.

### 2. Add a reusable Remotion corner logo component

Create or reuse a Remotion-only corner logo component that uses the same S2G asset and placement logic as the rendered banner videos.

Target visual behavior:

```text
top-left corner
same proportional size as existing rendered banner cards
same rounded logo treatment
same shadow/border feel
part of the MP4 itself
```

### 3. Add the logo to `OnboardingSower`

Update `remotion/src/videos/OnboardingSower.tsx` so the S2G logo appears persistently in the top-left corner across the video, matching the other banner videos.

This should be done inside the Remotion composition, not on the website card.

### 4. Add the logo to `TribalHeartsTrailer`

Update `remotion/src/videos/TribalHeartsTrailer.tsx` so the S2G logo appears in the same top-left position and size.

Important: the current `TribalHeartsTrailer.tsx` contains logo-related components, but they are not actually being rendered in the active scene output. The fix is to render the logo layer in the actual root composition.

### 5. Re-render the two MP4 files

Regenerate:

- `public/videos/onboarding-sower-v1.mp4`
- `public/videos/tribal-hearts-trailer-v7.mp4`

The marketing page already points to these files, so once they are regenerated correctly, the cards will naturally match the rest.

### 6. Verify visually

After rendering, check the two videos against the existing cards on `/marketing-videos`:

- Logo is top-left.
- Logo size matches the other video cards.
- Logo is inside the video, not floating above it.
- No double-logo remains.
- Mobile/card preview still looks consistent.

## Files to change

- `src/pages/MarketingVideosPage.tsx`
- `remotion/src/videos/OnboardingSower.tsx`
- `remotion/src/videos/TribalHeartsTrailer.tsx`
- regenerated MP4 assets in `public/videos/`

## Expected result

The two problem cards will match the rest because the logo will be baked into the video assets the same way the existing S2G marketing banners are, instead of being patched with a separate web overlay.
