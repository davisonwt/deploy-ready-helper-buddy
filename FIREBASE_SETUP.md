# Firebase Setup Instructions

## 🔥 Firebase Configuration Required

Your Remnant Calendar app is now ready for Firebase! Follow these steps to complete the setup:

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or select an existing project
3. Follow the setup wizard:
   - Enter project name (e.g., "Remnant Calendar")
   - Enable/disable Google Analytics (optional)
   - Click **"Create project"**

### Step 2: Enable Firebase Services

#### Authentication
1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable:
   - **Anonymous** authentication
   - **Email/Password** authentication
3. **DO NOT** enable Google, Facebook, or other providers (as per requirements)

#### Firestore Database
1. Go to **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll add security rules next)
4. Select a location (choose closest to your users)
5. Click **"Enable"**

#### Firebase Storage
1. Go to **Storage**
2. Click **"Get started"**
3. Start in **test mode** (we'll add security rules next)
4. Use the same location as Firestore
5. Click **"Done"**

### Step 3: Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to **"Your apps"** section
3. Click the **Web** icon (`</>`)
4. Register your app:
   - App nickname: "Remnant Calendar Web"
   - Firebase Hosting: Skip for now (optional)
5. Click **"Register app"**
6. Copy the `firebaseConfig` object values

### Step 4: Update Firebase Config

Open `src/integrations/firebase/config.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",                    // ← Replace this
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",  // ← Replace this
  projectId: "YOUR_PROJECT_ID",                   // ← Replace this
  storageBucket: "YOUR_PROJECT_ID.appspot.com",   // ← Replace this
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",  // ← Replace this
  appId: "YOUR_APP_ID",                           // ← Replace this
  measurementId: "YOUR_MEASUREMENT_ID"            // ← Optional, for Analytics
};
```

**Example:**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567",
  authDomain: "remnant-calendar.firebaseapp.com",
  projectId: "remnant-calendar",
  storageBucket: "remnant-calendar.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890",
};
```

### Step 5: Deploy Security Rules

#### Firestore Rules

1. In Firebase Console, go to **Firestore Database** > **Rules**
2. Copy the contents of `firestore.rules` file
3. Paste into the Rules editor
4. Click **"Publish"**

#### Storage Rules

1. In Firebase Console, go to **Storage** > **Rules**
2. Copy the contents of `storage.rules` file
3. Paste into the Rules editor
4. Click **"Publish"**

### Step 6: Create Firestore Indexes (Optional but Recommended)

For better query performance, create these indexes:

1. Go to **Firestore Database** > **Indexes**
2. Click **"Create Index"**
3. Create indexes for:
   - Collection: `remnant_wall`
     - Fields: `createdAt` (Descending)
   - Collection: `remnant_wall`
     - Fields: `yhwhDate` (Ascending), `createdAt` (Descending)

### Step 7: Test the Integration

1. Start your development server: `npm run dev`
2. The app should auto-sign in anonymously on first visit
3. Try creating a journal entry
4. Try sharing to Remnant Wall
5. Check Firebase Console to verify data is being saved

### Step 8: Firebase Hosting (Optional)

If you want to deploy to Firebase Hosting:

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting`
4. Deploy: `firebase deploy --only hosting`

## 📋 Firebase Config Values Checklist

Before going live, ensure you have:

- [ ] `apiKey` - From Firebase Console > Project Settings
- [ ] `authDomain` - Format: `{projectId}.firebaseapp.com`
- [ ] `projectId` - Your Firebase project ID
- [ ] `storageBucket` - Format: `{projectId}.appspot.com`
- [ ] `messagingSenderId` - From Firebase Console
- [ ] `appId` - From Firebase Console
- [ ] Firestore Rules deployed
- [ ] Storage Rules deployed
- [ ] Anonymous auth enabled
- [ ] Email/Password auth enabled

## 🔒 Security Notes

- All journal entries are **private by default** (only visible to the owner)
- Remnant Wall posts are **public** (anyone can read, only signed-in users can write)
- Users can choose anonymity levels (0=full anonymous, 1=name+country, 2=full public)
- Storage files are organized by user ID for privacy

## 🚀 You're Ready!

Once you've completed these steps, your Remnant Calendar will be fully connected to Firebase with:
- ✅ Anonymous + Email/Password authentication
- ✅ Private journal entries synced across devices
- ✅ Public Remnant Wall feed
- ✅ Photo, voice note, and video uploads
- ✅ Real-time sync across all components

**Shalom shalom! The Remnant is now connected! 🔥**

