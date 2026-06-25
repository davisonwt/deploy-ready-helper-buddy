import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function SupportUsPage() {
  return (
    <main className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">
            Support Sow2Grow
          </h1>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            All giving on Sow2Grow now flows through our compliant rails: NOWPayments (crypto)
            and PayPal (cards / PayPal balance). Choose a path below.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/free-will-gifting">Free-Will Gift</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/tithing">Platform Contribution</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/wallet">Top Up Wallet</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
