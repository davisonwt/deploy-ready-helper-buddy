import { Link, useLocation } from 'react-router-dom';
import BestowalCheckout from '@/components/products/BestowalCheckout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';

export default function ProductBasketPage() {
  // A physical seed's Bestow from a stall's SeedCard lands here (SeedCard.tsx
  // handleBestowClick) -- when it does, it carries where to go back to (the
  // same stall sheet, not a generic Products listing) as router state.
  const location = useLocation();
  const returnTo = (location.state as { returnTo?: { pathname: string; label?: string; from?: string } } | null)?.returnTo;

  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex flex-wrap gap-3 mb-6">
          {/* replace: true -- a genuine "go back" hop, not a forward step,
              so it must replace this basket entry rather than push another
              one on top (same navigation-loop cause as ChatApp.tsx's
              handleBackToList: a pushed entry means the stall interior's
              own close lands back on THIS basket page instead of wherever
              the visitor actually came from). `from` carries the stall's
              own origin through too. */}
          <Link
            to={returnTo?.pathname ?? '/products'}
            replace={Boolean(returnTo)}
            state={returnTo?.from ? { from: returnTo.from } : undefined}
          >
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {returnTo?.label ?? 'Products'}
            </Button>
          </Link>
          {/* Flow v2 step 14: /dashboard already redirects to /cockpit, but
              /cockpit is now specifically the buyer's OWN stall -- link
              there directly rather than through the legacy alias. The
              "Products"/returnTo button above already covers "back to the
              specific stall I bought from" when that context exists; this
              one is always "go to my own home" regardless. */}
          <Link to="/cockpit">
            <Button variant="outline" size="sm">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              My Stall
            </Button>
          </Link>
        </div>
        
        <h1 className="text-4xl font-bold">Bestowal Basket</h1>
        <p className="text-muted-foreground mt-2">
          Review and complete your bestowals to support creators
        </p>
      </div>

      <BestowalCheckout />
    </div>
  );
}
