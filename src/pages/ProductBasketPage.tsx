import { Link } from 'react-router-dom';
import BestowalCheckout from '@/components/products/BestowalCheckout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';

export default function ProductBasketPage() {
  return (
    <div className="container max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex flex-wrap gap-3 mb-6">
          <Link to="/products">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Products
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
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
