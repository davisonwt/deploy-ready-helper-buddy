import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { countries } from '@/data/countries'
import { Loader2, Check } from 'lucide-react'

export default function BillingInfoForm({ onSave, onCancel, initialData = {}, showSaveButton = true }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [billingInfo, setBillingInfo] = useState({
    billing_address_line1: '',
    billing_address_line2: '',
    billing_city: '',
    billing_state: '',
    billing_postal_code: '',
    billing_country: '',
    billing_phone: '',
    billing_email: user?.email || '',
    billing_organization: '',
    ...initialData
  })

  useEffect(() => {
    if (user && Object.keys(initialData).length === 0) {
      loadBillingInfo()
    }
  }, [user])

  const loadBillingInfo = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Get billing data from secure function
      const { data: billingData, error } = await supabase
        .rpc('get_user_billing_info', { target_user_id: user.id })

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching billing info:', error)
        return
      }

      if (billingData && billingData.length > 0) {
        const billing = billingData[0]
        setBillingInfo(prev => ({
          ...prev,
          billing_address_line1: billing.billing_address_line1 || '',
          billing_address_line2: billing.billing_address_line2 || '',
          billing_city: billing.billing_city || '',
          billing_state: billing.billing_state || '',
          billing_postal_code: billing.billing_postal_code || '',
          billing_country: billing.billing_country || '',
          billing_phone: billing.billing_phone || '',
          billing_email: billing.billing_email || user?.email || '',
          billing_organization: billing.billing_organization || ''
        }))
      }
    } catch (error) {
      console.error('Error loading billing info:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setBillingInfo(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name, value) => {
    setBillingInfo(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    if (!user) return

    // Validate required fields
    const requiredFields = ['billing_address_line1', 'billing_city', 'billing_postal_code', 'billing_country', 'billing_email']
    const missingFields = requiredFields.filter(field => !billingInfo[field]?.trim())
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields (marked with *)",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      // Use the secure update function
      const { error } = await supabase
        .rpc('update_user_billing_info', {
          target_user_id: user.id,
          p_billing_address_line1: billingInfo.billing_address_line1,
          p_billing_address_line2: billingInfo.billing_address_line2,
          p_billing_city: billingInfo.billing_city,
          p_billing_state: billingInfo.billing_state,
          p_billing_postal_code: billingInfo.billing_postal_code,
          p_billing_country: billingInfo.billing_country,
          p_billing_phone: billingInfo.billing_phone,
          p_billing_email: billingInfo.billing_email,
          p_billing_organization: billingInfo.billing_organization,
        })

      if (error) throw error

      toast({
        title: "Billing Information Saved",
        description: "Your billing information has been updated successfully.",
      })

      if (onSave) {
        onSave(billingInfo)
      }
    } catch (error) {
      console.error('Error saving billing info:', error)
      toast({
        title: "Error",
        description: "Failed to save billing information. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading && Object.keys(initialData).length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading billing information...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-foreground">
          Billing Information
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          This information will be used for invoices and delivery confirmations.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="billing_email">Email Address *</Label>
            <Input
              id="billing_email"
              name="billing_email"
              type="email"
              value={billingInfo.billing_email}
              onChange={handleInputChange}
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing_organization">Organization (Optional)</Label>
            <Input
              id="billing_organization"
              name="billing_organization"
              value={billingInfo.billing_organization}
              onChange={handleInputChange}
              placeholder="Company or organization name"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="billing_address_line1">Address Line 1 *</Label>
          <Input
            id="billing_address_line1"
            name="billing_address_line1"
            value={billingInfo.billing_address_line1}
            onChange={handleInputChange}
            placeholder="Street address"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="billing_address_line2">Address Line 2</Label>
          <Input
            id="billing_address_line2"
            name="billing_address_line2"
            value={billingInfo.billing_address_line2}
            onChange={handleInputChange}
            placeholder="Apartment, suite, unit, etc."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="billing_city">City *</Label>
            <Input
              id="billing_city"
              name="billing_city"
              value={billingInfo.billing_city}
              onChange={handleInputChange}
              placeholder="City"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing_state">State/Province</Label>
            <Input
              id="billing_state"
              name="billing_state"
              value={billingInfo.billing_state}
              onChange={handleInputChange}
              placeholder="State or province"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing_postal_code">Postal Code *</Label>
            <Input
              id="billing_postal_code"
              name="billing_postal_code"
              value={billingInfo.billing_postal_code}
              onChange={handleInputChange}
              placeholder="Postal code"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="billing_country">Country *</Label>
            <Select 
              value={billingInfo.billing_country} 
              onValueChange={(value) => handleSelectChange('billing_country', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="billing_phone">Phone Number</Label>
            <Input
              id="billing_phone"
              name="billing_phone"
              type="tel"
              value={billingInfo.billing_phone}
              onChange={handleInputChange}
              placeholder="Phone number"
            />
          </div>
        </div>

        {showSaveButton && (
          <div className="flex justify-end space-x-2 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="min-w-[120px]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Save Information
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}