/**
 * React Hook for Firebase Authentication
 * Provides auth state and methods throughout the app
 */

import { useState, useEffect } from "react";
import {
  onAuthStateChange,
  signInAnonymouslyUser,
  createAccount,
  signInWithEmail,
  signOutUser,
  getCurrentUser,
} from "@/integrations/firebase/auth";
import { isFirebaseConfigured } from "@/integrations/firebase/config";

// Check if React dispatcher is ready
function isReactDispatcherReady() {
  try {
    // Try to access React's internal dispatcher
    // If useState throws or dispatcher is null, React isn't ready
    const testState = useState;
    if (!testState) return false;
    
    // Check React DevTools hook for dispatcher state
    if (typeof window !== 'undefined' && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
      if (hook && hook.renderers && hook.renderers.size > 0) {
        return true;
      }
    }
    
    // If we can call useState without error, dispatcher should be ready
    return true;
  } catch (e) {
    return false;
  }
}

export function useFirebaseAuth() {
  // Safety check for React dispatcher - return safe defaults if not ready
  if (!isReactDispatcherReady()) {
    console.warn("React dispatcher not ready, returning safe defaults");
    return {
      user: null,
      loading: false,
      isAuthenticated: false,
      autoSignIn: async () => ({ success: false, error: "React not initialized" }),
      signIn: async () => ({ success: false, error: "React not initialized" }),
      signUp: async () => ({ success: false, error: "React not initialized" }),
      signOut: async () => ({ success: false, error: "React not initialized" }),
      currentUser: null,
    };
  }

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthenticated(!!firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Auto-sign in anonymously if not authenticated
  const autoSignIn = async () => {
    if (!isFirebaseConfigured) {
      return { success: false, error: "Firebase is not configured" };
    }
    
    if (!user) {
      const result = await signInAnonymouslyUser();
      return result;
    }
    return { success: true, user };
  };

  const signIn = async (email, password) => {
    return await signInWithEmail(email, password);
  };

  const signUp = async (email, password, displayName) => {
    return await createAccount(email, password, displayName);
  };

  const signOut = async () => {
    return await signOutUser();
  };

  return {
    user,
    loading,
    isAuthenticated,
    autoSignIn,
    signIn,
    signUp,
    signOut,
    currentUser: isFirebaseConfigured ? getCurrentUser() : null,
  };
}

