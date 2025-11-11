import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast as toastFn } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Wallet, CheckCircle2, AlertCircle, Copy } from 'lucide-react';

interface OrganizationWallet {
  id: string;
  wallet_address: string;
  wallet_name: string;
  is_active: boolean;
  blockchain: string;
  wallet_type: string;
}

export function OrganizationWalletSetup() {
  const [wallets, setWallets] = useState<OrganizationWallet[]>([]);

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_wallets')
        .select('*')
        .eq('is_active', true)
        .in('wallet_name', ['s2gholding', 's2gbestow', 's2gdavison'])
        .order('wallet_name', { ascending: true });

      if (error) {
        console.error('Error fetching wallets:', error);
        return;
      }

      setWallets(data || []);
    } catch (error) {
      console.error('Error fetching wallets:', error);
    }
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toastFn.success('Wallet address copied to clipboard');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Organization Wallet Setup
        </CardTitle>
        <CardDescription>
          Binance Pay wallet addresses for receiving payments via the Bestowal Map
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Wallet className="h-4 w-4" />
          <AlertDescription>
            All payments are processed through Binance Pay and distributed automatically according to the Bestowal Map:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>All payments first go to <strong>s2gholding</strong></li>
              <li>15% distributed to <strong>s2gbestow</strong> (10% tithing + 5% admin)</li>
              <li>75-85% goes to the sower (<strong>s2gdavison</strong>)</li>
              <li>10% to grower (if applicable)</li>
            </ul>
          </AlertDescription>
        </Alert>

        {wallets.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No Binance Pay wallets configured. Please add wallet addresses in the database.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {wallets.map((wallet) => (
              <div key={wallet.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">
                    {wallet.wallet_name === 's2gholding' && '💰 Holding Wallet'}
                    {wallet.wallet_name === 's2gbestow' && '⛪ Tithing & Admin'}
                    {wallet.wallet_name === 's2gdavison' && '🌱 Sower Wallet'}
                  </p>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-xs text-muted-foreground">
                  Wallet Name: <code>{wallet.wallet_name}</code>
                </p>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 bg-muted rounded text-xs flex-1 truncate">
                    {wallet.wallet_address}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyAddress(wallet.wallet_address)}
                    className="h-8 w-8 p-0 flex-shrink-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Alert variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Important: These wallet addresses are used for Binance Pay distributions. 
            Make sure you have access to all wallets and keep your recovery phrases safe.
            All payments are processed in USDC via Binance Pay.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
