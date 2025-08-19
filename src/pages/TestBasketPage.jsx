import React from 'react'
import { useBasket } from '../hooks/useBasket'

export default function TestBasketPage() {
  const { basketItems, addToBasket, getTotalItems } = useBasket()
  
  const testAddItem = () => {
    addToBasket({
      orchardId: 'test-123',
      orchardTitle: 'Test Orchard',
      pockets: [1, 2, 3],
      amount: 150,
      currency: 'USD'
    })
  }
  
  return (
    <div className="p-8">
      <h1>Basket Test Page</h1>
      <p>Total items: {getTotalItems()}</p>
      <p>Basket items: {JSON.stringify(basketItems, null, 2)}</p>
      <button onClick={testAddItem} className="bg-blue-500 text-white p-2 rounded">
        Add Test Item
      </button>
    </div>
  )
}