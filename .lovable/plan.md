

# Radio Broadcast System Redesign: "AOD Frequencies Experience"

This is a major overhaul of the radio system to make it fun, gamified, and engaging for DJs, listeners, and seed owners. The work is broken into **6 phases** to keep things manageable.

---

## Phase 1: Segment Timeline Builder

The core new feature -- a visual drag-and-drop timeline where DJs plan their 2-hour (120-minute) slot with color-coded segment blocks.

**What gets built:**
- A new `RadioSegmentBuilder` component with draggable, color-coded blocks for each segment type:
  - Opening (orange), Teaching (blue), Music Play & Talk (green), Advert (red), Q&A (purple), Guest Spot (teal), Reflection (indigo), Free Flow (gray)
- Each block shows emoji icon, editable duration, and auto-calculates remaining time
- **4 pre-built templates**: "Growth Groove Starter", "Deep Sow Session", "Vibe & Grow Playlist Party", "Grow Together Live" (exactly as you described)
- A "Shuffle for Fun" button that randomizes segment order with confetti animation
- Total time indicator with warning if over/under 120 minutes
- For pre-recorded mode: ability to map uploaded audio files to specific segments
- For live mode: real-time segment timer with auto-alerts (bell sound) at segment transitions

**Database changes:**
- New `radio_slot_segments` table (slot_id, segment_type, segment_order, duration_minutes, title, mapped_track_id, emoji_icon, color)
- New `radio_segment_templates` table (name, description, segments_json, icon)
- Pre-populate 4 templates via migration

**Integration point:** Added as Step 3 in the `RadioSlotApplicationWizard` (shifting Content to Step 4 and Monetization to Step 5).

---

## Phase 2: Enhanced Listener Experience

Make listening interactive and fun with real-time reactions, bestow animations, and engagement features.

**What gets built:**
- **Emoji Reaction Bar**: Floating bar during playback with heart, clap, fire, pray, mind-blown reactions -- real-time counters visible to DJ
- **Bestow During Broadcast**: "Bestow" button on currently playing track with animated gift effects (seed sprouting, tree growing, star burst) using canvas-confetti
- **"Raise Hand" Button**: Visual hand-raise for listeners wanting to speak (replaces current call-in with a friendlier UX)
- **Live Chat Overlay**: Scrolling chat messages visible alongside the player
- **Listener Streak Badges**: Track consecutive days of listening, show streak fire icon
- **Segment Reaction Stats**: After broadcast, DJ sees which segments got the most reactions

**Database changes:**
- New `radio_reactions` table (session_id, user_id, reaction_type, segment_index, created_at)
- New `radio_listener_streaks` table (user_id, current_streak, longest_streak, last_listened_at)
- Add `bestow_count` and `reaction_count` columns to `radio_schedule`

---

## Phase 3: DJ Dashboard & Gamification

Make the DJ experience rewarding with badges, stats, and a polished control panel.

**What gets built:**
- **DJ Achievement Badges**: "First Broadcast", "5 Shows Complete" (Master Mixer), "100 Listeners", "Top Bestowed", "Streak King"
- **Post-Broadcast Stats Card**: Total listeners, peak listeners, total reactions by type, bestow earnings, most clapped segment, average listen duration
- **DJ Leaderboard**: Ranked by total broadcasts, listener hours, bestow earnings
- **Gamified Setup Wizard**: Progress bar with encouraging tips at each step ("Add a surprise segment for extra engagement!"), confetti on submission
- **Broadcast History**: List of past shows with stats and listener feedback

**Database changes:**
- New `radio_dj_badges` table (dj_id, badge_type, earned_at)
- Add `peak_listeners`, `total_reactions` columns to `radio_live_sessions`

---

## Phase 4: Music Integration with S2G Seeds

Connect the radio music selection directly to the S2G community music library.

**What gets built:**
- **S2G Music Browser in Segment Builder**: When a DJ creates a music segment, they browse all sown music seeds from the community (not just their own uploads)
- **Song Duration Display**: Show track length so DJs can plan segment durations accurately
- **"Bestow This Song" Button**: During playback, listeners see the currently playing track with a bestow button linking to the music purchase flow
- **Genre/Theme Filters**: Filter music by category (Spiritual, Motivational, Gospel, etc.) aligned with S2G seed categories
- **Track Bestow Notifications**: Real-time notification to DJ when a listener bestows a track during their show

**Code changes:**
- Update segment builder to query `seeds` table where `type = 'music'`
- Add bestow trigger integration to `LiveStreamPlayer`
- Show track metadata (duration, artist, category) in segment planning

---

## Phase 5: Co-Host & Invite System Enhancement

Polish the multi-host experience for live broadcasts.

**What gets built:**
- **Co-Host Invite via App Search**: Search users by name to invite as co-hosts (up to 3-5)
- **"Go Live" Countdown**: 3-2-1 countdown animation with upbeat sound before broadcast starts
- **Co-Host Audio Controls**: Individual mute/unmute for each co-host visible to main DJ
- **Guest Speaker Queue**: Visual queue showing waiting guests with their topics, one-tap approve/deny

**Code changes:**
- Enhance `LiveStreamInterface` with countdown animation
- Improve `CoHostInvites` component with user search
- Add visual guest queue cards with approve/deny actions

---

## Phase 6: UI/UX Polish & Fun Factor

The visual and emotional layer that makes everything feel alive.

**What gets built:**
- **Vibrant Earthy Color Theme for Radio**: Warm gradients (amber, orange, green, earth tones) specific to radio pages
- **Animated "Now Playing" Widget**: Pulsing equalizer bars, rotating album art placeholder, smooth track transitions
- **Slot Booking Confetti**: When a DJ successfully books a slot, microphone pops up with confetti explosion
- **Segment Timer Alerts**: Visual countdown + bell sound at segment boundaries during live shows
- **Mobile-First Responsive Layout**: All radio components optimized for mobile screens
- **Dark Mode Support**: All new components respect dark/light theme

---

## Technical Details

### New Files to Create
- `src/components/radio/SegmentTimelineBuilder.tsx` -- drag-and-drop segment planner
- `src/components/radio/SegmentTemplateSelector.tsx` -- pre-built template cards
- `src/components/radio/ListenerReactionBar.tsx` -- emoji reaction overlay
- `src/components/radio/BestowDuringBroadcast.tsx` -- bestow animation + button
- `src/components/radio/DJAchievements.tsx` -- badge display
- `src/components/radio/PostBroadcastStats.tsx` -- stats summary card
- `src/components/radio/GoLiveCountdown.tsx` -- 3-2-1 countdown animation
- `src/components/radio/SegmentTimer.tsx` -- live segment countdown

### Existing Files to Modify
- `RadioSlotApplicationWizard.jsx` -- add segment builder step + gamified progress
- `LiveStreamPlayer.tsx` -- add reaction bar, bestow button, segment awareness
- `GroveStationPage.jsx` -- updated UI with earthy radio theme, achievements tab
- `LiveStreamInterface.jsx` -- add countdown, enhanced co-host controls
- `RadioListenerInterface.jsx` -- add raise hand, reactions, bestow integration
- `useGroveStation.jsx` -- add segment CRUD, reaction tracking, streak logic

### Database Migrations
- `radio_slot_segments` table
- `radio_segment_templates` table (pre-populated with 4 templates)
- `radio_reactions` table
- `radio_listener_streaks` table
- `radio_dj_badges` table
- Additional columns on existing tables

### Libraries Already Available
- `canvas-confetti` -- for celebration animations
- `framer-motion` -- for smooth drag-and-drop and transitions
- `lucide-react` -- icons for segment types
- `react-joyride` -- for guided DJ onboarding tour

---

## Recommended Build Order

Start with **Phase 1** (Segment Builder) since it is the foundation that all other features build upon. Each phase can be implemented as a separate conversation to keep changes manageable.

