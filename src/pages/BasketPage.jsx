import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBasket } from '../hooks/useBasket'
import { useAuth } from '../hooks/useAuth'
import { useCurrency } from '../hooks/useCurrency'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Trash2, ShoppingCart, CreditCard } from 'lucide-react'
import PaymentModal from '../components/PaymentModal'

export default function BasketPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { basketItems, removeFromBasket, updateQuantity, clearBasket, getTotalItems, getTotalAmount } = useBasket()
  const { formatAmount } = useCurrency()
  const { toast } = useToast()
  
  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState({
    fullName: '',
    email: '',
    address: '',
    city: '',
    zipCode: '',
    country: '',
    specialInstructions: ''
  })
  
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedBasketItem, setSelectedBasketItem] = useState(null)

  const handleInputChange = (field, value) => {
    setInvoiceForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleMakeItRain = () => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to complete your bestowal.",
        variant: "destructive"
      })
      return
    }

    if (!invoiceForm.fullName || !invoiceForm.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in at least your name and email for the invoice.",
        variant: "destructive"
      })
      return
    }

    // Combine all basket items into one payment
    const combinedPayment = {
      orchardId: basketItems[0]?.orchardId,
      amount: getTotalAmount(),
      currency: basketItems[0]?.currency || 'USD',
      pockets: basketItems.flatMap(item => item.pockets),
      invoiceInfo: invoiceForm
    }

    setSelectedBasketItem(combinedPayment)
    setShowPaymentModal(true)
  }

  const handlePaymentComplete = () => {
    clearBasket()
    setShowPaymentModal(false)
    toast({
      title: "Payment Successful! 🌱",
      description: "Thank you for your bestowal. Your invoice will be sent to your email.",
    })
    navigate('/dashboard')
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Please Log In</h2>
          <p className="mb-4">You need to be logged in to view your basket.</p>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </Card>
      </div>
    )
  }

  if (basketItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold mb-4">Your Basket is Empty</h2>
          <p className="mb-4">Add some orchard pockets to your basket to continue.</p>
          <Button onClick={() => navigate('/browse-orchards')}>Browse Orchards</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-green-800 mb-2">Your Bestowal Basket 🛒</h1>
          <p className="text-green-600">Review your selection and provide invoice details</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Basket Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Basket Items ({getTotalItems()})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {basketItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.orchardTitle}</h4>
                    <p className="text-sm text-gray-600">
                      {item.quantity} × {item.pockets.length} pockets = {formatAmount(item.amount * item.quantity * item.pockets.length)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Pockets: {item.pockets.join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                      className="w-16"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeFromBasket(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total:</span>
                  <span>{formatAmount(getTotalAmount())}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Invoice Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={invoiceForm.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={invoiceForm.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={invoiceForm.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Your address"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={invoiceForm.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label htmlFor="zipCode">Zip Code</Label>
                  <Input
                    id="zipCode"
                    value={invoiceForm.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    placeholder="Zip"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={invoiceForm.country}
                    onChange={(e) => handleInputChange('country', e.target.value)}
                    placeholder="Country"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="specialInstructions">Special Instructions</Label>
                <Textarea
                  id="specialInstructions"
                  value={invoiceForm.specialInstructions}
                  onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                  placeholder="Any special instructions or notes..."
                  rows={3}
                />
              </div>
              
              <div className="pt-4 border-t">
                <Button 
                  onClick={handleMakeItRain}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3"
                  size="lg"
                >
                  🌧️ Make It Rain! ({formatAmount(getTotalAmount())})
                </Button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Click to proceed to payment options
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedBasketItem && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          amount={selectedBasketItem.amount}
          currency={selectedBasketItem.currency}
          orchardId={selectedBasketItem.orchardId}
          pockets={selectedBasketItem.pockets}
          onPaymentComplete={handlePaymentComplete}
        />
      )}
    </div>
  )
}