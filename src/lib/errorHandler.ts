import { toast } from '@/hooks/use-toast';

export interface ErrorCategory {
  title: string;
  description: string;
  level: 'info' | 'warn' | 'error';
  action?: string;
}

export const categorizeError = (error: any): ErrorCategory => {
  // Network errors
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return {
      title: 'Network Error',
      description: 'Please check your internet connection and try again.',
      level: 'error',
      action: 'retry'
    };
  }

  // Auth errors
  if (error.status === 401 || error.message?.includes('unauthorized')) {
    return {
      title: 'Authentication Required',
      description: 'Please log in to continue.',
      level: 'warn',
      action: 'login'
    };
  }

  if (error.status === 403) {
    return {
      title: 'Access Denied',
      description: 'You do not have permission to perform this action.',
      level: 'error'
    };
  }

  // Rate limiting
  if (error.status === 429) {
    return {
      title: 'Rate Limit Exceeded',
      description: 'Too many requests. Please try again in a few moments.',
      level: 'warn',
      action: 'wait'
    };
  }

  // Validation errors
  if (error.status === 400 || error.message?.includes('validation')) {
    return {
      title: 'Validation Error',
      description: error.message || 'Please check your input and try again.',
      level: 'warn'
    };
  }

  // Database/RLS errors
  if (error.message?.includes('row-level security') || error.message?.includes('RLS')) {
    return {
      title: 'Permission Error',
      description: 'You do not have access to this resource.',
      level: 'error'
    };
  }

  // Supabase specific errors
  if (error.code === 'PGRST116') {
    return {
      title: 'Resource Not Found',
      description: 'The requested resource could not be found.',
      level: 'warn'
    };
  }

  // Generic server errors
  if (error.status >= 500) {
    return {
      title: 'Server Error',
      description: 'Something went wrong on our end. Please try again later.',
      level: 'error',
      action: 'retry'
    };
  }

  // Default error
  return {
    title: 'Unexpected Error',
    description: error.message || 'Something went wrong. Please try again.',
    level: 'error',
    action: 'retry'
  };
};

export const handleError = (error: any, context?: any) => {
  const { title, description, level } = categorizeError(error);
  
  // Log to console with context
  const logLevel = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info';
  console[logLevel](`[${level.toUpperCase()}] ${title}:`, {
    description,
    error,
    context,
    timestamp: new Date().toISOString()
  });

  // In production, send to error tracking service
  if (import.meta.env.PROD && level === 'error') {
    // TODO: Integrate with error tracking service (Sentry, LogRocket, etc.)
    // Sentry.captureException(error, { 
    //   tags: { component: context?.component },
    //   extra: { ...context, errorCategory: title }
    // });
  }

  // Show user-friendly toast
  toast({
    variant: level === 'error' ? 'destructive' : 'default',
    title,
    description,
  });

  return { title, description, level };
};

export const createErrorHandler = (component: string) => {
  return (error: any, additionalContext?: any) => {
    return handleError(error, { component, ...additionalContext });
  };
};
