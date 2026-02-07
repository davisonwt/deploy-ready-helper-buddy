import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, AlertTriangle, X } from "lucide-react";
import SecurityQuestionsSetup from "./SecurityQuestionsSetup";
import { useSecurityQuestionsStatus } from "@/hooks/useSecurityQuestionsStatus";

interface SecurityQuestionsAlertProps {
  onDismiss?: () => void;
  showDismiss?: boolean;
}

export default function SecurityQuestionsAlert({ onDismiss, showDismiss = true }: SecurityQuestionsAlertProps) {
  const { hasSecurityQuestions, loading, refetch } = useSecurityQuestionsStatus();
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Don't show if already set up, loading, or dismissed
  if (loading || hasSecurityQuestions || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleComplete = async () => {
    setShowSetupDialog(false);
    await refetch();
  };

  return (
    <>
      <Alert className="bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:border-amber-700 relative">
        {showDismiss && (
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          </button>
        )}
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="text-amber-800 dark:text-amber-300 font-semibold">
          Protect Your Account
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-400">
          <p className="mb-3">
            Set up security questions to enable password recovery without email. 
            This ensures you can always regain access to your account.
          </p>
          <Button
            onClick={() => setShowSetupDialog(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white"
            size="sm"
          >
            <Shield className="h-4 w-4 mr-2" />
            Set Up Security Questions
          </Button>
        </AlertDescription>
      </Alert>

      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Shield className="h-5 w-5" />
              Security Questions Setup
            </DialogTitle>
          </DialogHeader>
          <SecurityQuestionsSetup onComplete={handleComplete} isRegistration={false} />
        </DialogContent>
      </Dialog>
    </>
  );
}
