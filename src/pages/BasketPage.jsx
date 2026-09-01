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
import { Trash2, ShoppingCart, CreditCard, LayoutDashboard, ArrowLeft } from "lucide-react"
import QuickBestowModal from '@/components/bestow/QuickBestowModal'

export default function BasketPage() {
  console.log('🛒 BasketPage rendered')
  const navigate = useNavigate()
  const { user } = useAuth()
  const { basketItems, removeFromBasket, updateQuantity, getTotalItems, getTotalAmount } = useBasket()
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
  
  // Basket checkout is a sequential queue, one orchard bestowal at a time —
  // the backend (create-nowpayments-invoice / create-paypal-order) only ever
  // charges a single orchard per invoice/order, so "charge the whole basket"
  // means walking every distinct item and initiating a correctly-priced
  // bestowal for each, not one combined payment for just the first item.
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [checkoutQueue, setCheckoutQueue] = useState([])
  const [checkoutIndex, setCheckoutIndex] = useState(0)

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

    if (basketItems.length === 0) return

    setCheckoutQueue(basketItems)
    setCheckoutIndex(0)
    setShowPaymentModal(true)
  }

  // Only fires once an item's invoice/order was actually created (see
  // QuickBestowModal's onSuccess) — never on Cancel/backdrop-close, so a
  // cancelled or failed item is left in the basket for the sower to retry.
  const handleItemSuccess = () => {
    const item = checkoutQueue[checkoutIndex]
    if (item) removeFromBasket(item.id)

    const nextIndex = checkoutIndex + 1
    if (nextIndex < checkoutQueue.length) {
      setCheckoutIndex(nextIndex)
      return
    }

    setShowPaymentModal(false)
    setCheckoutQueue([])
    setCheckoutIndex(0)
    toast({
      title: "Payment started 🌱",
      description: "Thank you for your bestowal. Paid items have been cleared from your basket.",
    })
    navigate('/dashboard')
  }

  const handleModalClose = () => {
    setShowPaymentModal(false)
    setCheckoutQueue([])
    setCheckoutIndex(0)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full animate-fade-in">
          <h2 className="text-2xl font-bold mb-4 text-foreground">Please Log In</h2>
          <p className="mb-6 text-muted-foreground">You need to be logged in to view your basket.</p>
          <Button onClick={() => navigate('/login')} className="w-full">Go to Login</Button>
        </Card>
      </div>
    )
  }

  if (basketItems.length === 0) {
    const productItems = (() => {
      try { return JSON.parse(localStorage.getItem('productBasket') || '[]') } catch { return [] }
    })()

    if (productItems.length > 0) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="p-8 text-center max-w-md w-full animate-fade-in">
            <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-3 text-foreground">Your Seeds Basket</h2>
            <p className="mb-6 text-muted-foreground">
              You have {productItems.length} seed{productItems.length > 1 ? 's' : ''} waiting in your seed basket.
            </p>
            <Button onClick={() => navigate('/products/basket')} className="w-full mb-3">Go to Seed Basket</Button>
            <Button variant="outline" onClick={() => navigate('/browse-orchards')} className="w-full">Browse Orchards</Button>
          </Card>
        </div>
      )
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md w-full animate-fade-in">
          <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-3 text-foreground">Your Basket is Empty</h2>
          <p className="mb-6 text-muted-foreground">Add some orchard pockets to your basket to continue.</p>
          <Button onClick={() => navigate('/browse-orchards')} className="w-full">Browse Orchards</Button>
        </Card>
      </div>
    )
  }


  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="container mx-auto max-w-5xl animate-fade-in">
        <div className="flex gap-3 mb-6">
          <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate("/browse-orchards")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Browse Orchards
          </Button>
        </div>
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Your Bestowal Basket 🛒</h1>
          <p className="text-muted-foreground">Review your selection and provide invoice details</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Basket Items */}
          <Card className="hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Basket Items ({getTotalItems()})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {basketItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-primary/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground truncate">{item.orchardTitle}</h4>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} × {Array.isArray(item.pockets) ? item.pockets.length : 0} pockets = {formatAmount(item.amount * item.quantity * (Array.isArray(item.pockets) ? item.pockets.length : 0))}
                    </p>
                    <p className="text-xs text-muted-foreground/80 truncate">
                      Pockets: {Array.isArray(item.pockets) ? item.pockets.join(', ') : (item.pockets || 'None')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
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
                      className="hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <div className="border-t border-border pt-4">
                <div className="flex justify-between items-center font-bold text-lg">
                  <span className="text-foreground">Total:</span>
                  <span className="text-primary">{formatAmount(getTotalAmount())}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Information */}
          <Card className="hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Invoice Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              
              <div className="pt-4 border-t border-border">
                <Button 
                  onClick={handleMakeItRain}
                  className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-bold py-3 transition-all hover:scale-[1.02] shadow-lg hover:shadow-xl"
                  size="lg"
                >
                  🌧️ Make It Rain! ({formatAmount(getTotalAmount())})
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Click to proceed to payment options
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Payment Modal — bestower chooses crypto (USDC) or PayPal. Walks the
          checkout queue one orchard at a time; see handleItemSuccess. */}
      {showPaymentModal && checkoutQueue[checkoutIndex] && (() => {
        const item = checkoutQueue[checkoutIndex]
        const pocketsCount = (Array.isArray(item.pockets) ? item.pockets.length : 1) * (item.quantity || 1)
        return (
          <QuickBestowModal
            open={showPaymentModal}
            onClose={handleModalClose}
            orchardId={item.orchardId}
            seedTitle={
              checkoutQueue.length > 1
                ? `${item.orchardTitle || 'Orchard'} (${checkoutIndex + 1} of ${checkoutQueue.length})`
                : (item.orchardTitle || 'Orchard')
            }
            pocketsCount={pocketsCount}
            defaultAmount={Number(item.amount || 0) * pocketsCount}
            lockAmount
            onSuccess={handleItemSuccess}
          />
        )
      })()}
    </div>
  )
}