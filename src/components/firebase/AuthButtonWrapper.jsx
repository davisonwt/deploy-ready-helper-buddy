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
    // Check if this is a React dispatcher error or module loading error
    const errorString = String(error);
    const errorMessage = error?.message || '';
    const errorStack = error?.stack || '';
    
    const isDispatcherError = 
      errorMessage.includes('useState') ||
      errorMessage.includes('dispatcher') ||
      errorMessage.includes('dispatcher is null') ||
      errorMessage.includes("can't access property") ||
      errorString.includes('useState') ||
      errorString.includes('dispatcher') ||
      errorStack.includes('useState') ||
      errorStack.includes('dispatcher');
    
    const isModuleLoadingError =
      errorMessage.includes('error loading dynamically imported module') ||
      errorMessage.includes('Loading failed for the module') ||
      errorMessage.includes('NetworkError') ||
      errorString.includes('error loading dynamically imported module') ||
      errorString.includes('Loading failed for the module');
    
    if (isDispatcherError || isModuleLoadingError) {
      return { hasError: true, error };
    }
    // Re-throw other errors so they're handled by parent error boundaries
    throw error;
  }

  componentDidCatch(error, errorInfo) {
    // Check if this is a React dispatcher error or module loading error
    const errorString = String(error);
    const errorMessage = error?.message || '';
    const errorStack = error?.stack || '';
    
    const isDispatcherError = 
      errorMessage.includes('useState') ||
      errorMessage.includes('dispatcher') ||
      errorMessage.includes('dispatcher is null') ||
      errorMessage.includes("can't access property") ||
      errorString.includes('useState') ||
      errorString.includes('dispatcher') ||
      errorStack.includes('useState') ||
      errorStack.includes('dispatcher');
    
    const isModuleLoadingError =
      errorMessage.includes('error loading dynamically imported module') ||
      errorMessage.includes('Loading failed for the module') ||
      errorMessage.includes('NetworkError') ||
      errorString.includes('error loading dynamically imported module') ||
      errorString.includes('Loading failed for the module');
    
    if (isDispatcherError || isModuleLoadingError) {
      // Silently handle these errors - don't log as error, just warn
      console.warn('AuthButton: Module loading or React dispatcher issue, component will not render');
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

