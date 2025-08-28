import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Heart, DollarSign, Wallet } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useWallet } from '@/hooks/useWallet'
import { useUSDCPayments } from '@/hooks/useUSDCPayments'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

export default function VideoGifting({ video, onGiftSent }) {
  const { user } = useAuth()
  const { connected, balance } = useWallet()
  const { processBestowPart, formatUSDC, isWalletReady } = useUSDCPayments()
  const { toast } = useToast()
  const [amount, setAmount] = useState(5)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [open, setOpen] = useState(false)

  const isOwner = user && video.uploader_id === user.id

  // Calculate fees (10% + 0.5% to sow2grow)
  const platformFee = amount * 0.10
  const sow2growFee = amount * 0.005
  const totalFees = platformFee + sow2growFee
  const creatorAmount = amount - totalFees

  const handleGift = async () => {
    if (!user || !connected || amount < 1 || amount > 10) {
      toast({
        title: "Invalid Gift",
        description: "Please enter an amount between 1 and 10 USDC",
        variant: "destructive"
      })
      return
    }

    if (balance < amount) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough USDC for this gift",
        variant: "destructive"
      })
      return
    }

    setSending(true)
    try {
      // Get creator's wallet address
      const { data: creatorWallet, error: walletError } = await supabase
        .from('user_wallets')
        .select('wallet_address')
        .eq('user_id', video.uploader_id)
        .eq('is_active', true)
        .single()

      if (walletError || !creatorWallet) {
        toast({
          title: "Gift Failed",
          description: "Creator hasn't set up their wallet yet",
          variant: "destructive"
        })
        return
      }

      // Get platform wallet
      const { data: platformWallet, error: platformError } = await supabase
        .rpc('get_payment_wallet_address')
        .single()

      if (platformError || !platformWallet) {
        toast({
          title: "Gift Failed",
          description: "Platform wallet not available",
          variant: "destructive"
        })
        return
      }

      // Process payment to creator
      const creatorPayment = await processBestowPart({
        amount: creatorAmount,
        recipient_address: creatorWallet.wallet_address,
        orchard_id: null, // This is a direct gift, not orchard-related
        notes: `Video gift: ${video.title} - ${message || 'Great video!'}`
      })

      if (!creatorPayment.success) {
        throw new Error(creatorPayment.error)
      }

      // Process fees to platform (if totalFees > 0)
      if (totalFees > 0) {
        await processBestowPart({
          amount: totalFees,
          recipient_address: platformWallet.wallet_address,
          orchard_id: null,
          notes: `Platform fees for video gift - Video: ${video.title}`
        })
      }

      // Record the gift in database
      const { error: giftError } = await supabase
        .from('video_gifts')
        .insert({
          video_id: video.id,
          giver_id: user.id,
          receiver_id: video.uploader_id,
          amount: amount,
          creator_amount: creatorAmount,
          platform_fee: platformFee,
          sow2grow_fee: sow2growFee,
          message: message || 'Great video!',
          transaction_hash: creatorPayment.signature,
          payment_status: 'completed'
        })

      if (giftError) {
        console.error('Error recording gift:', giftError)
      }

      toast({
        title: "Gift Sent! 🎉",
        description: `Successfully sent ${formatUSDC(amount)} to the creator!`
      })

      setOpen(false)
      setAmount(5)
      setMessage('')
      
      if (onGiftSent) {
        onGiftSent()
      }

    } catch (error) {
      console.error('Gift error:', error)
      toast({
        title: "Gift Failed",
        description: error.message || "Failed to send gift. Please try again.",
        variant: "destructive"
      })
    } finally {
      setSending(false)
    }
  }

  // Don't show gift button for video owner
  if (isOwner || !user) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 px-2 text-pink-600 hover:text-pink-700 hover:bg-pink-50"
          onClick={(e) => e.stopPropagation()}
        >
          <Heart className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-600" />
            Send a Gift to Creator
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!connected ? (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4 text-center">
                <Wallet className="h-8 w-8 mx-auto mb-2 text-amber-600" />
                <p className="text-amber-800 mb-3">Connect your wallet to send gifts</p>
                <Button variant="outline" className="border-amber-600 text-amber-600">
                  Connect Wallet
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Support the creator of "{video.title}"
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your balance: {formatUSDC(balance)}
                </p>
              </div>

              <div>
                <Label htmlFor="gift-amount">Gift Amount (1-10 USDC)</Label>
                <Input
                  id="gift-amount"
                  type="number"
                  min="1"
                  max="10"
                  step="0.5"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="gift-message">Optional Message</Label>
                <Input
                  id="gift-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Great video! Keep it up!"
                  className="mt-1"
                />
              </div>

              {/* Fee Breakdown */}
              <Card className="bg-muted/50">
                <CardContent className="p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Creator receives:</span>
                    <span className="font-medium text-green-600">{formatUSDC(creatorAmount)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Platform fee (10%):</span>
                    <span>{formatUSDC(platformFee)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Sow2Grow fee (0.5%):</span>
                    <span>{formatUSDC(sow2growFee)}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span>{formatUSDC(amount)}</span>
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={handleGift}
                disabled={sending || !isWalletReady || amount < 1 || amount > 10}
                className="w-full bg-pink-600 hover:bg-pink-700"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                {sending ? 'Sending Gift...' : `Send ${formatUSDC(amount)} Gift`}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}