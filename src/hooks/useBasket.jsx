import React, { createContext, useContext, useState, useEffect } from 'react'

const BasketContext = createContext()

export const useBasket = () => {
  const context = useContext(BasketContext)
  if (!context) {
    throw new Error('useBasket must be used within a BasketProvider')
  }
  return context
}

export const BasketProvider = ({ children }) => {
  const [basketItems, setBasketItems] = useState([])
  
  // Load basket from localStorage on mount
  useEffect(() => {
    const savedBasket = localStorage.getItem('sowBasket')
    if (savedBasket) {
      setBasketItems(JSON.parse(savedBasket))
    }
  }, [])
  
  // Save basket to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sowBasket', JSON.stringify(basketItems))
  }, [basketItems])
  
  const createBasketKey = (item) => {
    const pocketKey = Array.isArray(item.pockets)
      ? [...item.pockets].sort((a, b) => (a || 0) - (b || 0)).join('-')
      : String(item.pockets ?? '');
    return `${item.orchardId || 'orchard'}::${pocketKey}`;
  };

  const addToBasket = (item) => {
    setBasketItems((prev) => {
      const key = createBasketKey(item);
      const existingIndex = prev.findIndex((entry) => entry._key === key);

      if (existingIndex !== -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + (item.quantity ?? 1),
        };
        return updated;
      }

      const id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString();

      return [
        ...prev,
        {
          ...item,
          quantity: item.quantity ?? 1,
          id,
          _key: key,
        },
      ];
    });
  };
  
  const removeFromBasket = (itemId) => {
    setBasketItems((prev) => prev.filter((item) => item.id !== itemId));
  };
  
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromBasket(itemId);
      return;
    }
    
    setBasketItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item,
      ),
    );
  };
  
  const clearBasket = () => {
    setBasketItems([]);
  };
  
  const getTotalItems = () => {
    return basketItems.reduce((total, item) => total + (item.quantity ?? 0), 0);
  };
  
  const getTotalAmount = () => {
    return basketItems.reduce((total, item) => {
      const pocketCount = Array.isArray(item.pockets) ? item.pockets.length : 1;
      return total + (Number(item.amount || 0) * (item.quantity ?? 0) * pocketCount);
    }, 0);
  };
  
  return (
    <BasketContext.Provider value={{
      basketItems,
      addToBasket,
      removeFromBasket,
      updateQuantity,
      clearBasket,
      getTotalItems,
      getTotalAmount
    }}>
      {children}
    </BasketContext.Provider>
  )
}