import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast as toastFn } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/hooks/useWallet';
import { Wallet, CheckCircle2, AlertCircle, Copy } from 'lucide-react';
import { formatUSDC } from '@/lib/cronos';

interface OrganizationWallet {
  id: string;
  wallet_address: string;
  wallet_name: string;
  is_active: boolean;
  blockchain: string;
  wallet_type: string;
}

export function OrganizationWalletSetup() {
  const { connected, publicKey, balance, connectWallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [currentWallet, setCurrentWallet] = useState<OrganizationWallet | null>(null);
  const [walletName, setWalletName] = useState('Sow2Grow Main Wallet');

  useEffect(() => {
    fetchCurrentWallet();
  }, []);

  const fetchCurrentWallet = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_wallets')
        .select('*')
        .eq('is_active', true)
        .eq('blockchain', 'cronos')
        .maybeSingle();

      if (error) {
        console.error('Error fetching wallet:', error);
        return;
      }

      setCurrentWallet(data);
      if (data?.wallet_name) {
        setWalletName(data.wallet_name);
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  };

  const handleSetOrganizationWallet = async () => {
    if (!connected || !publicKey) {
      toastFn.error('Please connect your Crypto.com wallet first');
      return;
    }

    setLoading(true);
    try {
      // Deactivate any existing wallets
      await supabase
        .from('organization_wallets')
        .update({ is_active: false })
        .eq('is_active', true);

      // Insert or update the new organization wallet
      const { data, error } = await supabase
        .from('organization_wallets')
        .upsert({
          wallet_address: publicKey,
          wallet_name: walletName,
          is_active: true,
          blockchain: 'cronos',
          wallet_type: 'cryptocom',
          supported_tokens: ['USDC', 'CRO'],
        }, {
          onConflict: 'wallet_address',
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentWallet(data as OrganizationWallet);

      toastFn.success(`All payments will now be sent to ${publicKey.slice(0, 6)}...${publicKey.slice(-4)}`);

      await fetchCurrentWallet();
    } catch (error: any) {
      console.error('Error setting organization wallet:', error);
      toastFn.error(error.message || 'Failed to set organization wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAddress = () => {
    if (currentWallet?.wallet_address) {
      navigator.clipboard.writeText(currentWallet.wallet_address);
      toastFn.success('Wallet address copied to clipboard');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Organization Wallet Setup
        </CardTitle>
        <CardDescription>
          Set your Crypto.com wallet to receive all site payments, tithings, and admin fees
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {currentWallet ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">Active Organization Wallet</p>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-muted rounded text-xs">
                    {currentWallet.wallet_address}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyAddress}
                    className="h-8 w-8 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Wallet Name: {currentWallet.wallet_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Network: Cronos (Crypto.com Chain)
                </p>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No organization wallet configured. Connect your wallet to set up payment receiving.
            </AlertDescription>
          </Alert>
        )}

        {!connected ? (
          <div className="space-y-4">
            <Alert>
              <Wallet className="h-4 w-4" />
              <AlertDescription>
                Connect your Crypto.com DeFi Wallet to set it as the organization wallet.
                This wallet will receive:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>All orchard bestowals and donations</li>
                  <li>Tithings and contributions</li>
                  <li>Admin fees and platform charges</li>
                  <li>All USDC payments on Cronos</li>
                </ul>
              </AlertDescription>
            </Alert>
            <Button onClick={connectWallet} className="w-full">
              <Wallet className="mr-2 h-4 w-4" />
              Connect Crypto.com Wallet
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">Connected Wallet</p>
                  <p className="text-sm">Address: {publicKey.slice(0, 10)}...{publicKey.slice(-8)}</p>
                  <p className="text-sm">Balance: {formatUSDC(balance)} USDC</p>
                  <p className="text-sm">Network: Cronos Mainnet</p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="wallet-name">Wallet Name (optional)</Label>
              <Input
                id="wallet-name"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                placeholder="e.g., Sow2Grow Main Wallet"
              />
            </div>

            <Button
              onClick={handleSetOrganizationWallet}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                'Setting Organization Wallet...'
              ) : currentWallet ? (
                'Update Organization Wallet'
              ) : (
                'Set as Organization Wallet'
              )}
            </Button>

            <Alert variant="default">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Important: Make sure you have access to this wallet and keep your recovery phrase safe.
                All payments will be sent to this address on the Cronos blockchain.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
