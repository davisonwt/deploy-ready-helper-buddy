import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  X, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Wallet,
  Plus,
  Coins
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useWallet } from '../hooks/useWallet';
import { useUSDCPayments } from '../hooks/useUSDCPayments';
import { WalletConnection } from './WalletConnection';
import { FiatOnRamp } from './FiatOnRamp';

const PaymentModal = ({ 
  isOpen, 
  onClose, 
  amount, 
  currency = 'USD', 
  orchardId, 
  pocketsCount = 0, 
  pocketNumbers = [],
  orchardTitle = "Orchard",
  onPaymentComplete
}) => {
  const [selectedMethod, setSelectedMethod] = useState('usdc');
  const [processing, setProcessing] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const { toast } = useToast();
  const { wallet, connected, balance, connectWallet, refreshBalance } = useWallet();
  const { processBestowPart, checkSufficientBalance, loading: usdcLoading } = useUSDCPayments();

  const paymentMethods = [
    {
      id: 'usdc',
      name: 'USDC Wallet (Crypto.com)',
      icon: <Coins className="h-5 w-5" />,
      description: connected ? `Balance: $${balance.toFixed(2)} USDC` : 'Low fees • Instant transfer',
      color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      recommended: true,
      available: true
    }
  ];

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && !processing) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, processing, onClose]);

  const handleUSDCPayment = async () => {
    try {
      if (!connected) {
        await connectWallet();
        return;
      }

      if (!checkSufficientBalance(amount)) {
        setShowTopUp(true);
        return;
      }

      setProcessing(true);

      const result = await processBestowPart({
        amount,
        orchardId,
        pocketsCount,
        pocketNumbers
      });

      if (result.success) {
        setPaymentCompleted(true);
        setTimeout(() => {
          onClose();
          onPaymentComplete?.();
          setPaymentCompleted(false);
        }, 2000);
      }

    } catch (error) {
      console.error('USDC payment error:', error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to process USDC payment",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handlePayment = () => {
    // Only USDC payments are supported
    handleUSDCPayment();
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!processing ? onClose : undefined}
      />
      
      {/* Modal */}
      <Card className="relative w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-sm border-border/50 shadow-2xl">
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-foreground">Complete Your Bestowal</CardTitle>
              <p className="text-muted-foreground mt-1">
                {currency} {amount} for {orchardTitle}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={!processing ? onClose : undefined}
              disabled={processing}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Show Top-up Interface */}
          {showTopUp && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Top-up Required</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTopUp(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800 mb-2">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-semibold">Insufficient Balance</span>
                </div>
                <p className="text-sm text-yellow-700">
                  You need ${amount.toFixed(2)} USDC but only have ${balance.toFixed(2)} USDC.
                  Please top-up your wallet to continue.
                </p>
              </div>

              <FiatOnRamp 
                requiredAmount={amount - balance}
                onSuccess={() => {
                  refreshBalance();
                  setShowTopUp(false);
                  toast({
                    title: "Balance Updated",
                    description: "Your wallet balance has been refreshed.",
                  });
                }}
              />
            </div>
          )}

          {/* Payment Summary */}
          {!showTopUp && (
            <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className="font-semibold text-foreground">${amount} USDC</span>
              </div>
              {pocketsCount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pockets</span>
                  <span className="text-sm text-foreground">{pocketsCount} selected</span>
                </div>
              )}
            </div>
          )}


          {/* Wallet Connection for USDC */}
          {!showTopUp && selectedMethod === 'usdc' && !connected && (
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Connect Your Wallet</h3>
              <WalletConnection />
            </div>
          )}

          {/* USDC Balance Check */}
          {!showTopUp && selectedMethod === 'usdc' && connected && !checkSufficientBalance(amount) && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800 mb-2">
                <AlertCircle className="h-5 w-5" />
                <span className="font-semibold">Insufficient Balance</span>
              </div>
              <p className="text-sm text-yellow-700 mb-3">
                You need ${amount.toFixed(2)} USDC but only have ${balance.toFixed(2)} USDC.
              </p>
              <Button
                onClick={() => setShowTopUp(true)}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Top-up Wallet
              </Button>
            </div>
          )}

          {/* Payment Method Selection */}
          {!showTopUp && (
            <>
              <div>
                <h3 className="font-semibold text-foreground mb-3">Choose Payment Method</h3>
                <div className="space-y-3">
                  {paymentMethods.filter(method => method.available).map((method) => (
                    <div
                      key={method.id}
                      className={`
                        relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                        ${selectedMethod === method.id 
                          ? method.color + ' border-current' 
                          : 'bg-background border-border hover:border-primary/30'
                        }
                        ${method.id === 'usdc' && !connected ? 'opacity-75' : ''}
                      `}
                      onClick={() => setSelectedMethod(method.id)}
                    >
                      {method.recommended && (
                        <Badge className="absolute -top-2 -right-2 bg-emerald-500 text-white">
                          Recommended
                        </Badge>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="text-lg">
                          {typeof method.icon === 'string' ? method.icon : method.icon}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-foreground">{method.name}</div>
                          <div className="text-sm text-muted-foreground">{method.description}</div>
                        </div>
                        {selectedMethod === method.id && (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={processing || usdcLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePayment}
                  disabled={
                    !selectedMethod || 
                    processing || 
                    usdcLoading ||
                    (selectedMethod === 'usdc' && !connected) ||
                    (selectedMethod === 'usdc' && connected && !checkSufficientBalance(amount))
                  }
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white font-semibold"
                >
                  {processing || usdcLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : paymentCompleted ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Payment Complete! 🌧️
                    </>
                  ) : selectedMethod === 'usdc' && !connected ? (
                    <>
                      <Wallet className="h-4 w-4 mr-2" />
                      Connect Wallet
                    </>
                  ) : selectedMethod === 'usdc' && connected && !checkSufficientBalance(amount) ? (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Top-up Required
                    </>
                  ) : (
                    <>
                      🌧️ Let it Rain - ${amount} {selectedMethod === 'usdc' ? 'USDC' : currency}
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentModal;