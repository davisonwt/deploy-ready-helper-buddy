

## S2G AI-App Market Readiness Plan

The biggest thing still needed is not more isolated AI tools. It is a **single Orchard Command Flow** where the user says what they have, the Orchard Companions coordinate the listing, and the user only approves the important decisions.

Current state: S2G has many strong pieces already:
- Auth, profiles, marketplace products, bestowals, payments, Jitsi calls, messaging, Whisperers, and Orchard Companions.
- Existing Companion functions for Sage, Loaf, Debian, Kali, Fedora, Mint, Gentoo, Ubuntu, Arch.
- Existing task/activity/suggestion tables for agent coordination.

Main gap: those pieces are still surfaced as separate tools. The human is still acting as the project manager.

---

## Priority 1: Build the “Intelligent Listing” flow

Create a new guided AI-native listing path:

```text
Seed Keeper says:
“I have 50kg organic tomatoes, prefer local buyers, pickup by Friday.”

Gentoo starts the flow.
Sage suggests price.
Loaf suggests fulfillment options.
Debian writes the listing.
Kali/Fedora prepare media.
Mint prepares payment/bestowal setup.
Seed Keeper approves 3 cards.
Listing goes live.
```

### User-facing experience

Add a simple “Plant with Companion Help” entry point.

The user should see:
1. **Describe your Seed**
   - Text input first.
   - Voice input can be added after the text flow is stable.
2. **Companions are preparing your listing**
   - A warm progress view showing Orchard Companions doing the work.
3. **Three approval cards**
   - Price and fairness
   - Logistics and pickup/delivery
   - Listing copy, media, and payment
4. **Publish**
   - Local feed first.
   - Global feed optional.

Success target: from “I have tomatoes” to live listing in under 5 minutes.

---

## Priority 2: Add a real orchestration state machine

Create a shared workflow object so the agents are not just producing separate outputs.

Recommended new concept:

```text
intelligent_listing_sessions
```

Each session tracks:
- user_id
- raw_description
- parsed product details
- current stage
- Sage pricing output
- Loaf logistics output
- Debian listing copy
- Kali image output
- Fedora video/story output
- Mint payment setup output
- user approvals
- final product/listing id
- published status

Example stages:

```text
intake
parsing
pricing_ready
logistics_ready
content_ready
payment_ready
awaiting_approval
published
failed
```

This turns the Orchard Companions into a coordinated team instead of separate departments.

---

## Priority 3: Update Gentoo into the visible coordinator

Gentoo should become the user-facing coordinator for this flow.

Add a new orchestrator action:

```text
action: "intelligent_listing_start"
```

Then follow-up actions:

```text
intelligent_listing_refresh
intelligent_listing_approve_price
intelligent_listing_approve_logistics
intelligent_listing_approve_publish
intelligent_listing_publish
```

Gentoo should call or queue the other Companions:
- **Sage**: pricing recommendation
- **Loaf**: fulfillment options
- **Debian**: listing copy
- **Kali**: image prompt/generated image
- **Fedora**: 15-second harvest story script/video plan
- **Mint**: payment/bestowal setup
- **Arch**: buyer call scheduling later

---

## Priority 4: Make Sprint 1 marketable before Sprint 2 and 3

The first thing to market should be:

> “Turn what you have into a live values-led listing in minutes, with Orchard Companions helping price, present, and prepare it.”

Do not lead with all features at once.

### Sprint 1 market-ready scope

Build only:
- AI-assisted listing intake
- Pricing suggestion
- Logistics suggestion
- Listing copy generation
- Approval cards
- Publish to feed
- Basic bestowal/buy option
- Companion progress timeline

Delay until after Sprint 1:
- Full Whisperer contracts
- Escrow split automation
- Gratitude graph
- Feed ranking by bestowal ratio
- Advanced voice intake
- Fully generated video assets

---

## Priority 5: Fix market trust basics

Before inviting real users, tighten these core areas:

### Auth and session stability
Make sure users are not redirected to login while already logged in. This must be tested across:
- page refresh
- mobile browser
- returning after idle time
- protected routes
- payment return routes

### Payment clarity
Users need to understand:
- what they are paying
- who receives what
- what S2G keeps
- whether it is a purchase, bestowal, or subscription
- when funds are released

### Upload friction
The current upload form is too heavy for the AI-native vision. The new flow should not feel like a form. It should feel like a conversation with approvals.

### Mobile-first polish
Most early Seed Keepers and Whisperers will likely use mobile. The Intelligent Listing flow must work cleanly on small screens.

---

## Priority 6: Make the homepage and onboarding match the pivot

Update the public and early logged-in experience around one clear promise:

```text
Describe what you have.
Orchard Companions prepare the listing.
You approve.
Your tribe can bestow, buy, message, or call.
```

Add a simple beachhead path:
- “I have something to offer”
- “I want to support/buy”
- “I want to promote as a Whisperer”

For the first go-to-market version, the main beachhead should be:

## The Seed Keeper

A values-led creator, grower, maker, farmer, homesteader, or small seller who has something real to offer but does not want to manage marketing, pricing, listings, calls, and promotion manually.

---

## Priority 7: Add analytics around the 5-minute success metric

Track the exact funnel:

```text
started_intelligent_listing
description_submitted
pricing_generated
logistics_generated
content_generated
approval_price_clicked
approval_logistics_clicked
approval_publish_clicked
listing_published
first_buyer_viewed
first_message_received
first_call_scheduled
first_bestowal_or_purchase
```

This tells us where users drop off and whether the “AI-native” promise is working.

---

## Priority 8: Prepare a small pilot, not a broad launch

Recommended pilot group:
- 10 to 25 Seed Keepers
- preferably fresh produce, handmade goods, music/content, or local services
- one geographic/community cluster if possible

The pilot goal is not scale. The goal is proof:

```text
Can a new user create a live listing, receive interest, and understand S2G without explanation?
```

---

## Technical implementation order

### Step 1: Inspect and map existing listing/product schema
Confirm how current `products`, `sowers`, `orchards`, `bestowals`, payment links, and feed visibility connect.

### Step 2: Add session database table
Create `intelligent_listing_sessions` with RLS scoped to the current user.

### Step 3: Add new Edge Function orchestration
Extend or add an orchestrator function for Intelligent Listing sessions.

### Step 4: Build frontend flow
Create a new page/component for:
- intake
- Companion progress
- approval cards
- publish confirmation

### Step 5: Reuse current Companion functions
Adapt current Sage, Loaf, Debian, Kali, Fedora, and Mint logic so they write back into the shared listing session instead of only returning disconnected outputs.

### Step 6: Publish into existing product/feed system
On final approval, create the actual product/listing using existing tables and navigation patterns.

### Step 7: Add analytics events
Track the 5-minute journey from intake to published listing.

### Step 8: Polish copy and terminology
Keep the Linux names behind the scenes. Publicly use:
- Orchard Companions
- Seed Keeper
- Seed
- Bestow
- Orchard
- Pocket
- Whisperer

---

## What I would not do yet

Do not build all three sprints at once.

Do not start with the Whisperer Contract or Bestowal Loop until Sprint 1 proves the core promise.

Do not overbuild agent autonomy before the user approval UX is clean.

Do not market the technical stack. Market the outcome.

---

## Bottom line

The app is close enough to become marketable, but the next build must focus on one flagship experience:

## “Describe your Seed. Approve three Companion-prepared choices. Go live.”

That is the bridge from AI-assisted marketplace to AI-native economic community.

