import React from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { useWallet } from "../hooks/useWallet"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { WalletConnection } from "./WalletConnection"
import { Wallet, Shield, Lock } from "lucide-react"

export default function WalletProtectedRoute({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { connected, connecting, isPhantomAvailable } = useWallet()
  
  // Add debugging
  console.log('🔍 WalletProtectedRoute state:', {
    isAuthenticated,
    authLoading,
    connected,
    connecting,
    isPhantomAvailable: isPhantomAvailable()
  })
  
  // Show loading while auth is being checked
  if (authLoading) {
    console.log('⏳ WalletProtectedRoute: Auth loading...')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('❌ WalletProtectedRoute: Not authenticated, redirecting to login')
    return <Navigate to="/login" replace />
  }
  
  // If wallet is not connected, show mandatory wallet connection screen
  if (!connected && !connecting) {
    console.log('💰 WalletProtectedRoute: Wallet not connected, showing connection screen')
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-amber-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="bg-white/95 backdrop-blur-lg border-0 shadow-2xl">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                  <Wallet className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-xl text-blue-700 mb-2" style={{ fontFamily: "Playfair Display, serif" }}>
                Wallet Connection Required
              </CardTitle>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-green-600" />
                <span>Secure USDC transactions</span>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Lock className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Why is this required?</h3>
                    <p className="text-sm text-blue-700 leading-relaxed">
                      To participate in sow2grow's community and complete bestowals, you must connect your Phantom wallet. 
                      This ensures secure USDC transactions and protects your digital assets.
                    </p>
                  </div>
                </div>
              </div>
              
              <WalletConnection />
              
              <div className="text-center pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Your wallet connection is secure and encrypted
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }
  
  // Show connecting state
  if (connecting) {
    console.log('🔄 WalletProtectedRoute: Wallet connecting...')
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Connecting to your Phantom wallet...</p>
        </div>
      </div>
    )
  }
  
  // If wallet is connected, render the children
  console.log('✅ WalletProtectedRoute: All checks passed, rendering dashboard')
  return children
}