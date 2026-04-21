

## Tribal Hearts — "Fireside Sanctuary" visual & flow redesign

### Vision in one line
Re-skin the entire Tribal Hearts journey as a **warm walnut-wood, firelit, sacred sanctuary** — Spirit Names, elemental glyphs, golden glow — matching your 21 reference images. No backend changes; the safety rails (Ambassador-only, hetero, in-house chat, no PII) stay exactly as they are.

### What you'll see (mapped to your images)

| Your reference | What we build |
|---|---|
| #17 "Intro/Waitlist" splash | New **HeartsLanding** screen: lotus-heart logo, "Tribal Hearts", single "Enter the Sanctuary" button, sow2grow seal at bottom |
| #10 "Join the Tribe" form | Redesigned **HeartsOnboardingWizard step 1** — Spirit Name, Date of Birth, Village/Community, Real Name (private), "Begin Your Search" |
| #11 "Define Your Spirit Path" | **Onboarding step 2** — Earth/Air/Fire/Water element picker + interest chips + Spirit Name origin (Heritage/Nature/Mythology) |
| #18 "Define Your Bestowal Pact" | **Onboarding step 3** — confirms Ambassador $5/mo + 10% tithing + 5% admin fee, "Continue Journey" |
| #19 "Tribal Profile" | Redesigned **profile card** — large portrait in golden frame, Spirit Name in serif, element badge (top-right), 3 interest icon-tiles, "Send a Message" |
| #13/#14 "Explore New Connections" | Redesigned **HeartsBrowseCard** + **HeartsProfileSheet** — wood panel, gold-rimmed circular portrait, Spirit Name, 2-3 trait icons, bio, Like + Send Message + voice/video icons |
| #15/#20 fireside chat | Re-skinned **ChatApp room** for Tribal Hearts matches — wood background, golden glowing speech bubbles, "Secured via Sow 2 Grow — No Contact Shared" footer, gift/voice/video buttons |
| #16/#21 fireside video call | Re-skinned **call view** stacking both portraits with Spirit Names, golden frame, mute / end / flip-camera glowing icons |

### What changes (visual only — zero schema changes)

**1. New design tokens (`src/styles/tribal-hearts.css`)**
Walnut wood gradient, firelight gold (#E8B86B / #F4C77A), ember orange (#D97706), parchment cream, sacred-glow shadow, serif display font (Cinzel or similar — already in use elsewhere).

**2. New shared atoms (`src/components/hearts/atoms/`)**
- `WoodPanel` — walnut gradient + heart-watermark + soft inner shadow
- `GoldFrame` — golden ring with ember glow (for portraits & buttons)
- `GlowButton` — the warm pill button from images #10/#18/#19
- `ElementGlyph` — Earth/Air/Fire/Water round icons
- `SacredFooterGlyphs` — the tree-of-life · clasped-hands · lotus-heart row

**3. New screens / re-skinned components**
- **`HeartsLanding.tsx`** (new) — replaces the current "Lock / Become Ambassador" gate look with image #17's sanctuary splash; for non-Ambassadors the "Enter the Sanctuary" button routes to `/tribe-ambassador`.
- **`WelcomeAbout.tsx`** — re-skinned to wood-panel + golden glyphs (currently functional but plain).
- **`HeartsOnboardingWizard.tsx`** — same questions/data, restyled as 3 sacred steps (#10 → #11 → #18). Adds optional "Spirit Name" field stored as `display_first_name`. Element + origin saved into existing `lifestyle` jsonb (no migration).
- **`HeartsBrowseCard.tsx` + `HeartsProfileSheet.tsx`** — re-skinned to images #13/#14/#19.
- **`MeetTheTribe.tsx`** header — wood banner, "Meet the Sisters / Brothers" in serif gold.
- **Tribal Hearts chat & call skin** — when ChatApp opens a `tribal_hearts_matches` room, apply the wood/gold theme (#15, #20) and show the "Secured via Sow 2 Grow — No Contact Shared" lock badge. Call view (#16, #21) gets the same treatment via a `tribal-hearts` className on the call shell.

**4. Asset generation**
Generate 6 lightweight SVG glyphs (lotus-heart logo, tree-of-life, clasped hands, Earth/Air/Fire/Water) into `src/assets/hearts/` so it stays crisp, fast, and on-brand — no heavy AI imagery in the actual UI (your reference photos are mood, not assets).

### What we deliberately keep unchanged
- Ambassador gate (`useTribalHeartsAccess`)
- DB-enforced hetero matching, 18+, RLS policies, all 4 edge functions
- ChatApp itself — only the **skin** of Tribal Hearts rooms changes; the messaging engine is untouched
- No emails, no phones, no off-platform contact ever surfaced
- All current data in `tribal_hearts_profiles` continues to work (Spirit Name = `display_first_name`, element/origin = `lifestyle.element` / `lifestyle.spirit_name_origin`)

### Feasibility & honest trade-offs
- **100% achievable** with our existing stack (React + Tailwind + the design tokens we already use for warm-palette financial surfaces).
- The reference images use heavy photographic mood lighting; we'll capture the **feeling** with CSS gradients + subtle wood-grain SVG + golden glow shadows — much faster than real images and identical vibe in-app.
- Performance stays excellent (SVG glyphs, no extra deps).
- Estimated scope: ~12 files touched/created, no DB migration, no edge function changes.

### Files that will change / be created
**Created**
- `src/styles/tribal-hearts.css` (theme tokens + wood-grain background)
- `src/components/hearts/atoms/WoodPanel.tsx`
- `src/components/hearts/atoms/GoldFrame.tsx`
- `src/components/hearts/atoms/GlowButton.tsx`
- `src/components/hearts/atoms/ElementGlyph.tsx`
- `src/components/hearts/atoms/SacredFooterGlyphs.tsx`
- `src/components/hearts/HeartsLanding.tsx`
- `src/assets/hearts/` (6 SVGs)

**Updated (visual re-skin only)**
- `src/pages/TribalHearts.tsx` (gate → HeartsLanding, wrap in sanctuary background)
- `src/components/hearts/WelcomeAbout.tsx`
- `src/components/hearts/HeartsOnboardingWizard.tsx` (adds Spirit Name + Element + Origin steps)
- `src/components/hearts/HeartsBrowseCard.tsx`
- `src/components/hearts/HeartsProfileSheet.tsx`
- `src/components/hearts/MeetTheTribe.tsx`
- `src/components/hearts/HeartsHeader.tsx`
- ChatApp room shell — add `tribal-hearts` themed wrapper when `match_id` is from `tribal_hearts_matches`

### After approval
You'll get the full sanctuary look end-to-end: splash → onboarding → garden browse → profile → chat → call, all in the firelit walnut/gold language from your 21 references — and Julia (and every Ambassador) will feel they've stepped into something truly sacred, not just another dating app.

