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

export function useFirebaseAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
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
    currentUser: getCurrentUser(),
  };
}

