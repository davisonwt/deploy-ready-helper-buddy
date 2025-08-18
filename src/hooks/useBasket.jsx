import { createContext, useContext, useState, useEffect } from 'react'

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
      setBasketItems([...basketItems, { ...item, quantity: 1, id: Date.now() }])
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
    return basketItems.reduce((total, item) => total + item.quantity, 0)
  }
  
  const getTotalAmount = () => {
    return basketItems.reduce((total, item) => total + (item.amount * item.quantity), 0)
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