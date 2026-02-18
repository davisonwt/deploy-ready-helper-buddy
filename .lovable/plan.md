

# Push Notification Ringing for Incoming Calls

## Goal
When someone calls you in Sow2Grow, your phone or PC will show a notification with a ringtone sound -- even if you're on another browser tab or your screen is off. Tapping the notification takes you straight to the call.

## How It Works

1. **First time setup**: When you open the app, it asks "Allow notifications?" -- you tap Allow once, and it remembers your choice forever on that device.

2. **When someone calls you**: The app sends a push notification to your device that:
   - Shows "Incoming Call from [Name]" 
   - Plays a notification sound
   - Stays on screen until you tap it or the caller hangs up

3. **Works on all devices**: Once you allow notifications on your phone, tablet, or computer, it works on all of them automatically.

## Limitations (honest)
- You must have the app open in at least one browser tab (or installed as a PWA) for real-time ringtone
- iPhone Safari has limited notification support -- works best if the app is "installed" to the home screen
- If the browser is completely closed, notifications won't work (that requires a true native app)

## Technical Implementation

### Step 1: Make the App a PWA (Progressive Web App)
- Install `vite-plugin-pwa` and configure it in `vite.config.ts`
- Add a service worker that handles background notifications
- Add PWA manifest with app name, icons, and theme colors
- Add an "Install App" prompt so users can add it to their home screen

### Step 2: Add Browser Notification Permissions
- Create a `useNotificationPermission` hook that requests permission on first login
- Store permission state so users aren't asked repeatedly
- Show a friendly prompt explaining why notifications are needed

### Step 3: Send Browser Notifications on Incoming Calls
- In the `CallManagerProvider`, when an incoming call is detected:
  - Play the existing ringtone (already works)
  - ALSO trigger a `new Notification("Incoming Call", { body: callerName, sound: ... })`
  - Use the Notification API's `vibrate` pattern for mobile devices
  - When user taps the notification, focus the app window and show the call overlay

### Step 4: Service Worker for Background Notifications
- Register a service worker that listens for push events
- When the app tab is in the background, the service worker shows the notification
- The service worker can play a notification sound even when the tab is inactive

### Files to Create/Modify
- `vite.config.ts` -- add PWA plugin configuration
- `public/manifest.json` -- PWA manifest with app details
- `public/sw.js` -- service worker for background notifications
- `src/hooks/useNotificationPermission.ts` -- new hook for permission management
- `src/hooks/useCallManager.ts` -- add notification trigger when incoming call detected
- `src/components/NotificationPrompt.tsx` -- friendly UI to request notification permission
- `index.html` -- add PWA meta tags
- `public/notification-ring.mp3` -- notification sound file (or generate via Web Audio API)

### Step 5: "Install App" Page
- Create a `/install` page that guides users to install the app on their device
- Show device-specific instructions (Android vs iPhone vs Desktop)
- Installing the app improves notification reliability significantly

