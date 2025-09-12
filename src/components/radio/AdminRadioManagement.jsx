import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Radio, 
  Check, 
  X, 
  Clock, 
  Calendar,
  User,
  MessageSquare,
  Volume2,
  Settings
} from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'

export default function AdminRadioManagement() {
  const { user } = useAuth()
  const [pendingSlots, setPendingSlots] = useState([])
  const [allSlots, setAllSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    fetchRadioSchedules()
  }, [])

  const fetchRadioSchedules = async () => {
    try {
      setLoading(true)
      
      // Fetch all radio schedule slots with DJ and show details
      const { data, error } = await supabase
        .from('radio_schedule')
        .select(`
          *,
          radio_shows (
            show_name,
            description,
            category,
            subject,
            topic_description
          ),
          radio_djs (
            dj_name,
            user_id,
            avatar_url
          )
        `)
        .order('time_slot_date', { ascending: true })
        .order('hour_slot', { ascending: true })

      if (error) throw error

      setAllSlots(data || [])
      setPendingSlots(data?.filter(slot => slot.approval_status === 'pending') || [])
    } catch (err) {
      console.error('Error fetching radio schedules:', err)
      toast.error('Failed to load radio schedules')
    } finally {
      setLoading(false)
    }
  }

  const approveSlot = async (slotId) => {
    try {
      const { error } = await supabase.rpc('approve_radio_schedule_slot', {
        schedule_id_param: slotId,
        approver_id_param: user.id
      })

      if (error) throw error

      toast.success('Time slot approved successfully!')
      await fetchRadioSchedules()
    } catch (err) {
      console.error('Error approving slot:', err)
      toast.error('Failed to approve time slot: ' + err.message)
    }
  }

  const rejectSlot = async (slotId) => {
    try {
      const { error } = await supabase.rpc('reject_radio_schedule_slot', {
        schedule_id_param: slotId,
        approver_id_param: user.id
      })

      if (error) throw error

      toast.success('Time slot rejected')
      await fetchRadioSchedules()
    } catch (err) {
      console.error('Error rejecting slot:', err)
      toast.error('Failed to reject time slot: ' + err.message)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>
      case 'approved':
        return <Badge variant="default" className="bg-green-600">Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDateTime = (date, hourSlot) => {
    const dateObj = new Date(date + 'T00:00:00')
    dateObj.setHours(hourSlot)
    return dateObj.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      hour12: true
    })
  }

  const filteredSlots = filterStatus === 'all' ? allSlots : allSlots.filter(slot => slot.approval_status === filterStatus)

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading radio schedules...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="w-full">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Radio Station Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 flex-1">
              <div className="flex items-center gap-3 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div>
                  <div className="text-2xl font-bold text-yellow-700">{pendingSlots.length}</div>
                  <div className="text-xs font-medium text-yellow-600 uppercase tracking-wide">Pending Approval</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <div className="text-2xl font-bold text-green-700">
                    {allSlots.filter(s => s.approval_status === 'approved').length}
                  </div>
                  <div className="text-xs font-medium text-green-600 uppercase tracking-wide">Approved</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div>
                  <div className="text-2xl font-bold text-red-700">
                    {allSlots.filter(s => s.approval_status === 'rejected').length}
                  </div>
                  <div className="text-xs font-medium text-red-600 uppercase tracking-wide">Rejected</div>
                </div>
              </div>
            </div>
            
            <div className="ml-6 shrink-0">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48 bg-background">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  <SelectItem value="all">All Slots</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule List */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Radio Schedule Slots</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSlots.length === 0 ? (
            <div className="text-center py-8">
              <Radio className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No radio slots found for the selected filter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSlots.map((slot) => (
                <div key={slot.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {formatDateTime(slot.time_slot_date, slot.hour_slot)}
                        </span>
                        {getStatusBadge(slot.approval_status)}
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold text-lg">
                            {slot.radio_shows?.show_name || 'Untitled Show'}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                            <User className="h-3 w-3" />
                            {slot.radio_djs?.dj_name || 'Unknown DJ'}
                          </div>
                          
                          {slot.radio_shows?.subject && (
                            <div className="mb-2">
                              <Badge variant="outline" className="text-xs">
                                {slot.radio_shows.subject}
                              </Badge>
                            </div>
                          )}
                          
                          {slot.radio_shows?.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {slot.radio_shows.description}
                            </p>
                          )}
                        </div>
                        
                        <div>
                          {slot.radio_shows?.topic_description && (
                            <div>
                              <h5 className="font-medium text-sm mb-1">Episode Topic:</h5>
                              <p className="text-sm text-muted-foreground line-clamp-3">
                                {slot.radio_shows.topic_description}
                              </p>
                            </div>
                          )}
                          
                          {slot.show_notes && (
                            <div className="mt-2">
                              <h5 className="font-medium text-sm mb-1">Show Notes:</h5>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {slot.show_notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSlot(slot)
                          setShowDetailsDialog(true)
                        }}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                      
                      {slot.approval_status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={async () => await approveSlot(slot.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={async () => await rejectSlot(slot.id)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      {selectedSlot && (
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Radio Slot Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date & Time</Label>
                  <p className="text-sm">
                    {formatDateTime(selectedSlot.time_slot_date, selectedSlot.hour_slot)}
                  </p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedSlot.approval_status)}
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Show Name</Label>
                <p className="text-sm">{selectedSlot.radio_shows?.show_name || 'N/A'}</p>
              </div>
              
              <div>
                <Label>DJ</Label>
                <p className="text-sm">{selectedSlot.radio_djs?.dj_name || 'N/A'}</p>
              </div>
              
              {selectedSlot.radio_shows?.subject && (
                <div>
                  <Label>Subject</Label>
                  <p className="text-sm">{selectedSlot.radio_shows.subject}</p>
                </div>
              )}
              
              {selectedSlot.radio_shows?.description && (
                <div>
                  <Label>Show Description</Label>
                  <p className="text-sm">{selectedSlot.radio_shows.description}</p>
                </div>
              )}
              
              {selectedSlot.radio_shows?.topic_description && (
                <div>
                  <Label>Episode Topic</Label>
                  <p className="text-sm">{selectedSlot.radio_shows.topic_description}</p>
                </div>
              )}
              
              {selectedSlot.show_notes && (
                <div>
                  <Label>Show Notes</Label>
                  <p className="text-sm">{selectedSlot.show_notes}</p>
                </div>
              )}
              
              {selectedSlot.approval_status === 'pending' && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={async () => {
                      await approveSlot(selectedSlot.id)
                      setShowDetailsDialog(false)
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Approve Slot
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      await rejectSlot(selectedSlot.id)
                      setShowDetailsDialog(false)
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reject Slot
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}