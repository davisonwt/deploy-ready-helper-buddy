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
  
  const addToBasket = (item) => {
    console.log('🛒 Adding to basket:', item)
    const existingItem = basketItems.find(
      basketItem => basketItem.orchardId === item.orchardId && basketItem.pockets === item.pockets
    )
    
    if (existingItem) {
      setBasketItems(basketItems.map(basketItem => 
        basketItem.orchardId === item.orchardId && basketItem.pockets === item.pockets
          ? { ...basketItem, quantity: basketItem.quantity + 1 }
          : basketItem
      ))
    } else {
      const newBasketItems = [...basketItems, { ...item, quantity: 1, id: Date.now() }]
      console.log('🛒 New basket items:', newBasketItems)
      setBasketItems(newBasketItems)
    }
  }
  
  const removeFromBasket = (itemId) => {
    setBasketItems(basketItems.filter(item => item.id !== itemId))
  }
  
  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromBasket(itemId)
      return
    }
    
    setBasketItems(basketItems.map(item => 
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ))
  }
  
  const clearBasket = () => {
    setBasketItems([])
  }
  
  const getTotalItems = () => {
    const total = basketItems.reduce((total, item) => total + item.quantity, 0)
    console.log('🛒 Total items in basket:', total, 'basketItems:', basketItems)
    return total
  }
  
  const getTotalAmount = () => {
    return basketItems.reduce((total, item) => {
      const pocketCount = Array.isArray(item.pockets) ? item.pockets.length : 1
      return total + (item.amount * item.quantity * pocketCount)
    }, 0)
  }
  
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