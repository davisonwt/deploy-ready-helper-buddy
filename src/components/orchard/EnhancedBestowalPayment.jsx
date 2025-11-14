import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, DollarSign, Heart, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { BinancePayButton } from '@/components/payment/BinancePayButton';
import { z } from 'zod';

// Payment validation schema
const paymentSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be at least 0.01'),
  pockets_count: z.number().int().min(1, 'Must purchase at least 1 pocket'),
  message: z.string().max(500, 'Message must be less than 500 characters').optional()
});

const EnhancedBestowalPayment = () => {
  const [orchard, setOrchard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pocketsCount, setPocketsCount] = useState(1);
  const [message, setMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  
  const { id: orchardId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (orchardId) {
      loadOrchardData();
    }
  }, [orchardId]);

  // Real-time validation
  useEffect(() => {
    validatePayment();
  }, [pocketsCount, orchard]);

  const loadOrchardData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orchards')
        .select('*')
        .eq('id', orchardId)
        .eq('status', 'active')
        .single();

      if (error) throw error;

      if (!data) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Orchard not found'
        });
        navigate('/browse-orchards');
        return;
      }

      setOrchard(data);
    } catch (error) {
      console.error('Error loading orchard:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load orchard data'
      });
      navigate('/browse-orchards');
    } finally {
      setLoading(false);
    }
  };

  const validatePayment = () => {
    if (!orchard) return false;

    try {
      const amount = pocketsCount * orchard.pocket_price;
      
      paymentSchema.parse({
        amount,
        pockets_count: pocketsCount,
        message
      });

      // Check if enough pockets are available
      const errors = {};
      const availablePockets = orchard.total_pockets - orchard.filled_pockets;
      if (pocketsCount > availablePockets) {
        errors.pockets_count = `Only ${availablePockets} pocket(s) available`;
      }

      setValidationErrors(errors);
      return Object.keys(errors).length === 0;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = {};
        error.errors.forEach(err => {
          errors[err.path[0]] = err.message;
        });
        setValidationErrors(errors);
      }
      return false;
    }
  };

  const handlePocketsChange = (e) => {
    const value = parseInt(e.target.value) || 1;
    const maxAvailable = orchard ? orchard.total_pockets - orchard.filled_pockets : 1;
    setPocketsCount(Math.min(Math.max(1, value), maxAvailable));
  };

  const handlePaymentSuccess = () => {
    toast({
      title: 'Payment Initiated!',
      description: 'Complete payment in Binance Pay window'
    });
    
    setTimeout(() => {
      navigate(`/orchard/${orchardId}`);
    }, 2000);
  };

  const createBestowTransaction = async () => {
    if (!validatePayment() || !connected || !walletAddress) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please connect your wallet and fix any errors'
      });
      return;
    }

    setProcessing(true);
    setPaymentStatus('creating');

    try {
      const amount = pocketsCount * orchard.pocket_price;
      
      // Create bestowal record
      const bestowData = {
        orchard_id: orchardId,
        amount,
        pockets_count: pocketsCount,
        message: message.trim() || null,
        currency: 'USDC',
        payment_method: 'wallet',
        payment_status: 'pending'
      };

      const bestowResult = await createBestowal(bestowData);
      
      if (!bestowResult.success) {
        throw new Error(bestowResult.error || 'Failed to create bestowal');
      }

      setPaymentStatus('processing');

      // Process USDC payment
      const paymentResult = await processUSDCPayment({
        bestowId: bestowResult.data.id,
        amount,
        orchardId,
        fromAddress: walletAddress
      });

      if (paymentResult.success) {
        setPaymentStatus('completed');
        
        // Update bestowal status
        await updateBestowStatus(bestowResult.data.id, 'completed', paymentResult.signature);
        
        // Refresh wallet balance
        await refreshBalance();
        
        toast({
          title: 'Bestowal Successful!',
          description: `You have successfully bestowed ${amount.toFixed(2)} USDC to this orchard`
        });

        // Redirect to orchard page after success
        setTimeout(() => {
          navigate(`/orchard/${orchardId}`);
        }, 2000);
      } else {
        throw new Error(paymentResult.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Bestowal error:', error);
      setPaymentStatus('failed');
      toast({
        variant: 'destructive',
        title: 'Bestowal Failed',
        description: error.message || 'Failed to process bestowal'
      });
    } finally {
      setProcessing(false);
    }
  };

  const processUSDCPayment = async ({ bestowId, amount, orchardId, fromAddress }) => {
    try {
      // Call edge function to process USDC transfer
      const { data, error } = await supabase.functions.invoke('process-usdc-transfer', {
        body: {
          bestowId,
          amount,
          orchardId,
          fromAddress,
          currency: 'USDC'
        }
      });

      if (error) throw error;

      return { success: true, signature: data.signature };
    } catch (error) {
      console.error('USDC payment error:', error);
      return { success: false, error: error.message || 'Payment processing failed' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading orchard data...</p>
        </div>
      </div>
    );
  }

  if (!orchard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Orchard not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const totalAmount = pocketsCount * orchard.pocket_price;
  const availablePockets = orchard.total_pockets - orchard.filled_pockets;
  const completionPercentage = (orchard.filled_pockets / orchard.total_pockets) * 100;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      {/* Orchard Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Heart className="h-5 w-5 mr-2 text-red-500" />
            Bestow to Orchard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">{orchard.title}</h3>
              <p className="text-gray-600 text-sm mt-1">{orchard.description}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Category:</span>
                <div>{orchard.category}</div>
              </div>
              <div>
                <span className="font-medium">Location:</span>
                <div>{orchard.location || 'Not specified'}</div>
              </div>
              <div>
                <span className="font-medium">Pocket Price:</span>
                <div>{orchard.pocket_price} USDC</div>
              </div>
              <div>
                <span className="font-medium">Available Pockets:</span>
                <div>{availablePockets} / {orchard.total_pockets}</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{completionPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-green-500" />
            Bestowal Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {!user && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You need to login to make a bestowal
                </AlertDescription>
              </Alert>
            )}

            {/* Pockets Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Number of Pockets <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="1"
                max={availablePockets}
                value={pocketsCount}
                onChange={handlePocketsChange}
                placeholder="Enter number of pockets"
                className={validationErrors.pockets_count ? 'border-red-500' : ''}
              />
              {validationErrors.pockets_count && (
                <p className="text-sm text-red-500 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {validationErrors.pockets_count}
                </p>
              )}
              <p className="text-sm text-gray-500">
                Each pocket costs {orchard.pocket_price} USDC
              </p>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Message (Optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a message with your bestowal..."
                className="w-full p-2 border border-gray-300 rounded-md resize-none"
                rows={3}
                maxLength={500}
              />
              <p className="text-sm text-gray-500 text-right">
                {message.length}/500 characters
              </p>
            </div>

            {/* Payment Summary */}
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Pockets:</span>
                <span>{pocketsCount} × ${orchard.pocket_price}</span>
              </div>
              <div className="flex justify-between font-medium text-lg border-t pt-2">
                <span>Total:</span>
                <span>${totalAmount.toFixed(2)} USDC</span>
              </div>
            </div>

            {/* Binance Pay Button */}
            <BinancePayButton
              orchardId={orchardId}
              amount={totalAmount}
              pocketsCount={pocketsCount}
              message={message}
              onSuccess={handlePaymentSuccess}
              disabled={!user || !validatePayment() || availablePockets === 0}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedBestowalPayment;