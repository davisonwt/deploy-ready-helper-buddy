# Relationship-Layer ChatApp - Implementation Guide

## Overview

This is a complete implementation of a relationship-layer chat app that:
- Mirrors real-life circles (scripture family → close friends → acquaintances)
- Monetizes every valuable exchange (download == bestowal)
- Feels addictive like TikTok (serotonin loops, zero friction, delight micro-animations)

## Components Created

### 1. CirclesBubbleRail (`src/components/chat/CirclesBubbleRail.tsx`)
- Animated horizontal scroll of circle bubbles
- Tap to select, long-press to reorder/hide
- Unread badges and live indicators
- Smooth animations with Framer Motion

### 2. SwipeDeck (`src/components/chat/SwipeDeck.tsx`)
- Tinder-style onboarding flow
- Swipe right to add to circles
- Confetti and haptic feedback on swipe
- Auto-prompts group creation after 3 swipes

### 3. BestowalCoin (`src/components/chat/BestowalCoin.tsx`)
- Micro-component for monetizing every asset
- Glowing coin icon with slider popup
- Emoji rain effect while sliding
- Confetti burst on completion
- Integrated with Cryptomus payment

### 4. GroupChatRoomEnhanced (`src/components/chat/GroupChatRoomEnhanced.tsx`)
- Voice-first, video-ready group chat
- Floating action button with expandable menu
- Options: Voice call, Video call, Live Radio, Study Session
- Wave row of participant avatars
- Drag-up file/media overlay

### 5. RelationshipLayerChatApp (`src/components/chat/RelationshipLayerChatApp.tsx`)
- Main app component tying everything together
- Animated gradient background (shifts hue every 30s)
- Streak badges for consecutive days
- Onboarding flow integration
- Circle management

### 6. useHapticFeedback (`src/hooks/useHapticFeedback.ts`)
- Web Vibration API wrapper
- Light/medium/heavy tap patterns
- Success/error feedback

## Database Schema Needed

You'll need to create these tables in Supabase:

```sql
-- Circles table
CREATE TABLE circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User circles (which circles a user has)
CREATE TABLE user_circles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  circle_id UUID REFERENCES circles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, circle_id)
);

-- Circle members (people in each circle)
CREATE TABLE circle_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id UUID REFERENCES circles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(circle_id, user_id)
);

-- Message streaks (for streak badges)
CREATE TABLE message_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  streak_days INTEGER DEFAULT 0,
  last_message_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Function to get message streak
CREATE OR REPLACE FUNCTION get_message_streak(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  streak INTEGER;
BEGIN
  SELECT streak_days INTO streak
  FROM message_streaks
  WHERE user_id = user_id_param;
  
  RETURN COALESCE(streak, 0);
END;
$$ LANGUAGE plpgsql;
```

## Integration Steps

### Step 1: Update ChatApp Page

Replace or enhance your existing `ChatApp.tsx`:

```tsx
import { RelationshipLayerChatApp } from '@/components/chat/RelationshipLayerChatApp';

// In your ChatApp component:
return <RelationshipLayerChatApp />;
```

### Step 2: Add BestowalCoin to Messages

In your message component:

```tsx
import { BestowalCoin } from '@/components/chat/BestowalCoin';

// In message render:
<BestowalCoin
  assetId={message.id}
  assetType="message"
  senderId={message.sender_id}
  senderName={message.sender_name}
/>
```

### Step 3: Initialize Default Circles

Run this migration or function:

```sql
INSERT INTO circles (name, emoji, color) VALUES
  ('S2G-Sowers', '🔴', 'bg-red-500'),
  ('S2G-Whisperers', '🟡', 'bg-yellow-500'),
  ('364yhvh-Family', '🟢', 'bg-green-500'),
  ('Family', '🔵', 'bg-blue-500'),
  ('Friends', '🟣', 'bg-purple-500');
```

### Step 4: Add Haptic Feedback

Import and use throughout:

```tsx
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

const { success, lightTap } = useHapticFeedback();

// On send message:
success();

// On tap:
lightTap();
```

## Features Implemented

✅ **30-second onboarding** with swipe deck
✅ **Circle-based organization** (5 default circles)
✅ **Monetization** via BestowalCoin on every asset
✅ **Addictive loops**: streaks, confetti, haptics
✅ **Voice-first** group chats with floating actions
✅ **Animated backgrounds** that shift hue
✅ **Smooth animations** with Framer Motion
✅ **Zero friction** interactions

## Next Steps

1. **Create database tables** (see SQL above)
2. **Run migrations** in Supabase
3. **Update ChatApp.tsx** to use RelationshipLayerChatApp
4. **Add BestowalCoin** to message/file components
5. **Test onboarding flow**
6. **Add infinite scroll** for suggested people
7. **Implement voice note waveforms** (visual candy)
8. **Add dark theme** gradient wallpapers

## Customization

- **Circle colors**: Update in `CirclesBubbleRail.tsx` DEFAULT_CIRCLES
- **Bestowal amounts**: Adjust min/max in `BestowalCoin.tsx` slider
- **Animation speed**: Modify duration in Framer Motion configs
- **Background shift**: Change interval in `RelationshipLayerChatApp.tsx`

## Performance Notes

- Uses Framer Motion for hardware-accelerated animations
- Lazy loads swipe deck profiles
- Confetti only renders when needed
- Gradient background uses CSS transitions (GPU-accelerated)

## Testing Checklist

- [ ] Onboarding flow works
- [ ] Swipe deck loads profiles
- [ ] Circles can be selected/reordered/hidden
- [ ] BestowalCoin triggers payment flow
- [ ] Group chat floating actions work
- [ ] Haptic feedback works (test on mobile)
- [ ] Streak badges update correctly
- [ ] Background gradient animates smoothly

