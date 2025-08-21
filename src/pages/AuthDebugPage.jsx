import React, { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { useNavigate } from 'react-router-dom'

export default function AuthDebugPage() {
  const { user, session, loading, isAuthenticated } = useAuth()
  const [debugInfo, setDebugInfo] = useState({})
  const navigate = useNavigate()
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        
        setDebugInfo({
          hookUser: user,
          hookSession: session,
          hookLoading: loading,
          hookIsAuthenticated: isAuthenticated,
          directSession: currentSession,
          directUser: currentUser,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        console.error('Auth debug error:', error)
        setDebugInfo({ error: error.message })
      }
    }
    
    checkAuth()
  }, [user, session, loading, isAuthenticated])
  
  return (
    <div className="min-h-screen bg-background p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Authentication Debug Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={() => navigate('/dashboard')}>
              Go to Dashboard (Test)
            </Button>
            
            <Button onClick={() => navigate('/login')}>
              Go to Login
            </Button>
            
            <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}