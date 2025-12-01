/**
 * Firebase v9+ Modular SDK Configuration
 * 
 * Replace these placeholder values with your actual Firebase config:
 * 
 * 1. Go to Firebase Console: https://console.firebase.google.com/
 * 2. Create a new project (or select existing)
 * 3. Go to Project Settings > General > Your apps > Web app
 * 4. Copy the config object values below
 */

import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// Firebase Configuration Object
// ⚠️ IMPORTANT: You MUST replace these placeholder values with your actual Firebase config!
// 
// To get your Firebase config:
// 1. Go to https://console.firebase.google.com/
// 2. Select your project (or create one)
// 3. Click ⚙️ gear icon → Project settings
// 4. Scroll to "Your apps" → Click Web icon (</>)
// 5. Register app if needed, then copy the config values below

const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID" // Optional, for Analytics
};

// Validate that config values have been replaced
const hasPlaceholders = 
  firebaseConfig.apiKey.includes("YOUR_API_KEY") ||
  firebaseConfig.projectId.includes("YOUR_PROJECT_ID") ||
  firebaseConfig.appId.includes("YOUR_APP_ID");

if (hasPlaceholders) {
  console.error(`
    ⚠️ FIREBASE CONFIG ERROR ⚠️
    
    You need to replace the placeholder values in:
    src/integrations/firebase/config.js
    
    Get your Firebase config from:
    https://console.firebase.google.com/ → Project Settings → Your apps → Web
    
    Current error: Invalid API key because placeholders are still in use.
    
    Replace these values:
    - apiKey: "YOUR_API_KEY_HERE" → Your actual API key
    - projectId: "YOUR_PROJECT_ID" → Your actual project ID
    - appId: "YOUR_APP_ID" → Your actual app ID
    - etc.
  `);
  
  // Don't initialize Firebase with invalid config
  throw new Error(
    "Firebase config contains placeholder values. " +
    "Please update src/integrations/firebase/config.js with your actual Firebase credentials. " +
    "See console for details."
  );
}

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  console.error("Firebase initialization error:", error);
  throw new Error(
    "Failed to initialize Firebase. " +
    "Please check your Firebase config values in src/integrations/firebase/config.js"
  );
}

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Connect to emulators in development (optional)
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  try {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "localhost", 8080);
    connectStorageEmulator(storage, "localhost", 9199);
    console.log("🔥 Firebase emulators connected");
  } catch (error) {
    console.warn("Firebase emulators not available:", error);
  }
}

export default app;

