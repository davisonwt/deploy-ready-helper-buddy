import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Copy, TrendingUp, Users, DollarSign } from "lucide-react"
import { toast } from "@/hooks/use-toast"

const CommissionDashboard = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: affiliateData, isLoading } = useQuery({
    queryKey: ['affiliate', user?.id],
    queryFn: async () => {
      if (!user) return null
      
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') throw error
      
      if (!data) {
        // Create affiliate if not exists
        const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase()
        const { data: newData, error: insertError } = await supabase
          .from('affiliates')
          .insert({
            user_id: user.id,
            referral_code: referralCode,
            earnings: 0,
            commission_rate: 10
          })
          .select()
          .single()
        
        if (insertError) throw insertError
        return newData
      }
      
      return data
    },
    enabled: !!user,
  })

  const { data: referrals = [] } = useQuery({
    queryKey: ['referrals', affiliateData?.id],
    queryFn: async () => {
      if (!affiliateData) return []
      
      const { data, error } = await supabase
        .from('referrals')
        .select(`*`)
        .eq('referrer_id', affiliateData.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!affiliateData,
  })

  const referralLink = `${window.location.origin}/register?ref=${affiliateData?.referral_code}`

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink)
    toast({
      title: "Link copied!",
      description: "Your referral link has been copied to clipboard",
    })
  }

  const totalEarnings = affiliateData?.earnings || 0
  const pendingEarnings = referrals.filter(r => r.status === 'pending').reduce((sum, r) => sum + (r.commission_amount || 0), 0)
  const totalReferrals = referrals.length

  if (isLoading) {
    return <div className="text-center py-8">Loading commission dashboard...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Commission Dashboard</h1>
        <Badge variant="secondary" className="text-lg px-3 py-1">
          {affiliateData?.commission_rate}% Commission Rate
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ${pendingEarnings.toFixed(2)} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReferrals}</div>
            <p className="text-xs text-muted-foreground">
              Active referrals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalReferrals > 0 ? ((referrals.filter(r => r.status === 'completed').length / totalReferrals) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Successful conversions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Link */}
      <Card>
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center space-x-2">
          <Input 
            value={referralLink} 
            readOnly 
            className="flex-1"
          />
          <Button onClick={copyLink} size="icon">
            <Copy className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Referrals Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No referrals yet. Share your link to start earning commissions!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Orchard</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referrals.map((referral) => (
                  <TableRow key={referral.id}>
                    <TableCell>
                      User #{referral.referred_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      {referral.orchard_id ? `Orchard ${referral.orchard_id.slice(0, 8)}` : 'General Signup'}
                    </TableCell>
                    <TableCell>
                      ${referral.commission_amount?.toFixed(2) || '0.00'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={referral.status === 'completed' ? 'default' : 'secondary'}
                      >
                        {referral.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(referral.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default CommissionDashboard