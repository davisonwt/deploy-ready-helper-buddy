import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, CheckCircle, AlertCircle, Lock, RefreshCw } from "lucide-react";
import SecurityQuestionsSetup from "@/components/auth/SecurityQuestionsSetup";
import { useSecurityQuestionsStatus } from "@/hooks/useSecurityQuestionsStatus";

export default function SecuritySettingsCard() {
  const { hasSecurityQuestions, loading, refetch } = useSecurityQuestionsStatus();
  const [showSetupDialog, setShowSetupDialog] = useState(false);

  const handleComplete = async () => {
    setShowSetupDialog(false);
    await refetch();
  };

  return (
    <>
      <Card className="bg-card/95 backdrop-blur-md border-border/30 shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-foreground text-lg flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Security Questions Status */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Security Questions</p>
                <p className="text-sm text-muted-foreground">
                  Used for password recovery without email
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {loading ? (
                <Badge variant="secondary" className="animate-pulse">
                  Checking...
                </Badge>
              ) : hasSecurityQuestions ? (
                <>
                  <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Configured
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSetupDialog(true)}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Update
                  </Button>
                </>
              ) : (
                <>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Set
                  </Badge>
                  <Button
                    size="sm"
                    onClick={() => setShowSetupDialog(true)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Shield className="h-4 w-4 mr-1" />
                    Set Up
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Info message */}
          {!hasSecurityQuestions && !loading && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                <strong>Recommended:</strong> Set up security questions to ensure you can recover your account 
                if you forget your password or lose access to your email.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Shield className="h-5 w-5" />
              {hasSecurityQuestions ? "Update Security Questions" : "Set Up Security Questions"}
            </DialogTitle>
          </DialogHeader>
          <SecurityQuestionsSetup onComplete={handleComplete} isRegistration={false} />
        </DialogContent>
      </Dialog>
    </>
  );
}
