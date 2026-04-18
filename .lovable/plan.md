
Yes — I understand the Community Orchard model completely. Let me restate it back so we're aligned, then present the plan.

## My understanding

A **Community Orchard** is a tribe-funded relief vehicle:
1. **A need is identified** — a tribe member needs something tangible (a vehicle, rent, fuel, school fees, a fridge, medical bills, clothing, food).
2. **An orchard is opened** with the total cost split into many **bestowal pockets** (e.g. a $2,000 vehicle = 200 pockets of $10, or 40 pockets of $50).
3. **Tribe members bestow** freely into one or more pockets — small gifts, no single hero donor required.
4. **When the last pocket fills**, the orchard is "complete" and the **seed is delivered** to the recipient (vehicle bought, rent paid, etc.).

It's micro-tithing meets community crowdfunding, framed in the S2G "sow / pocket / orchard / bestowal" language.

## Storyboard (3 beats, ~18s, matching the v3 cinematic style)

Same painterly cinematic look as Wandering Wheel — globally diverse cast, warm golden-hour grade, real-world scenes, no AI text on screen.

| Beat | Time | Visual | Caption (overlay) |
|---|---|---|---|
| **A — The Need** | 0–6s | A tribe member (e.g. a mother outside a modest home, or a father standing by a broken-down vehicle) shares a need. Other members listening warmly, hands on shoulders. | *"A tribe member has a need…"* |
| **B — Pockets Filling** | 6–12s | Glowing tree with many luminous pockets along its branches; hands from many directions placing small golden seeds into pockets; pockets light up one by one as a counter visually fills. | *"The tribe fills the pockets — one bestowal at a time."* |
| **C — Seed Delivered** | 12–18s | Recipient receiving the gift — keys to a vehicle handed over / rent paid receipt / fridge delivered to a kitchen. Joyful embrace, community celebrating around them. | *"Need fulfilled. The seed is delivered."* |

Closing card (last 2s): **"Open a Community Orchard"** + S2G mark.

## What I'll build

1. **3 cinematic keyframes** (painterly realism, warm grade, diverse cast) → `remotion/keyframes/v3/01-community-orchard-{a,b,c}.jpg`
2. **3 AI motion clips** (6s each, image-to-video) → `remotion/generated/v3/01-community-orchard-{a,b,c}.mp4.asset.json`
3. **Voiceover** (Chatterbox, ~17s warm narration) covering the 3 beats
4. **Final 18s MP4** assembled via `remotion/scripts/build-banners-v3.mjs` (concat → caption overlay → VO mux) → `public/videos/banners/community-orchard.mp4`
5. **Flip the dashboard tile** in `src/pages/MarketingVideosPage.tsx` from `available: false` → `available: true` for `community-orchard` so tribe members can immediately download the personalized version with their referral code burned in

## Voiceover script (~17s)

> "When a tribe member has a need — a vehicle, a home, fuel, food — the tribe responds. We open a Community Orchard, and together, one small bestowal at a time, we fill every pocket. When the last pocket glows, the seed is delivered. This is how we carry one another. Open a Community Orchard today."

## Files I'll touch

- `remotion/keyframes/v3/01-community-orchard-{a,b,c}.jpg` *(new — 3 keyframes)*
- `remotion/generated/v3/01-community-orchard-{a,b,c}.mp4.asset.json` *(new — 3 AI clips)*
- `remotion/generated/01-community-orchard-vo.mp3.asset.json` *(new — voiceover)*
- `remotion/scripts/build-banners-v3.mjs` *(update captions for `01-community-orchard` block)*
- `public/videos/banners/community-orchard.mp4` *(final rendered video, replaces the placeholder)*
- `src/pages/MarketingVideosPage.tsx` *(set `available: true` for `community-orchard`)*

## Time / cost honesty

~5–7 minutes total. 3 image gens + 3 video gens + 1 VO + 1 ffmpeg assembly. Same pipeline already proven on banners 04–10.
