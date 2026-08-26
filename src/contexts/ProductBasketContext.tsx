import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { isMusicProduct } from '@/lib/pricing/music';

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

  // Re-resolve every saved basket line. Some legacy music basket entries use
  // a generated broadcast/session id rather than the underlying product id,
  // so resolve by media identity as well as id.
  useEffect(() => {
    const basketIds = basketItems.map((item) => item.id).filter(Boolean);
    if (basketIds.length === 0) return;

    let active = true;
    const restoreProductTypes = async () => {
      const uuidIds = basketIds.filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id));
      const { data: products } = uuidIds.length > 0
        ? await supabase
            .from('products')
            .select('id, type, category, file_url, cover_image_url, music_genre')
            .in('id', uuidIds)
        : { data: [] };

      if (!active) return;
      const types = new Map<string, string>();
      const musicFiles = new Set<string>();
      const musicCovers = new Set<string>();
      for (const row of products || []) {
        const productType = String(row.type || row.category || '').toLowerCase();
        const isMusic = isMusicProduct(row);
        if (isMusic) {
          types.set(row.id, 'music');
          if (row.file_url) musicFiles.add(row.file_url);
          if (row.cover_image_url) musicCovers.add(row.cover_image_url);
        }
        else if (productType) types.set(row.id, productType);
      }

      const savedFiles = basketItems.map((item) => item.file_url).filter(Boolean) as string[];
      const savedCovers = basketItems.map((item) => item.cover_image_url).filter(Boolean) as string[];
      if (savedFiles.length > 0) {
        const { data: fileProducts } = await supabase
          .from('products')
          .select('file_url, cover_image_url, type, category, music_genre')
          .in('file_url', savedFiles);
        for (const row of fileProducts || []) {
          const productType = String(row.type || row.category || '').toLowerCase();
          const isMusic = isMusicProduct(row);
          if (!isMusic) continue;
          if (row.file_url) musicFiles.add(row.file_url);
          if (row.cover_image_url) musicCovers.add(row.cover_image_url);
        }
      }
      if (savedCovers.length > 0) {
        const { data: coverProducts } = await supabase
          .from('products')
          .select('file_url, cover_image_url, type, category, music_genre')
          .in('cover_image_url', savedCovers);
        for (const row of coverProducts || []) {
          const productType = String(row.type || row.category || '').toLowerCase();
          const isMusic = isMusicProduct(row);
          if (!isMusic) continue;
          if (row.file_url) musicFiles.add(row.file_url);
          if (row.cover_image_url) musicCovers.add(row.cover_image_url);
        }
      }

      const unresolvedIds = basketIds.filter((id) => !types.has(id));
      if (unresolvedIds.length > 0) {
        const { data: tracks } = await supabase
          .from('dj_music_tracks')
          .select('id')
          .in('id', unresolvedIds);
        for (const track of tracks || []) types.set(track.id, 'music');
      }

      if (!active || (types.size === 0 && musicFiles.size === 0 && musicCovers.size === 0)) return;
      setBasketItems((current) => current.map((item) => {
        const resolvedType = types.get(item.id)
          || (item.file_url && musicFiles.has(item.file_url) ? 'music' : undefined)
          || (item.cover_image_url && musicCovers.has(item.cover_image_url) ? 'music' : undefined);
        return !resolvedType || item.type === resolvedType
          ? item
          : { ...item, type: resolvedType };
      }));
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
