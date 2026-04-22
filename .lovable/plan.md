
## Honest assessment

No — the current result is not an exact match to the Wandering Wheel card.

The reason is now clear from the code:
- `src/pages/MarketingVideosPage.tsx` is no longer the problem; there is no special HTML overlay left on those two cards.
- The mismatch comes from `remotion/src/components/CornerLogo.tsx`, which currently renders `logo.jpeg` as a rounded rectangle:
  - `top: 80`
  - `left: 84`
  - `width: 140`
  - `borderRadius: 16`
- That is a guessed treatment, not the same visual badge as the reference card.
- `TribalHeartsTrailer.tsx` also contains a separate circular `LogoBadge` style internally, but the actual root composition still adds the generic `CornerLogo`, so the corner branding is inconsistent.
- `OnboardingSower.tsx` already has a more reference-like circular logo treatment in its outro, but its persistent corner logo is still the wrong generic component.

## What will be fixed

### 1. Replace the guessed corner logo with the exact reference treatment
Update `remotion/src/components/CornerLogo.tsx` so it matches the real Wandering Wheel corner badge, not a simplified approximation.

That means matching:
- shape
- asset choice
- background
- border
- shadow
- internal padding
- final rendered size
- top/left placement

### 2. Use the same brand asset/style everywhere
Stop mixing these two styles:
- square/rounded `logo.jpeg`
- circular `logo-transparent.png` badge

Use one exact corner-badge implementation for both videos so they are visually identical to the reference.

### 3. Update both Remotion videos to use only that exact badge
Apply the corrected corner component to:
- `remotion/src/videos/OnboardingSower.tsx`
- `remotion/src/videos/TribalHeartsTrailer.tsx`

For `TribalHeartsTrailer.tsx`, keep the scene content intact but ensure the root-level visible corner badge uses the corrected implementation, not the current generic one.

### 4. Match against the actual rendered reference video, not code assumptions
Use the existing rendered `wandering-wheel.mp4` as the source of truth.

Implementation verification will be based on extracted frames from:
- `public/videos/banners/wandering-wheel.mp4`
- `public/videos/onboarding-sower-v1.mp4`
- `public/videos/tribal-hearts-trailer-v7.mp4`

The badge will be adjusted until it visually matches the reference frame, rather than relying on approximate styling from current TSX files.

### 5. Re-render the two MP4 assets
Regenerate:
- `public/videos/onboarding-sower-v1.mp4`
- `public/videos/tribal-hearts-trailer-v7.mp4`

### 6. Final visual QA
Verify all of the following before calling it done:
- top-left badge is the same shape as Wandering Wheel
- size is the same
- inset from top and left is the same
- background/border/shadow match
- no double-logo
- card preview on `/marketing-videos` looks identical in branding treatment

## Files to change
- `remotion/src/components/CornerLogo.tsx`
- `remotion/src/videos/OnboardingSower.tsx`
- `remotion/src/videos/TribalHeartsTrailer.tsx`
- regenerated MP4s in `public/videos/`

## Technical details
Current mismatch is caused by `CornerLogo.tsx` using:
```ts
<Img src={staticFile("logo.jpeg")} />
borderRadius: 16
```

The correction should move to the same circular badge language already hinted at elsewhere in the codebase:
```ts
background: rgba(255,255,255,...)
borderRadius: 999
border: ...
<Img src={staticFile("logo-transparent.png")} />
```

But the final values should be tuned from the actual Wandering Wheel render, not guessed.

## Expected result
After this correction, the “Become a Sower in 60 Seconds” and “Tribal Hearts” cards will use the same baked-in corner logo treatment as the Wandering Wheel reference card, with no visible difference in badge style, size, or placement.
