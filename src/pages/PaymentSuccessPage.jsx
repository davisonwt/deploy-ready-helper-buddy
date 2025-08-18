import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { CheckCircle, ArrowLeft, Home, Share2, Loader2 } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const processPayment = async () => {
      try {
        const sessionId = searchParams.get('session_id');
        const orderId = searchParams.get('order_id');

        if (sessionId) {
          // Handle Stripe payment success
          console.log('Stripe payment successful:', sessionId);
          setPaymentDetails({
            method: 'Stripe',
            reference: sessionId,
            message: 'Your card payment has been processed successfully!'
          });
        } else if (orderId) {
          // Handle PayPal payment success - capture the payment
          const { data, error } = await supabase.functions.invoke('capture-paypal-payment', {
            body: { orderId }
          });

          if (error) throw error;

          setPaymentDetails({
            method: 'PayPal',
            reference: orderId,
            message: 'Your PayPal payment has been captured successfully!'
          });
        } else {
          throw new Error('No payment information found');
        }
      } catch (err) {
        console.error('Payment processing error:', err);
        setError(err.message || 'Failed to process payment');
      } finally {
        setProcessing(false);
      }
    };

    processPayment();
  }, [searchParams]);

  const handleShare = () => {
    const url = window.location.origin;
    navigator.clipboard.writeText(url);
    // Could add a toast notification here
  };

  if (processing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/95 backdrop-blur-sm shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Processing Payment</h2>
            <p className="text-muted-foreground">Please wait while we confirm your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-card/95 backdrop-blur-sm shadow-2xl border-destructive/20">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-destructive mb-2">Payment Error</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="space-y-3">
              <Button onClick={() => navigate(-1)} variant="outline" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Link to="/browse-orchards">
                <Button className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Browse Orchards
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-green-200/30 to-emerald-200/30 rounded-full animate-pulse shadow-xl" style={{ animationDuration: "4s" }}></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-emerald-200/30 to-green-200/30 rounded-full animate-bounce shadow-lg" style={{ animationDuration: "3s", animationDelay: "1s" }}></div>
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-gradient-to-br from-green-300/20 to-emerald-300/20 rounded-full animate-pulse shadow-xl" style={{ animationDuration: "5s", animationDelay: "2s" }}></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-lg bg-card/95 backdrop-blur-sm shadow-2xl border-success/20">
          <CardHeader className="text-center pb-4">
            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-12 w-12 text-success" />
            </div>
            <CardTitle className="text-2xl text-foreground mb-2">
              Payment Successful! 🌱
            </CardTitle>
            <p className="text-muted-foreground">
              Your bestowal has been received and is growing into something beautiful
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Payment Details */}
            <div className="bg-success/5 p-4 rounded-lg border border-success/20">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-medium text-foreground">{paymentDetails.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transaction ID:</span>
                  <span className="font-mono text-xs text-foreground">{paymentDetails.reference}</span>
                </div>
              </div>
            </div>

            {/* Success Message */}
            <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm text-foreground leading-relaxed">
                {paymentDetails.message}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                You will receive a confirmation email shortly with your bestowal details.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link to="/browse-orchards" className="block">
                <Button className="w-full bg-primary hover:bg-primary/90">
                  <Home className="h-4 w-4 mr-2" />
                  Explore More Orchards
                </Button>
              </Link>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="border-success/30 text-success hover:bg-success/5"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(-2)}
                  className="border-primary/30 text-primary hover:bg-primary/5"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Orchard
                </Button>
              </div>
            </div>

            {/* Thank You Message */}
            <div className="text-center text-xs text-muted-foreground italic border-t border-border pt-4">
              "Every seed planted today grows into tomorrow's harvest. Thank you for being part of our growing community! 🌿"
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;