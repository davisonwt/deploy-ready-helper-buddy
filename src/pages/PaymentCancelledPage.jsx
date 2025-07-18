import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { XCircle, ArrowLeft, Home, RotateCcw } from 'lucide-react';

const PaymentCancelledPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-br from-orange-200/30 to-red-200/30 rounded-full animate-pulse shadow-xl" style={{ animationDuration: "4s" }}></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-br from-red-200/30 to-orange-200/30 rounded-full animate-bounce shadow-lg" style={{ animationDuration: "3s", animationDelay: "1s" }}></div>
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-lg bg-card/95 backdrop-blur-sm shadow-2xl border-warning/20">
          <CardHeader className="text-center pb-4">
            <div className="w-20 h-20 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-12 w-12 text-warning" />
            </div>
            <CardTitle className="text-2xl text-foreground mb-2">
              Payment Cancelled
            </CardTitle>
            <p className="text-muted-foreground">
              Your payment was cancelled. No charges were made to your account.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Information */}
            <div className="bg-warning/5 p-4 rounded-lg border border-warning/20">
              <h3 className="font-semibold text-foreground mb-2">What happened?</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Your payment process was cancelled</li>
                <li>• No money was charged from your account</li>
                <li>• Your orchard selection is still available</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={() => navigate(-1)}
                className="w-full bg-primary hover:bg-primary/90"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Try Payment Again
              </Button>
              
              <div className="grid grid-cols-2 gap-3">
                <Link to="/browse-orchards">
                  <Button
                    variant="outline"
                    className="w-full border-primary/30 text-primary hover:bg-primary/5"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Browse Orchards
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  onClick={() => navigate(-2)}
                  className="border-muted-foreground/30 text-muted-foreground hover:bg-muted/50"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Go Back
                </Button>
              </div>
            </div>

            {/* Help Section */}
            <div className="text-center text-xs text-muted-foreground border-t border-border pt-4">
              <p className="mb-2">Need help with your payment?</p>
              <p>Contact us at nextupsowgrow@example.com</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentCancelledPage;