

# Explainer Videos for S2G Platform — Each Feature, Its Own Video

## Overview

We'll create a series of animated MP4 explainer videos using **Remotion** (code-based motion graphics), each covering a distinct feature of the S2G platform. Each video will be 15-25 seconds, rendered at 1920x1080, with a consistent S2G brand aesthetic across all videos.

---

## Visual Direction

- **Palette**: Warm terracotta (`#B85042`), deep forest green (`#2C5F2D`), sandy cream (`#E7E8D1`), ochre gold (`#D4A843`), dark navy (`#001f3f`)
- **Fonts**: Display: Playfair Display (warm, grounded). Body: Inter (clean, modern)
- **Motion style**: Smooth spring-based reveals, card fly-ins, icon animations, text staggers
- **Motifs**: Seed/sprout iconography, earth-tone gradients, organic rounded shapes
- **Structure per video**: Hook title (2s) → Feature walkthrough with animated mockups (10-18s) → Closing tagline with S2G branding (3s)

---

## Videos to Create (10 total)

| # | Video | Duration | Key Visuals |
|---|-------|----------|-------------|
| 1 | **Platform Overview** — What is S2G? | ~20s | Community montage, feature icons flying in, tagline |
| 2 | **Marketplace & Products** — Buy & sell as a Sower | ~20s | Product cards, basket flow, Sower profile |
| 3 | **Services & Gig Booking** — Rides, skills, whisperers | ~20s | Service cards, booking modal mockup, driver tracking |
| 4 | **The Wandering Pillow (Stays)** — Holiday marketplace | ~20s | Stay cards, discovery filters, booking flow |
| 5 | **ChatApp & Communications** — Voice, video, messaging | ~20s | Chat bubbles, voice/video icons, DM flow |
| 6 | **Radio & Music** — Grove Station, 364 TTT | ~20s | Radio player mockup, music waveform, live sessions |
| 7 | **Training & Skill Drops** — Learning rooms | ~20s | Classroom cards, skill-drop icons, certificate |
| 8 | **Sacred Calendar (YHVH Days)** — Enochian calendar | ~20s | Calendar grid animation, feast day highlights |
| 9 | **GoSat Wallet & Tithing** — Financial features | ~20s | Wallet cards, tithe flow, earnings dashboard |
| 10 | **AI Assistant & Tools** — AI-powered features | ~20s | Chat stream animation, sparkle effects, tool cards |

---

## Technical Approach

1. **Set up a single Remotion project** in `remotion/` with shared brand components (background, title scene, closing scene)
2. **Each video gets its own composition** registered in `Root.tsx` — can render them individually
3. **Shared components**: `BrandBackground.tsx`, `TitleScene.tsx`, `ClosingScene.tsx`, `FeatureCard.tsx`, `IconReveal.tsx`
4. **Render each video** via the programmatic render script to `/mnt/documents/` as separate MP4s (e.g., `s2g-explainer-01-overview.mp4`)
5. **Frame checks** via `bunx remotion still` before full renders

---

## Implementation Order

Due to rendering time constraints (~600s timeout per command), we'll build and render videos in batches:

- **Batch 1**: Set up project + shared components, render videos 1-3
- **Batch 2**: Render videos 4-6
- **Batch 3**: Render videos 7-10

Each video render takes ~1-2 minutes. We'll spot-check key frames before committing to full renders.

---

## Deliverables

10 downloadable MP4 files in `/mnt/documents/`, each a self-contained explainer for one feature of the S2G platform, all sharing a cohesive S2G brand identity.

