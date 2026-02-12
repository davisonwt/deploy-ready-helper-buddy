
## Fix: "View" Button in Live Activities Should Open Community Chat

### Problem
The "View" button next to "S2G Community" unread forum messages in the Live Activities widget calls `joinActivity('forum', msg.roomId)`, but the `joinActivity` function has no `case 'forum'` handler. It silently falls through to the `default` case, which does nothing.

### Solution
Add a `case 'forum'` to the `joinActivity` switch statement in `LiveActivityWidget.jsx` that navigates to `/community-chat`.

### Changes

**File: `src/components/LiveActivityWidget.jsx`** (1 edit)

Add a new case in the `joinActivity` switch block (around line 586):

```
case 'forum':
  // Navigate to community chat
  window.location.href = '/community-chat'
  break
```

This will be inserted between the `case 'call'` and `default` cases, so clicking "View" on any S2G Community message takes the user directly to the Community ChatApp page.
