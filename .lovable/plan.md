

# Automated Content Moderation System for S2G

## Overview

Build a comprehensive content moderation system that automatically detects violations of community standards (profanity, explicit content, gambling references, manipulative language) and alerts GoSat guardians for review. The system will work silently in the background while keeping the GoSat Ghost Access dashboard hidden from regular users.

---

## Community Standards to Enforce

| Category | Description | Detection Method |
|----------|-------------|------------------|
| **Profanity** | Foul language, slurs, vulgar expressions | Text filtering with word lists |
| **Explicit Content** | Pornography, nudity, sexual content | AI image analysis + keywords |
| **Gambling** | Betting, lottery, casino references | Keyword matching |
| **Manipulation** | Aggressive sales tactics, scams, coercion | Pattern detection |

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                     USER ACTIONS                                 │
│   (Send Message, Upload Media, Create Room, Post Content)       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              EDGE FUNCTION: moderate-content                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Text Filter     │  │ Image Analyzer  │  │ Pattern Matcher │ │
│  │ (Profanity List)│  │ (Lovable AI)    │  │ (Gambling/Scam) │ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           └────────────────────┼────────────────────┘           │
│                                ▼                                 │
│                    ┌─────────────────────┐                       │
│                    │  Violation Detected │                       │
│                    │  severity: low/med/ │                       │
│                    │  high/critical      │                       │
│                    └──────────┬──────────┘                       │
└───────────────────────────────┼─────────────────────────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            ▼                   ▼                   ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ content_flags    │ │ gosat_alerts     │ │ Auto-Action      │
│ (DB Record)      │ │ (Notification)   │ │ (Block/Hide)     │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## Changes

### 1. Database Schema

**New Tables:**

**`content_flags`** - Stores flagged content for review
```sql
- id (uuid, primary key)
- content_type (text) - 'message', 'media', 'room', 'orchard', 'forum_post'
- content_id (uuid) - Reference to the flagged content
- user_id (uuid) - User who created the content
- violation_type (text) - 'profanity', 'explicit', 'gambling', 'manipulation'
- severity (text) - 'low', 'medium', 'high', 'critical'
- detected_terms (text[]) - List of flagged words/patterns
- auto_action_taken (text) - 'none', 'hidden', 'blocked'
- status (text) - 'pending', 'reviewed', 'dismissed', 'confirmed'
- reviewed_by (uuid) - GoSat who reviewed
- reviewed_at (timestamptz)
- created_at (timestamptz)
```

**`gosat_alerts`** - Real-time alerts for GoSats
```sql
- id (uuid, primary key)
- flag_id (uuid) - Reference to content_flags
- alert_type (text) - 'new_violation', 'escalation', 'pattern_detected'
- priority (text) - 'normal', 'urgent', 'critical'
- is_read (boolean)
- created_at (timestamptz)
```

**`moderation_word_lists`** - Configurable word lists
```sql
- id (uuid, primary key)
- category (text) - 'profanity', 'gambling', 'manipulation', 'explicit'
- words (text[]) - Array of words/patterns
- severity (text) - Default severity for matches
- is_active (boolean)
- updated_at (timestamptz)
```

### 2. Edge Function: moderate-content

**File:** `supabase/functions/moderate-content/index.ts`

Creates an edge function that:
- Accepts content (text, media URL, metadata)
- Runs text through profanity filter with configurable word lists
- Uses Lovable AI (google/gemini-2.5-flash) for:
  - Image/video content analysis (detecting nudity, explicit content)
  - Context-aware manipulation detection
  - Gambling reference identification
- Returns severity score and detected violations
- Automatically creates flags and alerts for GoSats

### 3. Real-Time Content Scanning

**Integrate moderation into existing flows:**

**`src/components/chat/UnifiedConversation.tsx`**
- Before inserting messages, call moderate-content edge function
- For critical violations: block message entirely
- For medium/high: allow but flag for review

**`src/components/journal/forms/MediaForm.tsx`**
- Scan uploaded images/videos before saving
- Queue media for AI analysis

### 4. GoSat Alert System

**File:** `src/components/admin/GoSatAlertBadge.tsx`

A notification badge component that:
- Shows real-time count of pending flags
- Pulses/animates for critical alerts
- Appears in admin navigation (hidden from regular users)

**Update:** `src/components/admin/GoSatGhostAccessMonitor.tsx`
- Add "Flagged Content" tab
- Show real violations from content_flags table (replace simulated flags)
- Add quick-action buttons: Dismiss, Confirm Violation, Ban User
- Show detected terms and AI confidence scores

### 5. Hide Ghost Access from Public View

**Update:** `src/pages/DashboardPage.jsx`
- Remove the `GoSatGhostAccessThumbnail` card from the main dashboard
- This feature should only be accessible via Admin Dashboard for GoSats

### 6. Automatic Actions

Based on severity, the system will:

| Severity | Auto-Action | User Notification |
|----------|-------------|-------------------|
| Low | Flag only | None |
| Medium | Flag + Hide pending review | None |
| High | Block content + Flag | "Content under review" |
| Critical | Block + Temporary restrict user | "Account under review" |

---

## Files to Create

1. `supabase/functions/moderate-content/index.ts` - Main moderation edge function
2. `src/components/admin/GoSatAlertBadge.tsx` - Alert notification component
3. `src/utils/moderationFilters.ts` - Client-side pre-filtering utilities

## Files to Modify

1. `src/components/chat/UnifiedConversation.tsx` - Add moderation before message send
2. `src/components/admin/GoSatGhostAccessMonitor.tsx` - Real flagged content instead of simulated
3. `src/pages/DashboardPage.jsx` - Remove GoSatGhostAccessThumbnail from public view
4. `src/pages/AdminDashboardPage.jsx` - Add alert badge to navigation

---

## Word Lists (Initial Set)

The system will include configurable word lists stored in the database. GoSats can update these through the admin panel.

**Categories:**
- **Profanity**: Common curse words, slurs, vulgar terms
- **Gambling**: bet, casino, lottery, wager, jackpot, odds, gambling
- **Explicit**: Sexual terms, body parts in explicit context
- **Manipulation**: "guaranteed returns", "act now", "limited time", "you're missing out"

---

## Technical Details

### Edge Function Request Format
```typescript
// POST /functions/v1/moderate-content
{
  content_type: 'message' | 'media' | 'room' | 'orchard',
  content_id: string,
  user_id: string,
  text_content?: string,
  media_url?: string,
  metadata?: object
}
```

### Response Format
```typescript
{
  is_clean: boolean,
  violations: [{
    type: 'profanity' | 'explicit' | 'gambling' | 'manipulation',
    severity: 'low' | 'medium' | 'high' | 'critical',
    detected_terms: string[],
    confidence: number
  }],
  action_taken: 'none' | 'flagged' | 'hidden' | 'blocked',
  flag_id?: string
}
```

### Security Considerations

- Word lists stored in database, not in client code
- All moderation decisions logged with audit trail
- AI analysis runs server-side only
- GoSat access verified via `useRoles()` hook (role-based, not localStorage)

---

## Benefits

1. **Automated Protection**: Violations caught immediately without manual monitoring
2. **Silent Operation**: Users unaware of moderation until action is taken
3. **Configurable**: Word lists and severity levels adjustable by admins
4. **Audit Trail**: Complete history of flags and actions for accountability
5. **Scalable**: Edge function handles any content volume
6. **AI-Powered**: Image analysis catches what word filters miss

---

## Implementation Order

1. Create database tables (content_flags, gosat_alerts, moderation_word_lists)
2. Seed initial word lists
3. Create moderate-content edge function
4. Update GoSatGhostAccessMonitor with real data
5. Add GoSatAlertBadge to admin navigation
6. Integrate moderation into chat message flow
7. Remove Ghost Access thumbnail from public dashboard
8. Add media upload moderation

