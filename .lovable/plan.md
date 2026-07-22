# Rename tile + categorize the 2 marketing videos

Great idea — the Learn & Share page is already the right home for these. Two small, scoped changes:

## 1. Rename the dashboard tile
In `src/pages/DashboardPage.jsx`, change the Learn & Share card:
- Title: **"Learn & Share Marketing Videos"**
- Subtitle: **"Share to grow your tribe"** (or keep "Explainer videos" — your call)

## 2. Place the 2 rendered marketing videos into their correct categories
In `src/pages/LearnSharePage.jsx` (currently the gallery, 40 videos), assign:

- **"What is Sow2Grow?"** → `PLATFORM` category (overview / elevator pitch)
- **"The Tribe Economy in 60 Seconds"** → `FIELD` category (income / economy)

Both entries will use the CDN asset pointers already added:
- `src/assets/marketing/s2g-what-is-sow2grow.mp4.asset.json`
- `src/assets/marketing/s2g-tribe-economy.mp4.asset.json`

If those two videos currently sit in a generic "House Reel" section, I'll remove the duplicate entries so each video appears once under its proper category.

## Out of scope
- No changes to the referral banner, category chips, routing, or the other 38 placeholder videos.
- No changes to the Marketing Videos Gallery route.

Confirm the two category assignments (PLATFORM + FIELD) and I'll ship it. Want a different pairing (e.g. both under PLATFORM)?
