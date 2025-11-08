import { Link } from 'react-router-dom';
import { useProductBasket } from '@/contexts/ProductBasketContext';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

export default function FloatingBasketButton() {
  const { itemCount } = useProductBasket();

  if (itemCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Link to="/products/basket">
          <Button
            size="lg"
            className="rounded-full shadow-lg h-14 w-14 p-0 relative bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            <ShoppingCart className="w-6 h-6" />
            {itemCount > 0 && (
              <Badge
                className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 bg-destructive"
              >
                {itemCount}
              </Badge>
            )}
          </Button>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
}
