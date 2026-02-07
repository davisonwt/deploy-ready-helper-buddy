import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WalletHelpModal } from '@/components/wallet/WalletHelpModal';
import { Button } from '@/components/ui/button';
import { ExternalLink, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SupportUsPage() {
  return (
    <main className="container mx-auto py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Support Us
          </CardTitle>
          <WalletHelpModal />
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Support our mission by making a freewill offering. We use NOWPayments for secure payment processing.
          </p>
          <p className="text-sm text-muted-foreground">
            You can pay with cryptocurrency, credit/debit card, bank transfer, or PayPal.
          </p>
          <div className="flex gap-3 pt-2">
            <Link to="/freewill-offering">
              <Button className="gap-2">
                <Heart className="h-4 w-4" />
                Make a Gift
              </Button>
            </Link>
            <Button 
              variant="outline"
              onClick={() => window.open('https://nowpayments.io', '_blank')}
              className="gap-2"
            >
              Learn about NOWPayments
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
