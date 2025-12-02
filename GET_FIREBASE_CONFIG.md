# 🔥 How to Get Your Firebase Config Values

## The Error You're Seeing
```
Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.)
```

This means the config file still has placeholder values. You need to replace them with your actual Firebase project credentials.

## Step-by-Step: Get Your Firebase Config

### Step 1: Go to Firebase Console
1. Visit: **https://console.firebase.google.com/**
2. Sign in with your Google account

### Step 2: Create or Select Project
- **If you don't have a project:**
  1. Click **"Add project"** or **"Create a project"**
  2. Enter project name: `Remnant Calendar` (or any name)
  3. Click **"Continue"**
  4. Enable/disable Google Analytics (optional)
  5. Click **"Create project"**
  6. Wait for project to be created
  7. Click **"Continue"**

- **If you already have a project:**
  1. Click on your project name from the project list

### Step 3: Register Web App
1. In your Firebase project, look for the **"</>"** (Web) icon
2. Click on it (or go to Project Settings → Your apps → Add app → Web)
3. Register your app:
   - App nickname: `Remnant Calendar Web`
   - Firebase Hosting: **Skip** (optional, can add later)
4. Click **"Register app"**

### Step 4: Copy Config Values
After registering, you'll see a code block like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890",
  measurementId: "G-XXXXXXXXXX"
};
```

**Copy these exact values!**

### Step 5: Update Config File
1. Open: `src/integrations/firebase/config.js`
2. Find the `firebaseConfig` object (around line 19)
3. Replace each placeholder with your actual values:

**BEFORE:**
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

**AFTER (with your real values):**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567",  // ← Paste your API key
  authDomain: "your-project-id.firebaseapp.com",      // ← Paste your auth domain
  projectId: "your-project-id",                      // ← Paste your project ID
  storageBucket: "your-project-id.appspot.com",       // ← Paste your storage bucket
  messagingSenderId: "123456789012",                 // ← Paste your sender ID
  appId: "1:123456789012:web:abcdef1234567890",       // ← Paste your app ID
  measurementId: "G-XXXXXXXXXX"                       // ← Optional, can remove if not using
};
```

### Step 6: Enable Required Services

Before testing, enable these services in Firebase Console:

#### Authentication
1. Go to: **Authentication** (left sidebar)
2. Click **"Get started"** (if first time)
3. Go to **"Sign-in method"** tab
4. Enable:
   - **Anonymous** → Click → Enable → Save
   - **Email/Password** → Click → Enable → Save

#### Firestore Database
1. Go to: **Firestore Database** (left sidebar)
2. Click **"Create database"**
3. Choose: **"Start in test mode"** (we'll add security rules next)
4. Select location (choose closest to your users)
5. Click **"Enable"**

#### Storage
1. Go to: **Storage** (left sidebar)
2. Click **"Get started"**
3. Choose: **"Start in test mode"**
4. Use same location as Firestore
5. Click **"Done"**

### Step 7: Deploy Security Rules

#### Firestore Rules
1. Go to: **Firestore Database** → **Rules** tab
2. Open `firestore.rules` file in your project
3. Copy all contents
4. Paste into Firebase Console Rules editor
5. Click **"Publish"**

#### Storage Rules
1. Go to: **Storage** → **Rules** tab
2. Open `storage.rules` file in your project
3. Copy all contents
4. Paste into Firebase Console Rules editor
5. Click **"Publish"**

### Step 8: Test
1. Save `src/integrations/firebase/config.js`
2. Restart dev server: `npm run dev`
3. The error should be gone!

## Quick Checklist

- [ ] Created Firebase project
- [ ] Registered web app
- [ ] Copied config values
- [ ] Updated `src/integrations/firebase/config.js`
- [ ] Enabled Anonymous auth
- [ ] Enabled Email/Password auth
- [ ] Created Firestore database
- [ ] Created Storage bucket
- [ ] Deployed Firestore rules
- [ ] Deployed Storage rules
- [ ] Restarted dev server

## Still Having Issues?

If you're still getting the error:

1. **Double-check** you copied the exact values (no extra spaces, quotes are correct)
2. **Verify** the config file was saved
3. **Restart** your dev server completely
4. **Check** browser console for more detailed error messages
5. **Ensure** your Firebase project is active (not paused or deleted)

## Need More Help?

If you're stuck, share:
- What step you're on
- Any error messages from the browser console
- Screenshot of your Firebase Console (Project Settings page)

I can help you troubleshoot!

