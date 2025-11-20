import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Product {
  id: string;
  title: string;
  price: number;
  cover_image_url?: string;
  sower_id: string;
  bestowal_count: number;
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
  const [basketItems, setBasketItems] = useState<Product[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load basket from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('productBasket');
    console.log('Loading basket from localStorage:', saved);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log('Parsed basket items:', parsed);
        setBasketItems(parsed);
      } catch (error) {
        console.error('Error loading basket:', error);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save basket to localStorage whenever it changes (but only after initial load)
  useEffect(() => {
    if (isLoaded) {
      console.log('Saving basket to localStorage:', basketItems);
      localStorage.setItem('productBasket', JSON.stringify(basketItems));
    }
  }, [basketItems, isLoaded]);

  const addToBasket = (product: Product) => {
    console.log('Adding to basket:', product);
    setBasketItems((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      if (exists) {
        console.log('Product already in basket');
        return prev; // Don't add duplicates
      }
      const newItems = [...prev, product];
      console.log('New basket items:', newItems);
      return newItems;
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
