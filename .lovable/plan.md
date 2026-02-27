

## Enhanced Biz Ads: Multi-Layer Ad Builder

Great idea. Right now ads are single-file uploads. You're describing something closer to a **composite ad** -- a visual (image or video) combined with a voiceover track and overlay text. Here's what I'd build:

### Concept: Multi-Layer Ad Upload

Instead of one file, each ad gets up to 3 layers:

```text
┌─────────────────────────────┐
│  VISUAL LAYER               │  ← Image or short video (required)
│  (background / main media)  │
├─────────────────────────────┤
│  VOICEOVER LAYER            │  ← Audio file (optional)
│  (plays over the visual)    │
├─────────────────────────────┤
│  TEXT OVERLAY                │  ← Headline + tagline text (optional)
│  (displayed on the visual)  │
└─────────────────────────────┘
```

### Database Changes

Add new columns to `biz_ads`:
- `voiceover_url` (text, nullable) -- separate audio track URL
- `overlay_headline` (text, nullable) -- bold headline text shown on the ad
- `overlay_tagline` (text, nullable) -- smaller subtitle/CTA text
- `overlay_position` (text, default 'bottom') -- where text appears: top, center, bottom

### Upload Form Changes (MyBizAdsPage)

Replace the single dropzone with a **step-based form**:
1. **Visual** (required) -- drag/drop image or short video (max 60s)
2. **Voiceover** (optional) -- upload an audio file or record one in-browser
3. **Text Overlay** (optional) -- headline + tagline input fields with position selector
4. **Preview** -- shows the composite result before submitting

### Community Gallery Changes (CommunityBizAdsPage)

- Render text overlay on top of image/video using absolute-positioned elements
- Auto-play voiceover when ad card is clicked or expanded
- For radio playback: if ad has a voiceover, play it; otherwise skip audio portion

### Ad Card Preview (both pages)

- Image/video displays with text overlay rendered on top (gradient background behind text for readability)
- Small speaker icon indicates voiceover is attached
- Click to preview the full composite ad in a modal with audio playback

### Implementation Steps

1. Run migration to add `voiceover_url`, `overlay_headline`, `overlay_tagline`, `overlay_position` columns to `biz_ads`
2. Rebuild the upload dialog in `MyBizAdsPage.tsx` with separate visual + voiceover dropzones and text overlay fields
3. Update ad cards in both pages to render text overlays on the visual and play voiceover on interaction
4. Update `CommunityBizAdsPage.tsx` with the enhanced ad card display and preview modal

