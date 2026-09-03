// Non-custodial model (legal, 2026-09-03): a sower who already has live
// listings from before this shipped hasn't been through the
// RequireSettlementConsent gate (that only fires on a NEW listing/sale --
// see spec-payments.md's settlement-consent section) or the payout-settings
// prompt yet. This nags them on the dashboard until they accept -- dismiss
// only hides it for the current session, so it keeps reappearing on future
// visits rather than being silenced for good the moment someone closes it.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSettlementConsent } from '@/hooks/useSettlementConsent';

const DISMISS_KEY = 'settlementConsentBanner:dismissed';

async function hasLiveListings(userId: string): Promise<boolean> {
  const { data: sower } = await supabase.from('sowers').select('id').eq('user_id', userId).maybeSingle();
  if (sower?.id) {
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('sower_id', sower.id)
      .eq('status', 'active');
    if ((count ?? 0) > 0) return true;
  }
  const { count: orchardCount } = await supabase
    .from('orchards')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active');
  return (orchardCount ?? 0) > 0;
}

export default function SettlementConsentBanner() {
  const { user } = useAuth();
  const { hasAccepted, loading: consentLoading } = useSettlementConsent();
  const [hasListings, setHasListings] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === 'true'; } catch { return false; }
  });

  useEffect(() => {
    if (!user || hasAccepted !== false) return;
    let cancelled = false;
    hasLiveListings(user.id).then((v) => { if (!cancelled) setHasListings(v); });
    return () => { cancelled = true; };
  }, [user, hasAccepted]);

  if (consentLoading || hasAccepted !== false || !hasListings || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, 'true'); } catch { /* private browsing */ }
  };

  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          Accept the payout terms to keep your seeds on sale —{' '}
          <Link to="/settings/payouts" className="underline font-medium">review in payout settings</Link>.
        </span>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 text-amber-700/70 hover:text-amber-700 dark:text-amber-300/70 dark:hover:text-amber-300"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
