import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export const ChatAppVerificationBanner = () => {
  return (
    <Alert className="mb-4 border-emerald-600 bg-emerald-50 dark:bg-emerald-950">
      <AlertCircle className="h-4 w-4 text-emerald-600" />
      <AlertTitle className="text-emerald-900 dark:text-emerald-100 font-semibold">
        Finish set-up • 1 unread
      </AlertTitle>
      <AlertDescription className="text-emerald-800 dark:text-emerald-200">
        Please complete your account verification to access all features of Sow2Grow.
      </AlertDescription>
    </Alert>
  );
};
