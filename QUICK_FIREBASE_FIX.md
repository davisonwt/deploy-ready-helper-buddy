# Quick Fix: Firebase API Key Error

## Error Message
```
Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)
```

## Cause
The Firebase config file still has placeholder values instead of your actual Firebase project credentials.

## Solution: Get Your Firebase Config Values

### Step 1: Go to Firebase Console
1. Visit: https://console.firebase.google.com/
2. Select your project (or create a new one)

### Step 2: Get Your Config Values
1. Click the **gear icon** (⚙️) next to "Project Overview"
2. Select **"Project settings"**
3. Scroll down to **"Your apps"** section
4. If you don't have a web app yet:
   - Click the **Web icon** (`</>`)
   - Register your app with nickname: "Remnant Calendar"
   - Click **"Register app"**
5. You'll see your Firebase config object like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890",
  measurementId: "G-XXXXXXXXXX" // Optional
};
```

### Step 3: Update the Config File

Open `src/integrations/firebase/config.js` and replace the placeholder values:

**BEFORE (Placeholders):**
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

**AFTER (Your Real Values):**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567", // ← Your actual API key
  authDomain: "your-project-id.firebaseapp.com",     // ← Your actual domain
  projectId: "your-project-id",                     // ← Your actual project ID
  storageBucket: "your-project-id.appspot.com",      // ← Your actual storage bucket
  messagingSenderId: "123456789012",                 // ← Your actual sender ID
  appId: "1:123456789012:web:abcdef1234567890",      // ← Your actual app ID
};
```

### Step 4: Enable Firebase Services

Before testing, make sure these are enabled in Firebase Console:

1. **Authentication**
   - Go to: Authentication → Sign-in method
   - Enable: **Anonymous** and **Email/Password**
   - Save

2. **Firestore Database**
   - Go to: Firestore Database
   - Click "Create database"
   - Choose "Start in test mode" (we'll add rules next)
   - Select location
   - Click "Enable"

3. **Storage**
   - Go to: Storage
   - Click "Get started"
   - Start in test mode
   - Use same location as Firestore
   - Click "Done"

### Step 5: Deploy Security Rules

1. **Firestore Rules**
   - Go to: Firestore Database → Rules
   - Copy contents of `firestore.rules` file
   - Paste into Rules editor
   - Click "Publish"

2. **Storage Rules**
   - Go to: Storage → Rules
   - Copy contents of `storage.rules` file
   - Paste into Rules editor
   - Click "Publish"

### Step 6: Test Again

1. Save the config file
2. Restart your dev server: `npm run dev`
3. The error should be gone!

## Still Having Issues?

If you're still getting errors:

1. **Double-check** you copied the exact values (no extra spaces)
2. **Verify** Authentication is enabled in Firebase Console
3. **Check** your Firebase project is active (not paused)
4. **Ensure** you're using the correct project (if you have multiple)

## Need Help?

If you need help getting your Firebase config values, I can guide you through it step by step. Just let me know!

