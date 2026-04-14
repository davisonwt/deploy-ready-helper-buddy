

# Tribe Ambassador Program — Full Build Plan

## What Exists Today

- **Ambassador application form** at `/ambassador-thumbnail` — a long signup form with CAPTCHA, email verification, and admin review workflow
- **`ambassador_applications` table** in Supabase with status tracking (pending/approved/rejected)
- **Admin dashboard tab** for reviewing applications
- No ambassador dashboard, no toolkit, no subscription, no cinematic onboarding

## What We're Building

A complete Ambassador ecosystem with 4 major pieces:

### 1. Ambassador Landing / Discovery Page (`/tribe-ambassador`)

A cinematic dark-mode page with S2G signature colors (teal/green/gold neon accents on near-black). Sections:

- **Hero** — Full-bleed dark gradient with animated floating orb particles, headline "Claim Your Throne. Unleash Your AI Legion.", $5/month callout
- **Value Stack** — 6 animated benefit cards (Arsenal, Viral Forge, Growth Legion, Brochure Empire, Tribe Network, Legacy Builder) with glowing icons and hover effects
- **"Why Ambassadors Win"** — Scrolling comparison (without vs with Ambassador) using animated reveal
- **CTA** — "Become a Tribe Ambassador" button that triggers the upgrade flow

### 2. Ambassador Dashboard / Hub (`/ambassador-hub`)

Protected route (only approved ambassadors). Sections:

- **Welcome header** with personalized greeting, Ambassador Seal badge, and status
- **6 Toolkit Cards** in a responsive grid, each linking to its agent/feature:
  - **Branded Arsenal** — links to AI asset generation (logos, banners, frames) using existing AI assistant infrastructure
  - **Viral Forge Agent** — content creation interface with platform targeting
  - **Growth Legion** — agent squad status dashboard with campaign metrics
  - **Brochure & Offer Empire** — funnel/brochure builder UI
  - **Tribe Network** — link to private ambassador chat channel
  - **Legacy Builder** — Featured Ambassador spotlight + nomination

### 3. Floating Discovery Orb

A pulsing glowing orb component added to the dashboard/feed that links to `/tribe-ambassador`. Visible to non-ambassadors only.

### 4. Onboarding & Activation Flow

After approval, a celebratory modal with particle effects, Ambassador Seal reveal, and quick-start actions.

## Technical Plan

### Database
- Add `is_ambassador` boolean + `ambassador_since` timestamp to profiles or use existing `ambassador_applications` status = 'approved' as the source of truth
- Add `ambassador_subscription` table for $5/month tracking (or integrate with existing payment infrastructure)

### New Files to Create

| File | Purpose |
|------|---------|
| `src/pages/TribeAmbassadorPage.tsx` | Landing/discovery page |
| `src/pages/AmbassadorHubPage.tsx` | Dashboard hub (protected) |
| `src/components/ambassador/AmbassadorHero.tsx` | Cinematic hero section |
| `src/components/ambassador/AmbassadorValueStack.tsx` | 6 toolkit benefit cards |
| `src/components/ambassador/AmbassadorToolkit.tsx` | Hub toolkit grid |
| `src/components/ambassador/AmbassadorSeal.tsx` | Animated seal/badge component |
| `src/components/ambassador/FloatingAmbassadorOrb.tsx` | Pulsing discovery orb |
| `src/components/ambassador/AmbassadorActivationModal.tsx` | Celebratory onboarding modal |
| `src/components/ambassador/ParticleBackground.tsx` | Canvas particle effects |

### Files to Edit

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/tribe-ambassador` and `/ambassador-hub` routes |
| `src/components/layout/AppSidebar.tsx` | Add Ambassador nav item |
| `src/components/dashboard/SocialFeedDashboard.tsx` | Add FloatingAmbassadorOrb |

### Design System

- **Background**: Near-black (`#0a0a0f`) with subtle radial gradients
- **Primary accent**: S2G teal (`#0d9488` / `hsl(188 78% 41%)`)
- **Secondary accent**: Gold (`#f59e0b`) for Ambassador-exclusive elements
- **Glow effects**: CSS `box-shadow` with teal/gold spread, `animate-pulse` for orbs
- **Typography**: Existing app fonts, but larger/bolder for hero sections
- **Cards**: Glass-morphism (`bg-white/5 backdrop-blur-sm border border-white/10`)
- **Particles**: Lightweight canvas-based floating dots in teal/gold

### Payment Integration

The $5/month subscription will use the existing NOWPayments/PayPal infrastructure (consistent with S2G's financial philosophy). The ambassador status is granted upon admin approval of the application + active subscription.

### Scope Boundaries

- The toolkit cards in the hub will be **visual entry points** that link to existing features (AI assistant, chat, content creation) or show "Coming Soon" states for features not yet built
- No new edge functions needed for Phase 1 — we leverage existing AI assistant and payment hooks
- Voice command activation is noted but deferred to when a voice interface exists

