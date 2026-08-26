import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

  // Older saved baskets pre-date product-type metadata. Restore it from both
  // product seeds and the dedicated music library so singles always receive
  // the correct $2 + 15% pricing at checkout.
  useEffect(() => {
    const missingTypeIds = basketItems.filter((item) => !item.type).map((item) => item.id);
    if (missingTypeIds.length === 0) return;

    let active = true;
    const restoreProductTypes = async () => {
      const { data: products, error: productError } = await supabase
        .from('products')
        .select('id, type, category, file_url, music_genre')
        .in('id', missingTypeIds);

      if (!active || productError) return;
      const types = new Map<string, string>();
      for (const row of products || []) {
        const productType = String(row.type || row.category || '').toLowerCase();
        const isMusic = productType === 'music' || Boolean(row.music_genre)
          || /\.(mp3|m4a|wav|flac|aac|ogg)(\?|$)/i.test(String(row.file_url || ''));
        if (isMusic) types.set(row.id, 'music');
        else if (productType) types.set(row.id, productType);
      }

      const unresolvedIds = missingTypeIds.filter((id) => !types.has(id));
      if (unresolvedIds.length > 0) {
        const { data: tracks } = await supabase
          .from('dj_music_tracks')
          .select('id')
          .in('id', unresolvedIds);
        for (const track of tracks || []) types.set(track.id, 'music');
      }

      if (!active || types.size === 0) return;
      setBasketItems((current) => current.map((item) => (
        item.type || !types.get(item.id) ? item : { ...item, type: types.get(item.id) }
      )));
    };

    restoreProductTypes();
    return () => { active = false; };
  }, [basketItems]);

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
