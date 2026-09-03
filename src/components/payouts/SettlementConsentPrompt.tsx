// Settlement consent (non-custodial model, legal 2026-09-03). Exact
// required wording -- do not edit without bumping
// app_settings.settlement_consent_version, or existing acceptances of the
// old wording will keep satisfying the (changed) requirement.
//
// Checking the box IS the acceptance -- there used to be a separate
// "Accept and continue" button required after checking it, which is an
// easy way to think you've consented (you ticked the box, right there)
// when nothing was actually saved yet. One action now: check it, it
// saves immediately, and a real success/failure state is shown so it's
// never ambiguous whether it worked.
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useSettlementConsent } from '@/hooks/useSettlementConsent';

export const SETTLEMENT_CONSENT_TEXT =
  "I understand Sow2Grow holds my sale proceeds only until they reach $20 (or on my request), " +
  'then pays them to my own wallet. My funds otherwise stay in my wallet.';

export function SettlementConsentPrompt({ onAccepted }: { onAccepted?: () => void }) {
  const { accepting, accept } = useSettlementConsent();
  const [failed, setFailed] = useState(false);

  const handleCheck = async (value: boolean) => {
    if (!value) return; // unchecking doesn't un-accept -- there's nothing to save for "off"
    setFailed(false);
    const ok = await accept();
    if (ok) {
      toast.success('Payout terms accepted.');
      onAccepted?.();
    } else {
      setFailed(true);
    }
  };

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="text-base">Before you sell on Sow2Grow</CardTitle>
        <CardDescription>Required once — you'll only see this again if the terms change.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="flex items-start gap-3 text-sm cursor-pointer">
          <Checkbox checked={accepting} onCheckedChange={(v) => handleCheck(v === true)} disabled={accepting} className="mt-0.5" />
          <span>{SETTLEMENT_CONSENT_TEXT}</span>
        </label>
        {accepting && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
          </p>
        )}
        {failed && (
          <p className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5" /> That didn't save — check your connection and tick the box again.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
