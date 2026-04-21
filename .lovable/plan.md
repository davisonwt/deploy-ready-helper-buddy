

# Sower Onboarding Explainer Video

A cinematic 6-scene explainer (≈45s) walking new users through the exact path from landing page → sign-up form → first login → security questions setup. Uses the 8 screenshots you uploaded as the "hero" visuals so users see the *actual* UI they will encounter.

## Story Arc & Voiceover Script

| # | Scene (≈duration) | Screenshot | Voiceover line |
|---|---|---|---|
| 1 | **Welcome** (6s) | `register.jpeg` (welcome to sow2grow landing) | *"Welcome to sow2grow — the farm stall of the 364yhvh community. Becoming a sower takes just 60 seconds. Let's walk through it together."* |
| 2 | **Plant your seed** (6s) | `register_2.jpeg` (Plant Your Seed in the Garden) | *"Tap 'Sow your first seed', then choose the full registration form to plant your seed in the garden."* |
| 3 | **Tell us about you** (8s) | `register_3.jpeg` (name/email/country form) | *"Add your name, email and country. Phone and referral code are optional — only one orchard per email."* |
| 4 | **Lock it in** (8s) | `register_4.jpeg` + `register_5a.jpeg` (password + Become a Sower button) | *"Pick your currency, then create a strong password — 12 characters with a capital, number and special. Tap 'Become a Sower & Bestower' and your orchard is born."* |
| 5 | **First sign-in** (7s) | `register_5b.jpeg` + `register_6.jpeg` (Welcome Home + Enter the Garden) | *"Next time, sign in from the welcome home screen. Enter your email and password and tap 'Enter the Garden'."* |
| 6 | **Secure your recovery** (8s) | `register_7.jpeg` (dashboard with gear highlighted) | *"Super important: on your dashboard, tap the gear icon (top right) and set up your three security questions. This is how you recover your password if you ever forget it."* |
| 7 | **Outro** (4s) | sow2grow logo + sparkles | *"You're home. Welcome to the tribe."* |

Total ≈47s.

## Visual & Motion Direction

- **Aesthetic**: matches existing banner system — Playfair Display headings + DM Sans body, walnut/gold/blush palette (`#E1C16E` gold, `#E48AA0` blush, `#3B1F31` plum bg) consistent with the brand.
- **"Phone-frame" device mock**: each screenshot is presented inside a rounded device-like card with soft glow, so it reads as "look at the actual app" not a slideshow.
- **Highlight pings**: animated golden circle/arrow pings draw the eye to the *exact* button being described in the voiceover ("Sow your first seed", "Become a Sower & Bestower", gear icon, etc.).
- **Step counter**: persistent corner pill `Step 1 of 6 → Step 6 of 6` so users always know where they are.
- **Motion**: gentle Ken Burns zoom on screenshots, springy entrance for headings, soft cross-fade transitions between scenes.
- **Audio**: ElevenLabs voiceover (warm, friendly female voice — same pipeline as existing banners) + subtle ambient music bed.

## Technical Plan

1. **Copy 8 screenshots** from `user-uploads://` into `remotion/public/onboarding/01..08.jpeg`.
2. **Generate voiceover** via existing ElevenLabs script pattern → `remotion/public/voiceovers/onboarding-sower.mp3` (one continuous track, scenes timed to match).
3. **Create scene component** `remotion/src/videos/OnboardingSower.tsx` — single composition, 7 sequenced scenes, reusing the proven `LogoBadge`/Ken Burns/highlight-ping patterns from `TribalHeartsTrailer.tsx`.
4. **Register composition** `onboarding-sower` in `remotion/src/Root.tsx` (1920×1080, 30 fps, ≈1410 frames).
5. **Render script** `remotion/scripts/render-onboarding-sower.mjs` (clone of existing render scripts) → outputs `/mnt/documents/onboarding-sower.mp4`.
6. **Deliver** as a downloadable `<lov-artifact>` MP4.

## Files to Create

```text
remotion/public/onboarding/01-landing.jpeg ... 08-dashboard.jpeg
remotion/public/voiceovers/onboarding-sower.mp3
remotion/src/videos/OnboardingSower.tsx
remotion/scripts/generate-onboarding-sower-vo.mjs
remotion/scripts/render-onboarding-sower.mjs
remotion/src/Root.tsx        (add 1 Composition entry)
```

No app code is touched — this is a self-contained Remotion video that renders to MP4.

