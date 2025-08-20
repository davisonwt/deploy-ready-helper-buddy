import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Hand, Mic } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export function GuestRequestModal({ open, onClose, liveSession }) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [requestMessage, setRequestMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submitGuestRequest = async () => {
    if (!user || !liveSession) return

    try {
      setSubmitting(true)

      const { error } = await supabase
        .from('radio_guest_requests')
        .insert({
          session_id: liveSession.id,
          user_id: user.id,
          request_message: requestMessage.trim() || null
        })

      if (error) throw error

      toast({
        title: "Request Submitted",
        description: "Your guest request has been sent to the hosts!",
      })

      setRequestMessage('')
      onClose()

    } catch (error) {
      console.error('Error submitting guest request:', error)
      toast({
        title: "Error",
        description: "Failed to submit guest request",
        variant: "destructive"
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hand className="h-5 w-5" />
            Request to Join as Guest
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Mic className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Join the Conversation</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Request to speak with the hosts live on air. You'll be able to ask questions, 
                  share your thoughts, or participate in the discussion.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message to Hosts (optional)</Label>
            <Textarea
              id="message"
              placeholder="Let the hosts know what you'd like to talk about..."
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              {requestMessage.length}/200 characters
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={submitGuestRequest}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? 'Submitting...' : 'Send Request'}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}