# Quick Integration Guide - Relationship Layer ChatApp

## What Was Built

A complete relationship-layer chat app with:
- ✅ Tinder-style onboarding (30 seconds)
- ✅ Circle-based organization (5 default circles)
- ✅ BestowalCoin monetization on every asset
- ✅ Voice-first group chats with floating actions
- ✅ Addictive loops (streaks, confetti, haptics)
- ✅ Animated gradient backgrounds
- ✅ Smooth micro-animations throughout

## Quick Start (5 Steps)

### Step 1: Run Database Migration

```bash
# In Supabase Dashboard → SQL Editor, run:
supabase/migrations/20250101000000_relationship_layer_chatapp.sql
```

Or via CLI:
```bash
supabase db push
```

### Step 2: Update ChatApp.tsx

Replace or enhance your main ChatApp component:

```tsx
// src/pages/ChatApp.tsx
import { RelationshipLayerChatApp } from '@/components/chat/RelationshipLayerChatApp';

const ChatApp = () => {
  const { user } = useAuth();
  
  if (!user) {
    return <LoginPrompt />;
  }

  return <RelationshipLayerChatApp />;
};
```

### Step 3: Add BestowalCoin to Messages

In your message component (`ChatMessage.tsx` or similar):

```tsx
import { BestowalCoin } from '@/components/chat/BestowalCoin';

// Add next to message content:
<BestowalCoin
  assetId={message.id}
  assetType="message"
  senderId={message.sender_id}
  senderName={message.sender_name}
  onBestowalComplete={(amount) => {
    toast.success(`Bestowed ${amount} USDC!`);
  }}
/>
```

### Step 4: Add Haptic Feedback

Import and use throughout your app:

```tsx
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

const { success, lightTap } = useHapticFeedback();

// On send message:
const handleSend = () => {
  sendMessage();
  success(); // Haptic feedback
};
```

### Step 5: Test!

1. Open ChatApp
2. You'll see onboarding swipe deck (if no circles exist)
3. Swipe right 3 times to add people
4. See circles bubble rail at top
5. Tap a circle to see conversations
6. Try BestowalCoin on any message

## Component Files Created

```
src/components/chat/
├── CirclesBubbleRail.tsx          # Animated circle bubbles
├── SwipeDeck.tsx                  # Tinder-style onboarding
├── BestowalCoin.tsx               # Monetization component
├── GroupChatRoomEnhanced.tsx      # Voice-first group chat
└── RelationshipLayerChatApp.tsx   # Main app component

src/hooks/
└── useHapticFeedback.ts           # Haptic feedback hook

supabase/migrations/
└── 20250101000000_relationship_layer_chatapp.sql
```

## Features Breakdown

### A. Onboarding Flow ✅
- Swipe deck loads all profiles
- Swipe right → adds to selected circle
- Confetti + haptic on swipe
- After 3 swipes → prompts group creation

### B. Circles Bubble Rail ✅
- Horizontal scrollable bubbles
- Tap to select circle
- Long-press to reorder/hide
- Unread badges (red dot)
- Live indicators (pulsing green dot)

### C. Group Chat Room ✅
- Wave row of participant avatars
- Floating "+" button expands to:
  - Voice call (instant)
  - Video call (cameras off by default)
  - Live Radio (push-to-talk)
  - Study Session (whiteboard + timer)
- Drag-up file/media overlay

### D. BestowalCoin ✅
- Glowing coin icon on every asset
- Tap → slider pops (0.50-5 USDC)
- Emoji rain while sliding
- Confetti burst on completion
- Integrated with Cryptomus

### E. Addictive Loops ✅
- Streak badges (consecutive days)
- Confetti on interactions
- Haptic feedback throughout
- Animated gradient background (shifts every 30s)
- Smooth Framer Motion animations

## Customization

### Change Circle Colors
Edit `CirclesBubbleRail.tsx`:
```tsx
const DEFAULT_CIRCLES = [
  { id: 'sowers', name: 'S2G-Sowers', emoji: '🔴', color: 'bg-red-500' },
  // Change colors here
];
```

### Adjust Bestowal Amounts
Edit `BestowalCoin.tsx`:
```tsx
<Slider
  min={0.5}  // Change min
  max={5}    // Change max
  step={0.1}
/>
```

### Modify Animation Speed
Edit component files:
```tsx
// Faster animations
transition={{ duration: 0.2 }}

// Slower animations
transition={{ duration: 0.5 }}
```

## Next Enhancements

1. **Infinite Scroll**: Auto-load suggested people at bottom
2. **Voice Note Waveforms**: Visual waveforms, tap to play from point
3. **Dark Theme**: Gradient wallpapers that shift hue
4. **Group Creation**: One-tap group creation after onboarding
5. **Real-time Updates**: Supabase Realtime for live circles

## Troubleshooting

**Onboarding not showing?**
- Check if user has any circles in `user_circles` table
- If empty, onboarding will show

**BestowalCoin not working?**
- Ensure Cryptomus credentials are configured
- Check browser console for errors
- Verify Supabase connection

**Haptic feedback not working?**
- Only works on mobile devices
- Desktop browsers don't support Vibration API
- Test on actual mobile device

**Circles not loading?**
- Run database migration
- Check Supabase RLS policies
- Verify user is authenticated

## Support

See `RELATIONSHIP_LAYER_CHATAPP.md` for full documentation.

