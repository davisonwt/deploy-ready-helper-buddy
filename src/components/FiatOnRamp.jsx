import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, ExternalLink, DollarSign } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';

const FIAT_ONRAMP_PROVIDERS = [
  {
    id: 'moonpay',
    name: 'MoonPay',
    description: 'Credit/Debit Card • Bank Transfer',
    fees: '3.5% + $4.99',
    logo: '🌙',
    minAmount: 30,
    maxAmount: 50000,
    color: 'bg-purple-100 text-purple-700 border-purple-200'
  },
  {
    id: 'ramp',
    name: 'Ramp Network',
    description: 'Credit/Debit Card • Bank Transfer',
    fees: '2.9% + $3.99',
    logo: '🚀',
    minAmount: 20,
    maxAmount: 25000,
    color: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  {
    id: 'mercuryo',
    name: 'Mercuryo',
    description: 'Credit/Debit Card',
    fees: '3.95% + $3.99',
    logo: '⚡',
    minAmount: 30,
    maxAmount: 10000,
    color: 'bg-green-100 text-green-700 border-green-200'
  }
];

export function FiatOnRamp({ requiredAmount = null, onSuccess = null }) {
  const { wallet, connected } = useWallet();
  const { toast } = useToast();
  const [selectedProvider, setSelectedProvider] = useState(null);

  const handleProviderSelect = (provider) => {
    if (!connected || !wallet) {
      toast({
        title: "Wallet Required",
        description: "Please connect your Crypto.com wallet first.",
        variant: "destructive"
      });
      return;
    }

    // Generate the on-ramp URL based on provider
    let onRampUrl = '';
    const walletAddress = wallet.address;
    const amount = requiredAmount || 100; // Default to $100

    switch (provider.id) {
      case 'moonpay':
        // SECURITY: Remove hardcoded API keys - these providers require proper backend integration
        toast({
          title: "Provider Configuration Required",
          description: "This provider requires proper API key configuration. Please contact support.",
          variant: "destructive"
        });
        return;
      case 'ramp':
        toast({
          title: "Provider Configuration Required", 
          description: "This provider requires proper API key configuration. Please contact support.",
          variant: "destructive"
        });
        return;
      case 'mercuryo':
        toast({
          title: "Provider Configuration Required",
          description: "This provider requires proper API key configuration. Please contact support.",
          variant: "destructive"
        });
        return;
      default:
        toast({
          title: "Provider Unavailable",
          description: "This payment provider is currently unavailable.",
          variant: "destructive"
        });
        return;
    }

    // Open the on-ramp in a new window
    const popup = window.open(
      onRampUrl,
      'fiat-onramp',
      'width=500,height=700,scrollbars=yes,resizable=yes'
    );

    // Listen for the popup to close (user completed or cancelled)
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        toast({
          title: "On-Ramp Completed",
          description: "Please check your wallet balance in a few minutes.",
        });
        
        // Refresh wallet balance after a delay
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
        }, 3000);
      }
    }, 1000);

    setSelectedProvider(provider);
  };

  if (!connected) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Buy USDC
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Please connect your wallet first to buy USDC.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Buy USDC with Fiat
        </CardTitle>
        {requiredAmount && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            Minimum needed: ${requiredAmount.toFixed(2)}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Choose a payment provider to buy USDC directly to your wallet:
        </p>
        
        <div className="space-y-3">
          {FIAT_ONRAMP_PROVIDERS.map((provider) => (
            <div
              key={provider.id}
              className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => handleProviderSelect(provider)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{provider.logo}</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{provider.name}</h3>
                      <Badge variant="outline" className={provider.color}>
                        {provider.fees}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {provider.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${provider.minAmount} - ${provider.maxAmount.toLocaleString()} limits
                    </p>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-muted p-3 rounded-lg">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> USDC purchases typically take 5-15 minutes to appear in your wallet. 
            Transaction fees vary by payment method and provider.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}