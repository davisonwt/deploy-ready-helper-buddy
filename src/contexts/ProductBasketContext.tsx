import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface Product {
  id: string;
  title: string;
  price: number;
  cover_image_url?: string;
  file_url?: string;
  sower_id: string;
  bestowal_count: number;
  type?: string;
  category?: string;
  music_genre?: string;
  sowers?: {
    display_name: string;
  };
}

interface ProductBasketContextType {
  basketItems: Product[];
  addToBasket: (product: Product) => void;
  removeFromBasket: (productId: string) => void;
  clearBasket: () => void;
  totalAmount: number;
  itemCount: number;
}

const ProductBasketContext = createContext<ProductBasketContextType | undefined>(undefined);

export function ProductBasketProvider({ children }: { children: ReactNode }) {
  const [basketItems, setBasketItems] = useState<Product[]>(() => {
    const saved = localStorage.getItem('productBasket');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Error loading basket:', error);
        return [];
      }
    }
    return [];
  });

  // Save basket to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('productBasket', JSON.stringify(basketItems));
  }, [basketItems]);

  // Repair on load: some add-to-basket call sites have historically sent an
  // id that isn't a real products.id (a DJ track, a broadcast/community
  // video, a synthetic freewill-gift id) — those items 404 at checkout with
  // product_not_found and sit in localStorage forever since nothing ever
  // removes them. Validate whatever was persisted against products.id once,
  // on mount, and drop anything that doesn't resolve, with a toast — rather
  // than re-validating on every basket change (that unbounded-requery shape
  // is exactly what was pulled out of this file the last time it existed).
  useEffect(() => {
    const ids = basketItems.map((item) => item.id).filter(Boolean);
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      // Ids that were never valid UUIDs (legacy synthetic freewill-* ids)
      // can't be products either way — no need to spend a query on them,
      // and PostgREST rejects a non-UUID value in a uuid column's .in().
      const uuidIds = ids.filter((id) => UUID_RE.test(id));
      const validIds = new Set<string>();
      if (uuidIds.length > 0) {
        const { data, error } = await supabase.from('products').select('id').in('id', uuidIds);
        if (cancelled) return;
        if (error) {
          console.error('Basket repair: products lookup failed', error);
          return;
        }
        for (const p of data || []) validIds.add(p.id);
      }
      if (cancelled) return;
      setBasketItems((prev) => {
        const kept = prev.filter((item) => item.id && validIds.has(item.id));
        const dropped = prev.filter((item) => !(item.id && validIds.has(item.id)));
        if (dropped.length === 0) return prev;
        toast.error(
          dropped.length === 1
            ? `Removed "${dropped[0].title || 'an item'}" from your basket — it's no longer available.`
            : `Removed ${dropped.length} items from your basket — they're no longer available.`,
        );
        return kept;
      });
    })();
    return () => {
      cancelled = true;
    };
    // Run once on mount against whatever localStorage handed us at start —
    // not on every basketItems change (see comment above).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addToBasket = (product: Product) => {
    setBasketItems((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      if (exists) {
        return prev; // Don't add duplicates
      }
      return [...prev, product];
    });
  };

  const removeFromBasket = (productId: string) => {
    setBasketItems((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearBasket = () => {
    setBasketItems([]);
  };

  const totalAmount = basketItems.reduce((total, item) => total + parseFloat(item.price.toString()), 0);
  const itemCount = basketItems.length;

  return (
    <ProductBasketContext.Provider
      value={{
        basketItems,
        addToBasket,
        removeFromBasket,
        clearBasket,
        totalAmount,
        itemCount
      }}
    >
      {children}
    </ProductBasketContext.Provider>
  );
}

export function useProductBasket() {
  const context = useContext(ProductBasketContext);
  if (!context) {
    throw new Error('useProductBasket must be used within ProductBasketProvider');
  }
  return context;
}
