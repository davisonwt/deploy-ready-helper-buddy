// Non-custodial model (legal, 2026-09-03): Sow2Grow doesn't hold a
// member's spending funds any more -- this card shows their own connected
// Solana wallet and its real, live on-chain USDC balance so "how much can
// I bestow right now" is always answerable from the dashboard, without
// opening Phantom separately.
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, RefreshCw, ExternalLink, Smartphone, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useLiveWalletBalance } from '@/lib/payments/liveWalletBalance';
import { validateSolanaAddress } from '@/lib/payments/cryptoAddress';
import { getPhantomProvider, isMobileDevice, PHANTOM_INSTALL_URL } from '@/lib/payments/phantomDetect';

const LOW_BALANCE_THRESHOLD = 5;

function truncate(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/** Relaunches the current page inside Phantom's own in-app browser, where window.solana becomes available -- Phantom's documented "browse" universal link. */
function phantomBrowseUrl(): string {
  const url = encodeURIComponent(window.location.href);
  const ref = encodeURIComponent(window.location.origin);
  return `https://phantom.app/ul/browse/${url}?ref=${ref}`;
}

export default function MyWalletCard() {
  const { user, updateProfile } = useAuth();
  const address: string | null = user?.solana_wallet_address || null;
  const { balance, loading: balanceLoading, refetch } = useLiveWalletBalance(address);
  const [connecting, setConnecting] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  const [pasteError, setPasteError] = useState('');
  const [saving, setSaving] = useState(false);

  const saveAddress = async (raw: string) => {
    const trimmed = raw.trim();
    const err = validateSolanaAddress(trimmed);
    if (err) {
      setPasteError(err);
      return;
    }
    setPasteError('');
    setSaving(true);
    try {
      const result = await updateProfile({ solana_wallet_address: trimmed });
      if (result?.success) {
        toast.success('Wallet connected.');
        setShowPaste(false);
        setPasteValue('');
      } else {
        toast.error(result?.error || 'Could not save your wallet address.');
      }
    } finally {
      setSaving(false);
    }
  };

  const connectExtension = async () => {
    const provider = getPhantomProvider();
    if (!provider) {
      window.open(PHANTOM_INSTALL_URL, '_blank', 'noopener,noreferrer');
      return;
    }
    setConnecting(true);
    try {
      const resp = await provider.connect();
      await saveAddress(resp.publicKey.toString());
    } catch (err: any) {
      if (err?.code !== 4001) { // 4001 = user closed the connect prompt
        toast.error(err?.message || 'Could not connect to Phantom.');
      }
    } finally {
      setConnecting(false);
    }
  };

  if (!address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4" /> My Wallet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Connect your Solana wallet — bestowals go straight from it to a sower, and your earnings arrive back in it.
          </p>
          {isMobileDevice() ? (
            <Button asChild className="w-full gap-2">
              <a href={phantomBrowseUrl()}>
                <Smartphone className="h-4 w-4" /> Open in Phantom app
              </a>
            </Button>
          ) : (
            <Button onClick={connectExtension} disabled={connecting} className="w-full gap-2">
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              Connect Phantom
            </Button>
          )}
          {!showPaste ? (
            <button
              type="button"
              className="w-full text-center text-xs text-muted-foreground underline hover:text-foreground"
              onClick={() => setShowPaste(true)}
            >
              Or paste your wallet address
            </button>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder="Solana wallet address"
                value={pasteValue}
                onChange={(e) => { setPasteValue(e.target.value); setPasteError(''); }}
                disabled={saving}
              />
              {pasteError && <p className="text-xs text-destructive">{pasteError}</p>}
              <Button size="sm" variant="outline" className="w-full" onClick={() => saveAddress(pasteValue)} disabled={saving || !pasteValue.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save address'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  const low = balance !== null && balance < LOW_BALANCE_THRESHOLD;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2"><Wallet className="h-4 w-4" /> My Wallet</span>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={balanceLoading}
            aria-label="Refresh balance"
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${balanceLoading ? 'animate-spin' : ''}`} />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="text-xs text-muted-foreground">Balance (USDC)</div>
          <div className="text-2xl font-bold tabular-nums">
            {balanceLoading && balance === null ? <Loader2 className="h-5 w-5 animate-spin" /> : `$${(balance ?? 0).toFixed(2)}`}
          </div>
        </div>
        <div className="text-xs text-muted-foreground font-mono">{truncate(address)}</div>
        {low && (
          <div className="rounded-md border border-orange-500/40 bg-orange-500/10 p-2.5 text-xs text-orange-700 dark:text-orange-300">
            Top up your wallet to keep bestowing — open Phantom and tap <strong>Buy</strong> to add USDC.
            {!isMobileDevice() && !getPhantomProvider() && (
              <>
                {' '}
                <a href={PHANTOM_INSTALL_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline">
                  Get Phantom <ExternalLink className="h-3 w-3" />
                </a>
              </>
            )}
          </div>
        )}
        {!showPaste ? (
          <button
            type="button"
            className="text-xs text-muted-foreground underline hover:text-foreground"
            onClick={() => { setShowPaste(true); setPasteValue(address); }}
          >
            Change wallet
          </button>
        ) : (
          <div className="space-y-2">
            <Input
              placeholder="Solana wallet address"
              value={pasteValue}
              onChange={(e) => { setPasteValue(e.target.value); setPasteError(''); }}
              disabled={saving}
            />
            {pasteError && <p className="text-xs text-destructive">{pasteError}</p>}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => saveAddress(pasteValue)} disabled={saving || !pasteValue.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowPaste(false); setPasteError(''); }} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
