import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bestowalId = useMemo(() => searchParams.get('orderId'), [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Payment Initiated!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-muted-foreground">
            Thank you for supporting this orchard. Binance Pay is confirming the transaction and we&apos;ll distribute your bestowal automatically according to the bestowal map.
          </p>

          {bestowalId && (
            <div className="bg-muted/50 p-4 rounded-lg text-sm text-left space-y-1">
              <p className="font-semibold">Reference</p>
              <p className="text-muted-foreground break-words">
                Bestowal ID: <span className="font-mono text-xs">{bestowalId}</span>
              </p>
            </div>
          )}
          
          <div className="bg-muted/50 p-4 rounded-lg text-sm text-left space-y-2">
            <p className="font-semibold">Distribution Overview</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>✓ 15% → Tithing & Admin (s2gbestow)</li>
              <li>✓ 85% → Sower (orchard owner)</li>
              <li>✓ Additional 10% allocated to product whispers when configured</li>
            </ul>
          </div>

          <div className="text-xs text-muted-foreground">
            You&apos;ll receive an email once the payment is confirmed and funds are distributed.
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
