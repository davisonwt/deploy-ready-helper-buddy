import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useBinancePay } from '@/hooks/useBinancePay';
import { toast } from 'sonner';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { confirmPayment } = useBinancePay();

  useEffect(() => {
    const bestowId = searchParams.get('orderId');
    const paymentRef = searchParams.get('paymentRef');

    if (bestowId && paymentRef) {
      confirmPayment(bestowId, paymentRef);
    }
  }, [searchParams, confirmPayment]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-muted-foreground">
            Your bestowal has been received and is being distributed according to the bestowal map.
          </p>
          
          <div className="bg-muted/50 p-4 rounded-lg text-sm text-left space-y-2">
            <p className="font-semibold">Distribution:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>✓ 10.5% → Tithing & Admin (s2gbestow)</li>
              <li>✓ 89.5% → Sower (creator)</li>
              <li>✓ Payment confirmed on blockchain</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              <ArrowRight className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
            <Button 
              onClick={() => navigate('/browse-orchards')} 
              variant="outline"
              className="w-full"
            >
              Browse More Orchards
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
