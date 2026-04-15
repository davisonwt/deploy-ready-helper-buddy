

# CaaS Evolution Plan: Orchard Shepherd AI + Language/Tone Overhaul

## Summary

Transform Sow2Grow into a warm, human-first Communication as a Service platform by: (1) introducing the "Orchard Shepherd" AI companion, (2) purging all transactional/legalistic language, (3) strengthening the CaaS people-first feel, and (4) softening the visual and interaction design.

---

## Phase 1: Language & Tone Overhaul (Start Here)

Sweep the entire codebase and replace every instance of prohibited language with warm S2G terminology. This is the foundation — everything else builds on it.

**Files and changes:**

| Current Term | S2G Replacement | Files Affected |
|---|---|---|
| "Donate" / "Donation" | "Bestow" / "Bestowal" | `DonateModal.tsx` → rename to `BestowalModal.tsx`, `SocialActionButtons.tsx`, `ChatRoom.tsx`, `MemryPage.tsx` |
| "Confirm Donation" | "Send Your Bestowal" | `DonateModal.tsx` |
| "crowdfunding" | "community orchard" | `HelpTooltip.tsx`, `PlantModal.tsx`, `CrowdfundingCard.jsx` → rename to `OrchardCard.jsx`, `FeaturedOrchards.jsx` |
| "Funding Progress" | "Growth Journey" | `OrchardPage.jsx` |
| "Contributing funds" | "Watering the orchard" | `HelpTooltip.tsx` |
| "Multiple pocket funding" / "Complete funding required" | "Community-watered growth" / "Full harvest bestowal" | `EditOrchardPage.jsx`, `QuickOrchardCreator.jsx` |
| "Quick funding" | "Swift bestowal" | `QuickOrchardCreator.jsx` |
| "campaign" | "orchard" or "journey" | Global sweep |

Also soften tooltip definitions in `HelpTooltip.tsx`:
- orchards → "Living gardens where your seeds grow with the community's care"
- sowing → "Planting your vision into the community soil"
- rain → "Gentle gifts of encouragement to fellow sowers"
- seeds → "The beginning of something beautiful — your idea taking root"
- bestowals → "Heartfelt gifts that water someone's orchard"

---

## Phase 2: Orchard Shepherd AI Companion

A warm, wise AI presence woven into key moments — not a chatbot, but a gentle guide that appears naturally.

### 2A: Edge Function — `orchard-shepherd`

New Supabase Edge Function at `supabase/functions/orchard-shepherd/index.ts` using the existing Lovable AI Gateway. Accepts a `context` parameter indicating the moment type:

- **`sow-description`** — When creating a new Orchard, generates a warm, growth-metaphor description from the sower's rough input
- **`progress-update`** — Given orchard stats (% filled, days active, bestower count), generates an uplifting progress message
- **`harvest-story`** — When an orchard reaches 100%, crafts a celebratory "Harvest Story"
- **`bestower-suggestion`** — After a bestowal, suggests other orchards that might resonate (soft, never pushy)

System prompt enforces S2G tone: warm, hopeful, gently spiritual, growth metaphors, never preachy or transactional.

### 2B: Frontend Integration

| Location | Shepherd Feature | Component |
|---|---|---|
| `CreateOrchardPage.jsx` | "Let the Shepherd help you describe your seed" button — AI writes/rewrites the orchard description | New `ShepherdDescriptionHelper.tsx` |
| `OrchardPage.jsx` | Replace static "Growth Journey" section with AI-generated progress narrative | New `ShepherdProgressCard.tsx` |
| Orchard at 100% | Auto-generate and display a "Harvest Story" post in the feed | Trigger in `HomeFeed.tsx` |
| Post-bestowal confirmation | Gentle card: "Other orchards that might warm your heart…" | New `ShepherdSuggestions.tsx` in `PaymentSuccessPage.tsx` |

### 2C: Shepherd Visual Identity

- Subtle leaf/sprout icon (🌿) next to AI-generated text
- Soft green glow border (like the existing `AIStoryCard` green left border)
- Label: "From the Orchard Shepherd" in small muted text
- Never intrusive — feels like a whispered encouragement

---

## Phase 3: CaaS — People-First Connection

### 3A: Profile Humanisation
- On orchard pages, expand the sower section to show their story, avatar, and a warm "About the Sower" paragraph
- Add a "Send a Word of Encouragement" button that opens direct messaging (links to existing ChatApp)

### 3B: Social Feed Warmth
- Add gentle "dopamine moments": animated sprout growing when someone bestows, soft confetti of leaves
- Replace any remaining dollar-sign icons with heart/sprout/rain icons in feed cards
- Add warm empty-state messages: "The garden is quiet today… why not plant something beautiful?"

### 3C: Bestowal Flow Softening
- Rename `BestowalUI.jsx` section headers from stats-heavy to story-driven: "This orchard's journey so far…"
- Replace `$` currency icons with gentle rain/growth visuals
- Post-bestowal: warm thank-you screen with Shepherd message instead of generic success

---

## Phase 4: Visual Polish

- Soften the orchard progress bar: replace the flat `<Progress>` with an animated growing tree/vine visual (CSS-based, lightweight)
- Warmer colour touches: more soft gold (#d4a574) and sage green (#8fbc8f) accents
- Gentle micro-animations on bestowal (rain drops falling, seed sprouting)

---

## Technical Details

- **AI calls**: All through `orchard-shepherd` edge function → Lovable AI Gateway (`google/gemini-3-flash-preview`)
- **No new database tables** needed for Phase 1-2; the Shepherd generates text on-the-fly and optionally caches in existing `seed_story_overrides` pattern
- **Rename files**: `DonateModal.tsx` → `BestowalModal.tsx`, `CrowdfundingCard.jsx` → `OrchardCard.jsx` (update all imports)
- **~15 files edited** for language sweep, **~5 new components** for Shepherd, **1 new edge function**

---

## Suggested Implementation Order

1. Language/tone sweep (Phase 1) — immediate, no dependencies
2. Orchard Shepherd edge function (Phase 2A) — foundation for AI features
3. Shepherd UI components (Phase 2B-C) — integrate into existing pages
4. CaaS people-first enhancements (Phase 3) — build on clean language
5. Visual polish (Phase 4) — final layer

