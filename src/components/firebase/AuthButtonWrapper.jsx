/**
 * Wrapper component for AuthButton that catches React dispatcher errors
 * This prevents the app from crashing when React isn't fully initialized
 */

import React, { Component } from 'react';
import AuthButton from './AuthButton';

class AuthButtonErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Check if this is a React dispatcher error
    if (
      error?.message?.includes('useState') ||
      error?.message?.includes('dispatcher') ||
      error?.message?.includes('dispatcher is null')
    ) {
      return { hasError: true, error };
    }
    // Re-throw other errors
    throw error;
  }

  componentDidCatch(error, errorInfo) {
    // Only log dispatcher errors, don't crash the app
    if (
      error?.message?.includes('useState') ||
      error?.message?.includes('dispatcher') ||
      error?.message?.includes('dispatcher is null')
    ) {
      console.warn('AuthButton: React dispatcher not ready, component will not render', error);
      return;
    }
    // Log other errors normally
    console.error('AuthButton error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Silently fail - don't render anything
      return null;
    }

    return <AuthButton />;
  }
}

export default AuthButtonErrorBoundary;

