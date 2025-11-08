import { Link } from 'react-router-dom';
import BestowalCheckout from '@/components/products/BestowalCheckout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ProductBasketPage() {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/products">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to S2G Community Products
          </Button>
        </Link>
        <h1 className="text-4xl font-bold">Bestowal Basket</h1>
        <p className="text-muted-foreground mt-2">
          Review and complete your bestowals to support creators
        </p>
      </div>

      <BestowalCheckout />
    </div>
  );
}
