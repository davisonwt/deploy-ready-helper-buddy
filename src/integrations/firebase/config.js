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

// Try to load from environment variables first, fallback to actual config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBiufZz80_2HrVcc_OrjRBeFPEBozjGH58",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "s2gapp-64cfb.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "s2gapp-64cfb",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "s2gapp-64cfb.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "739043511260",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:739043511260:web:98ced9311fe8fc8ff01d19",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-5N62719XGG" // Optional, for Analytics
};

// Validate that config values have been replaced
const hasPlaceholders = 
  firebaseConfig.apiKey.includes("YOUR_API_KEY") ||
  firebaseConfig.projectId.includes("YOUR_PROJECT_ID") ||
  firebaseConfig.appId.includes("YOUR_APP_ID");

let app = null;
let firebaseConfigured = false;

if (hasPlaceholders) {
  console.warn(`
    ⚠️ FIREBASE NOT CONFIGURED ⚠️
    
    Firebase features are disabled because placeholder values are still in use.
    
    To enable Firebase:
    1. Go to: https://console.firebase.google.com/
    2. Create/select project → Project Settings → Your apps → Web
    3. Copy your Firebase config values
    4. Update: src/integrations/firebase/config.js
    
    Replace these values:
    - apiKey: "YOUR_API_KEY_HERE" → Your actual API key
    - projectId: "YOUR_PROJECT_ID" → Your actual project ID
    - appId: "YOUR_APP_ID" → Your actual app ID
    - etc.
    
    The app will continue to work without Firebase, but Firebase features
    (authentication, Remnant Wall, etc.) will be disabled.
  `);
} else {
  // Initialize Firebase only if config is valid
  try {
    app = initializeApp(firebaseConfig);
    firebaseConfigured = true;
    console.log("✅ Firebase initialized successfully");
  } catch (error) {
    console.error("Firebase initialization error:", error);
    console.warn("Firebase features will be disabled. App will continue to work.");
  }
}

// Export a flag to check if Firebase is configured
export const isFirebaseConfigured = firebaseConfigured;

// Initialize Firebase services (only if app is initialized)
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const storage = app ? getStorage(app) : null;

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

