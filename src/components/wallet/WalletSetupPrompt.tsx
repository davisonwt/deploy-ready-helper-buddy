import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Wallet, X, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface WalletSetupPromptProps {
  variant?: 'banner' | 'card';
}

export function WalletSetupPrompt({ variant = 'banner' }: WalletSetupPromptProps) {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user has dismissed this prompt
    const wasDismissed = localStorage.getItem('wallet-setup-prompt-dismissed');
    if (wasDismissed === 'true') {
      setDismissed(true);
      setLoading(false);
      return;
    }

    // Check if user already has a wallet set up
    const checkWallet = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('sower_balances')
          .select('wallet_address')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking wallet:', error);
        }

        setHasWallet(!!data?.wallet_address);
      } catch (error) {
        console.error('Error checking wallet:', error);
      } finally {
        setLoading(false);
      }
    };

    checkWallet();
  }, [user]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('wallet-setup-prompt-dismissed', 'true');
  };

  // Don't show if not logged in, loading, already has wallet, or dismissed
  if (!user || loading || hasWallet || dismissed) {
    return null;
  }

  if (variant === 'banner') {
    return (
      <div className="relative bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border-b border-primary/20">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-2 rounded-full bg-primary/20 shrink-0">
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  <Sparkles className="h-3 w-3 inline mr-1 text-primary" />
                  Set up your payout wallet to receive earnings from your seeds and orchards
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link to="/wallet-settings">
                <Button size="sm" className="gap-2">
                  Set Up Now
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDismiss}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/20 shrink-0">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground mb-1 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Set Up Your Payout Wallet
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Configure your crypto wallet address to receive earnings from your seeds, orchards, and whisperer commissions.
            </p>
            <div className="flex gap-2">
              <Link to="/wallet-settings">
                <Button size="sm" className="gap-2">
                  Set Up Wallet
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
