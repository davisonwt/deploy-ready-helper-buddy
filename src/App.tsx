import React from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from '@/hooks/useAuth';
import { BasketProvider } from '@/hooks/useBasket';
import { ProductBasketProvider } from '@/contexts/ProductBasketContext';
import { AppContextProvider } from '@/contexts/AppContext';

export default function App() {
  return (
    <AuthProvider>
      <AppContextProvider>
        <BasketProvider>
          <ProductBasketProvider>
            <ThemeProvider defaultTheme="system" storageKey="sow2grow-ui-theme">
              <Toaster />
              <Sonner />
              <AppRoutes />
            </ThemeProvider>
          </ProductBasketProvider>
        </BasketProvider>
      </AppContextProvider>
    </AuthProvider>
  );
}
