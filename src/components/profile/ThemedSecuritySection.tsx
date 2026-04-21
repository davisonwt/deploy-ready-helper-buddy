/**
 * ThemedSecuritySection — inline, theme-aware replacement for the white
 * SecuritySettingsCard + SecurityQuestionsAlert combo on ProfilePage.
 * Uses the same hook + dialog so business logic is unchanged.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Shield, CheckCircle, AlertCircle, Lock, RefreshCw, AlertTriangle, X } from "lucide-react";
import SecurityQuestionsSetup from "@/components/auth/SecurityQuestionsSetup";
import { useSecurityQuestionsStatus } from "@/hooks/useSecurityQuestionsStatus";

type Theme = {
  accent: string;
  accentLight?: string;
  textPrimary: string;
  textSecondary: string;
  cardBg: string;
  cardBorder: string;
  shadow: string;
};

export function ThemedSecurityAlert({ theme }: { theme: Theme }) {
  const { hasSecurityQuestions, loading, refetch } = useSecurityQuestionsStatus();
  const [showDialog, setShowDialog] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (loading || hasSecurityQuestions || dismissed) return null;

  return (
    <>
      <div
        className="relative rounded-2xl p-4 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${theme.accent}22, ${theme.accent}10)`,
          border: `1px solid ${theme.accent}40`,
          boxShadow: `0 8px 24px -10px ${theme.shadow}`,
        }}
      >
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 p-1 rounded-full transition-colors"
          style={{ color: theme.textSecondary }}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${theme.accent}40, ${theme.accent}15)`,
              border: `1px solid ${theme.accent}40`,
            }}
          >
            <AlertTriangle className="h-4.5 w-4.5" style={{ color: theme.accent }} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold mb-1" style={{ color: theme.textPrimary }}>
              Protect Your Account
            </h4>
            <p className="text-xs mb-3 leading-relaxed" style={{ color: theme.textSecondary }}>
              Set up security questions to enable password recovery without email.
            </p>
            <button
              onClick={() => setShowDialog(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-transform active:scale-95"
              style={{
                background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentLight || theme.accent})`,
                boxShadow: `0 4px 12px -4px ${theme.accent}80`,
              }}
            >
              <Shield className="h-3.5 w-3.5" />
              Set Up Now
            </button>
          </div>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Shield className="h-5 w-5" />
              Security Questions Setup
            </DialogTitle>
          </DialogHeader>
          <SecurityQuestionsSetup
            onComplete={async () => {
              setShowDialog(false);
              await refetch();
            }}
            isRegistration={false}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ThemedSecuritySettings({ theme }: { theme: Theme }) {
  const { hasSecurityQuestions, loading, refetch } = useSecurityQuestionsStatus();
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <div
        className="rounded-xl p-3.5 flex items-center justify-between gap-3"
        style={{
          background: `${theme.textPrimary}06`,
          border: `1px solid ${theme.accent}20`,
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: `linear-gradient(135deg, ${theme.accent}30, ${theme.accent}10)`,
              border: `1px solid ${theme.accent}30`,
            }}
          >
            <Lock className="h-4 w-4" style={{ color: theme.accent }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: theme.textPrimary }}>
              Security Questions
            </p>
            <p className="text-[11px] leading-tight mt-0.5" style={{ color: theme.textSecondary }}>
              Used for password recovery without email
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {loading ? (
            <span className="text-[10px] px-2 py-1 rounded-full animate-pulse" style={{ background: `${theme.textPrimary}10`, color: theme.textSecondary }}>
              Checking…
            </span>
          ) : hasSecurityQuestions ? (
            <>
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full"
                style={{ background: '#22c55e22', color: '#22c55e' }}
              >
                <CheckCircle className="h-3 w-3" /> Set
              </span>
              <button
                onClick={() => setShowDialog(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                style={{
                  background: `${theme.textPrimary}10`,
                  color: theme.textPrimary,
                  border: `1px solid ${theme.cardBorder}`,
                }}
              >
                <RefreshCw className="h-3 w-3" /> Update
              </button>
            </>
          ) : (
            <>
              <span
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full"
                style={{ background: `${theme.accent}22`, color: theme.accent }}
              >
                <AlertCircle className="h-3 w-3" /> Not set
              </span>
              <button
                onClick={() => setShowDialog(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-transform active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentLight || theme.accent})`,
                  boxShadow: `0 4px 12px -4px ${theme.accent}80`,
                }}
              >
                <Shield className="h-3 w-3" /> Set Up
              </button>
            </>
          )}
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <Shield className="h-5 w-5" />
              {hasSecurityQuestions ? "Update Security Questions" : "Set Up Security Questions"}
            </DialogTitle>
          </DialogHeader>
          <SecurityQuestionsSetup
            onComplete={async () => {
              setShowDialog(false);
              await refetch();
            }}
            isRegistration={false}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
