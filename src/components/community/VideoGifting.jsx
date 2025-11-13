import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Heart, DollarSign, Wallet, CreditCard } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { FiatOnRamp } from '@/components/FiatOnRamp'

export default function VideoGifting({ video, onGiftSent }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [amount, setAmount] = useState(5)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [open, setOpen] = useState(false)
  const [showTopUp, setShowTopUp] = useState(false)

  // Wallet integration removed - placeholder values
  const connected = false
  const balance = 0
  const formatUSDC = (val) => Number(val).toFixed(2)

  const isOwner = user && video.uploader_id === user.id

  // Calculate fees: 10.5% total to sow2grow
  const sow2growFee = amount * 0.105
  const creatorAmount = amount - sow2growFee

  const handleGift = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to send gifts",
        variant: "destructive"
      })
      navigate('/login')
      return
    }

    toast({
      title: "Feature Unavailable",
      description: "Video gifting requires wallet configuration. Please contact admin.",
      variant: "destructive"
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white border-0 shadow-md"
          onClick={(e) => e.stopPropagation()}
        >
          <Heart className="h-4 w-4 mr-1" />
          Love Video
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-600" />
            Send Love Gift to Creator
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!user ? (
            <div className="space-y-4">
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4 text-center">
                  <Heart className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-blue-800 mb-3">Login to send love gifts to creators</p>
                  <Button 
                    onClick={() => navigate('/login')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Login Now
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-4">
              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4 text-center">
                  <Wallet className="h-8 w-8 mx-auto mb-2 text-amber-600" />
                  <p className="text-amber-800 mb-3">Video gifting requires wallet setup</p>
                  <p className="text-sm text-muted-foreground">
                    Configure your Binance Pay wallet in Wallet Settings to send gifts
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
