/**
 * Firebase Authentication Utilities
 * Supports Anonymous and Email/Password authentication
 */

import {
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { auth } from "./config";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./config";

/**
 * Auto-sign in anonymously (called on first visit)
 */
export async function signInAnonymouslyUser() {
  try {
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;
    
    // Create user document if it doesn't exist
    await ensureUserDocument(user.uid, {
      displayName: "Anonymous User",
      anonymityLevel: 0,
      joinedDate: new Date().toISOString(),
    });
    
    return { success: true, user };
  } catch (error) {
    console.error("Anonymous sign-in error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Create account with email and password
 */
export async function createAccount(email, password, displayName = null) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update display name if provided
    if (displayName) {
      await updateProfile(user, { displayName });
    }
    
    // Create user document
    await ensureUserDocument(user.uid, {
      displayName: displayName || email.split("@")[0],
      email,
      anonymityLevel: 1, // Default to name+country level
      joinedDate: new Date().toISOString(),
    });
    
    return { success: true, user };
  } catch (error) {
    console.error("Account creation error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error("Sign-in error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Sign out current user
 */
export async function signOutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error("Sign-out error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Ensure user document exists in Firestore
 */
async function ensureUserDocument(uid, userData) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      ...userData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

/**
 * Get current user
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Subscribe to auth state changes
 */
export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}

