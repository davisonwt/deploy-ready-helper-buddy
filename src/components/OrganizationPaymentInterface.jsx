import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { QrCode, Copy, ExternalLink, Download, Wallet, Heart } from 'lucide-react';
import { useOrganizationWallet } from '@/hooks/useOrganizationWallet';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';

export function OrganizationPaymentInterface() {
  const {
    organizationWallet,
    loading,
    openPhantomPayment,
    generatePaymentUrl,
    supportedTokens
  } = useOrganizationWallet();
  
  const { toast } = useToast();
  const [selectedToken, setSelectedToken] = useState('SOL');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  useEffect(() => {
    if (organizationWallet?.wallet_address) {
      generateQRCode();
    }
  }, [organizationWallet, selectedToken, amount, memo]);

  const generateQRCode = async () => {
    if (!organizationWallet?.wallet_address) return;
    
    try {
      let qrData = organizationWallet.wallet_address;
      
      // Create Solana Pay URL for QR code
      if (amount || memo) {
        const params = new URLSearchParams();
        params.append('recipient', organizationWallet.wallet_address);
        
        if (selectedToken !== 'SOL') {
          const tokenMint = getTokenMintAddress(selectedToken);
          if (tokenMint) params.append('spl-token', tokenMint);
        }
        
        if (amount) params.append('amount', amount);
        if (memo) params.append('memo', memo);
        
        qrData = `https://solanapay.com/?${params.toString()}`;
      }
      
      const qrCodeUrl = await QRCode.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrCodeDataUrl(qrCodeUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive"
      });
    }
  };

  const getTokenMintAddress = (symbol) => {
    const tokenMints = {
      'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
    };
    return tokenMints[symbol];
  };

  const copyToClipboard = async (text, description = "copied to clipboard") => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: `${description}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const downloadQRCode = () => {
    if (qrCodeDataUrl) {
      const link = document.createElement('a');
      link.download = `sow2grow-payment-qr-${selectedToken}.png`;
      link.href = qrCodeDataUrl;
      link.click();
    }
  };

  const handlePayNow = () => {
    const numAmount = amount ? parseFloat(amount) : null;
    openPhantomPayment(selectedToken, numAmount, memo);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!organizationWallet) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center text-red-600">
            Wallet Not Configured
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            The organization wallet has not been set up yet. Please contact an administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      {/* Header */}
      <Card>
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Heart className="h-6 w-6 text-red-500" />
            <CardTitle className="text-2xl">Support Sow2Grow</CardTitle>
          </div>
          <p className="text-muted-foreground">
            Send payments to support our mission using Phantom wallet and Solana blockchain
          </p>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Token Selection */}
            <div className="space-y-2">
              <Label htmlFor="token">Select Token</Label>
              <Select value={selectedToken} onValueChange={setSelectedToken}>
                <SelectTrigger>
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  {supportedTokens.map((token) => (
                    <SelectItem key={token} value={token}>
                      {token}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (Optional)</Label>
              <Input
                id="amount"
                type="number"
                step="0.000001"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {/* Memo (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="memo">Message/Memo (Optional)</Label>
              <Textarea
                id="memo"
                placeholder="Add a message to your payment"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                maxLength={32} // Solana memo limit
              />
              <p className="text-xs text-muted-foreground">
                {memo.length}/32 characters
              </p>
            </div>

            <Separator />

            {/* Wallet Address */}
            <div className="space-y-2">
              <Label>Wallet Address</Label>
              <div className="flex gap-2">
                <Input
                  value={organizationWallet.wallet_address}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(organizationWallet.wallet_address, "Wallet address copied")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Pay Now Button */}
            <Button 
              onClick={handlePayNow}
              className="w-full"
              size="lg"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Phantom & Pay Now
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Clicking "Pay Now" will open Phantom wallet with pre-filled transaction details
            </p>
          </CardContent>
        </Card>

        {/* QR Code Display */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              {qrCodeDataUrl && (
                <div className="bg-white p-4 rounded-lg border">
                  <img 
                    src={qrCodeDataUrl} 
                    alt="Payment QR Code" 
                    className="w-64 h-64"
                  />
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={downloadQRCode}
                  disabled={!qrCodeDataUrl}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download QR
                </Button>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(
                    generatePaymentUrl(selectedToken, amount, memo) || organizationWallet.wallet_address,
                    "Payment link copied"
                  )}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>How to use:</strong></p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open Phantom wallet on your mobile device</li>
                <li>Tap the scan QR code button</li>
                <li>Point camera at the QR code above</li>
                <li>Review transaction details and confirm</li>
              </ol>
            </div>

            {/* Supported Tokens */}
            <div className="space-y-2">
              <Label>Supported Tokens:</Label>
              <div className="flex flex-wrap gap-2">
                {supportedTokens.map((token) => (
                  <Badge key={token} variant="secondary">
                    {token}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Mobile Payment (Recommended)</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Install Phantom wallet from App Store/Play Store</li>
                <li>Set up your wallet with SOL or supported tokens</li>
                <li>Scan the QR code or tap "Pay Now" button</li>
                <li>Review and confirm the transaction</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Desktop Payment</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Install Phantom browser extension</li>
                <li>Click "Pay Now" to open Phantom</li>
                <li>Review the pre-filled transaction details</li>
                <li>Confirm and send the payment</li>
              </ol>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Transaction fees on Solana are extremely low (typically less than $0.01). 
              All payments are processed securely on the Solana blockchain.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}