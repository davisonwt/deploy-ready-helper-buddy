import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ErrorHandlerOptions {
  showToast?: boolean;
  logToSupabase?: boolean;
  fallbackMessage?: string;
}

export const useErrorHandler = () => {
  const { toast } = useToast();

  const handleError = useCallback(async (
    error: Error | string,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      logToSupabase = true,
      fallbackMessage = 'An unexpected error occurred'
    } = options;

    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorDetails = typeof error === 'string' ? null : {
      stack: error.stack,
      name: error.name,
    };

    // Show toast notification
    if (showToast) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage || fallbackMessage,
      });
    }

    // Log to Supabase error_logs table
    if (logToSupabase) {
      try {
        await supabase.from('error_logs').insert({
          error_message: errorMessage,
          error_stack: errorDetails?.stack,
          error_name: errorDetails?.name,
          user_agent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Failed to log error to Supabase:', logError);
      }
    }

    // Always log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error handled:', error);
    }
  }, [toast]);

  const handleAsyncError = useCallback((
    asyncFn: () => Promise<any>,
    options?: ErrorHandlerOptions
  ) => {
    return async () => {
      try {
        return await asyncFn();
      } catch (error) {
        await handleError(error as Error, options);
        throw error; // Re-throw to allow upstream handling
      }
    };
  }, [handleError]);

  return { handleError, handleAsyncError };
};