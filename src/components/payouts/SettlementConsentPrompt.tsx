// Settlement consent (non-custodial model, legal 2026-09-03). Exact
// required wording -- do not edit without bumping
// app_settings.settlement_consent_version, or existing acceptances of the
// old wording will keep satisfying the (changed) requirement.
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useSettlementConsent } from '@/hooks/useSettlementConsent';

export const SETTLEMENT_CONSENT_TEXT =
  "I understand Sow2Grow holds my sale proceeds only until they reach $20 (or on my request), " +
  'then pays them to my own wallet. My funds otherwise stay in my wallet.';

export function SettlementConsentPrompt({ onAccepted }: { onAccepted?: () => void }) {
  const { accepting, accept } = useSettlementConsent();
  const [checked, setChecked] = useState(false);

  const handleAccept = async () => {
    const ok = await accept();
    if (ok) onAccepted?.();
  };

  return (
    <Card className="border-primary/40">
      <CardHeader>
        <CardTitle className="text-base">Before you sell on Sow2Grow</CardTitle>
        <CardDescription>Required once — you'll only see this again if the terms change.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-start gap-3 text-sm cursor-pointer">
          <Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} className="mt-0.5" />
          <span>{SETTLEMENT_CONSENT_TEXT}</span>
        </label>
        <Button onClick={handleAccept} disabled={!checked || accepting} className="w-full sm:w-auto">
          {accepting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Accept and continue
        </Button>
      </CardContent>
    </Card>
  );
}
