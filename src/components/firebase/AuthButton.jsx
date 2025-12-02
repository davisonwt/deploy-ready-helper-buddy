/**
 * Authentication Button Component
 * Auto-signs in anonymously, allows account creation
 */

import { useState, useEffect } from "react";
import { Button } from "../ui/button";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { isFirebaseConfigured } from "@/integrations/firebase/config";
import { User, LogOut, Mail } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export default function AuthButton() {
  // All hooks must be called unconditionally at the top
  // Wrap in try-catch to handle React dispatcher null errors
  let authState;
  try {
    authState = useFirebaseAuth();
  } catch (error) {
    // If React dispatcher is null, return null to prevent crash
    if (error?.message?.includes('useState') || error?.message?.includes('dispatcher')) {
      console.warn('React dispatcher not ready, AuthButton returning null');
      return null;
    }
    throw error; // Re-throw if it's a different error
  }
  
  const { user, loading, isAuthenticated, autoSignIn, signUp, signIn, signOut } = authState;
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  
  // Don't render if Firebase is not configured
  if (!isFirebaseConfigured) {
    return null; // Return null to hide the button when Firebase isn't configured
  }

  // Auto-sign in anonymously on mount if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      autoSignIn();
    }
  }, [loading, isAuthenticated]);

  const handleAnonymousSignIn = async () => {
    setAuthLoading(true);
    setAuthError("");
    const result = await autoSignIn();
    if (result.success) {
      setShowAuthDialog(false);
    } else {
      setAuthError(result.error || "Failed to sign in");
    }
    setAuthLoading(false);
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    let result;
    if (isSignUp) {
      result = await signUp(email, password, displayName);
    } else {
      result = await signIn(email, password);
    }

    if (result.success) {
      setShowAuthDialog(false);
      setEmail("");
      setPassword("");
      setDisplayName("");
    } else {
      setAuthError(result.error || `Failed to ${isSignUp ? "create account" : "sign in"}`);
    }
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <User className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    );
  }

  if (isAuthenticated && user) {
    const displayName = user.displayName || (user.isAnonymous ? "Anonymous" : user.email?.split("@")[0] || "User");
    
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground hidden md:inline">
          {displayName}
        </span>
        <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <User className="h-4 w-4 mr-2" />
              Remnant Wall
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Account Settings</DialogTitle>
              <DialogDescription>
                {user.isAnonymous
                  ? "Create an account to save your data across devices"
                  : "Manage your account"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {user.isAnonymous && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-4">
                    You're signed in anonymously. Create an account to sync your journal
                    and Remnant Wall posts across all your devices.
                  </p>
                  <Button
                    onClick={() => {
                      setIsSignUp(true);
                      setShowAuthDialog(true);
                    }}
                    className="w-full"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Create Account
                  </Button>
                </div>
              )}
              <Button
                onClick={handleSignOut}
                variant="destructive"
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={handleAnonymousSignIn}>
          <User className="h-4 w-4 mr-2" />
          Sign In Anonymously
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isSignUp ? "Create Account" : "Sign In"}
          </DialogTitle>
          <DialogDescription>
            {isSignUp
              ? "Create an account to sync your data across devices"
              : "Sign in to access your journal and Remnant Wall"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          {authError && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded">
              {authError}
            </div>
          )}
          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1"
              disabled={authLoading}
            >
              {authLoading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSignUp(!isSignUp)}
              disabled={authLoading}
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </Button>
          </div>
          <div className="text-center">
            <Button
              type="button"
              variant="ghost"
              onClick={handleAnonymousSignIn}
              disabled={authLoading}
              className="text-sm"
            >
              Continue Anonymously
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

