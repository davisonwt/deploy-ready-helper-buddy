import React, { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useRoles } from '@/hooks/useRoles'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Download, 
  Image, 
  Music, 
  FileText,
  Calendar,
  User,
  AlertCircle,
  Play
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function RadioSlotApprovalInterface() {
  const { user } = useAuth()
  const { isAdmin, isGosat } = useRoles()
  const { toast } = useToast()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [approvalNotes, setApprovalNotes] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [showFiles, setShowFiles] = useState([])

  // Check if user has permission
  const hasPermission = isAdmin || isGosat

  useEffect(() => {
    if (hasPermission) {
      fetchRequests()
    }
  }, [hasPermission])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      console.log('📻 Fetching radio slot requests...')
      
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
            avatar_url,
            bio,
            user_id
          )
        `)
        .eq('requires_review', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Radio slot requests query failed:', error)
        throw error
      }
      
      console.log('✅ Radio slot requests loaded:', data?.length || 0)
      
      // Fetch approver profiles separately if needed
      const requestsWithApproverInfo = []
      for (const request of data || []) {
        let approverProfile = null
        if (request.approved_by) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name, first_name, last_name')
            .eq('user_id', request.approved_by)
            .single()
          
          approverProfile = profileData
        }
        
        requestsWithApproverInfo.push({
          ...request,
          approver_profile: approverProfile
        })
      }
      
      setRequests(requestsWithApproverInfo)
      
    } catch (error) {
      console.error('❌ Error fetching requests:', error)
      // More specific error handling
      const errorMessage = error?.message || 'Failed to load radio slot requests'
      console.log('Error details:', {
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        message: error?.message
      })
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchShowFiles = async (scheduleId, showId) => {
    try {
      const { data, error } = await supabase
        .from('radio_show_files')
        .select('*')
        .eq('schedule_id', scheduleId)
        .eq('show_id', showId)

      if (error) throw error
      setShowFiles(data || [])
    } catch (error) {
      console.error('Error fetching show files:', error)
    }
  }

  const handleApprove = async () => {
    if (!selectedRequest) return

    try {
      setActionLoading(true)
      const { error } = await supabase.rpc('approve_radio_slot', {
        schedule_id_param: selectedRequest.id,
        approval_notes_param: approvalNotes || null
      })

      if (error) throw error

      toast({
        title: "Request Approved! ✅",
        description: `${selectedRequest.radio_djs.dj_name}'s radio slot has been approved.`,
      })

      setShowDetailsModal(false)
      setApprovalNotes('')
      fetchRequests()
    } catch (error) {
      console.error('Error approving request:', error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) return

    try {
      setActionLoading(true)
      const { error } = await supabase.rpc('reject_radio_slot', {
        schedule_id_param: selectedRequest.id,
        rejection_reason: rejectionReason
      })

      if (error) throw error

      toast({
        title: "Request Rejected",
        description: `${selectedRequest.radio_djs.dj_name}'s radio slot has been rejected.`,
      })

      setShowDetailsModal(false)
      setRejectionReason('')
      fetchRequests()
    } catch (error) {
      console.error('Error rejecting request:', error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setActionLoading(false)
    }
  }

  const openDetailsModal = async (request) => {
    setSelectedRequest(request)
    setShowDetailsModal(true)
    await fetchShowFiles(request.id, request.show_id)
  }

  const downloadFile = async (file) => {
    try {
      const { data, error } = await supabase.storage
        .from('radio-show-files')
        .download(file.file_path)

      if (error) throw error

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading file:', error)
      toast({
        title: "Download Failed",
        description: "Failed to download file",
        variant: "destructive"
      })
    }
  }

  const getFileIcon = (fileType, purpose) => {
    if (purpose.includes('image') || fileType === 'image') return Image
    if (purpose.includes('music') || fileType === 'audio') return Music
    return FileText
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Pending Review</Badge>
      case 'approved':
        return <Badge variant="default" className="text-green-600 bg-green-100 border-green-600">Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (!hasPermission) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
          <p className="text-muted-foreground">
            You need admin or gosat permissions to access this interface.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded-lg" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const pendingRequests = requests.filter(r => r.approval_status === 'pending')
  const approvedRequests = requests.filter(r => r.approval_status === 'approved')
  const rejectedRequests = requests.filter(r => r.approval_status === 'rejected')

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Radio Slot Request Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-3 gap-4 mb-6 bg-transparent p-0">
              <TabsTrigger 
                value="pending" 
                className="text-center p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-colors data-[state=active]:bg-orange-200 dark:data-[state=active]:bg-orange-900/40 data-[state=active]:border-orange-400 border-2 border-transparent"
              >
                <div className="text-2xl font-bold text-orange-600">{pendingRequests.length}</div>
                <div className="text-sm text-orange-600">Pending Review</div>
              </TabsTrigger>
              <TabsTrigger 
                value="approved" 
                className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg cursor-pointer hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors data-[state=active]:bg-green-200 dark:data-[state=active]:bg-green-900/40 data-[state=active]:border-green-400 border-2 border-transparent"
              >
                <div className="text-2xl font-bold text-green-600">{approvedRequests.length}</div>
                <div className="text-sm text-green-600">Approved</div>
              </TabsTrigger>
              <TabsTrigger 
                value="rejected" 
                className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors data-[state=active]:bg-red-200 dark:data-[state=active]:bg-red-900/40 data-[state=active]:border-red-400 border-2 border-transparent"
              >
                <div className="text-2xl font-bold text-red-600">{rejectedRequests.length}</div>
                <div className="text-sm text-red-600">Rejected</div>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="space-y-4">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4" />
                  <p>No pending requests to review</p>
                </div>
              ) : (
                pendingRequests.map((request) => (
                  <Card key={request.id} className="border-orange-200 dark:border-orange-800">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={request.radio_djs.avatar_url} />
                            <AvatarFallback>
                              <User className="h-6 w-6" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">{request.radio_shows.show_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              DJ {request.radio_djs.dj_name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Calendar className="h-3 w-3" />
                              <span className="text-xs">
                                {new Date(request.time_slot_date).toLocaleDateString()} at {String(request.hour_slot).padStart(2, '0')}:00
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(request.approval_status)}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDetailsModal(request)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="approved" className="space-y-4">
              {approvedRequests.map((request) => (
                <Card key={request.id} className="border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.radio_djs.avatar_url} />
                          <AvatarFallback>
                            <User className="h-6 w-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">{request.radio_shows.show_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            DJ {request.radio_djs.dj_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3" />
                            <span className="text-xs">
                              {new Date(request.time_slot_date).toLocaleDateString()} at {String(request.hour_slot).padStart(2, '0')}:00
                            </span>
                          </div>
                          {request.approved_at && (
                            <p className="text-xs text-green-600 mt-1">
                              Approved {new Date(request.approved_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(request.approval_status)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetailsModal(request)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-4">
              {rejectedRequests.map((request) => (
                <Card key={request.id} className="border-red-200 dark:border-red-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.radio_djs.avatar_url} />
                          <AvatarFallback>
                            <User className="h-6 w-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">{request.radio_shows.show_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            DJ {request.radio_djs.dj_name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Calendar className="h-3 w-3" />
                            <span className="text-xs">
                              {new Date(request.time_slot_date).toLocaleDateString()} at {String(request.hour_slot).padStart(2, '0')}:00
                            </span>
                          </div>
                          {request.approved_at && (
                            <p className="text-xs text-red-600 mt-1">
                              Rejected {new Date(request.approved_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(request.approval_status)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDetailsModal(request)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Radio Slot Request Details</DialogTitle>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-6">
              {/* Request Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={selectedRequest.radio_djs.avatar_url} />
                      <AvatarFallback>
                        <User className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3>{selectedRequest.radio_shows.show_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        DJ {selectedRequest.radio_djs.dj_name}
                      </p>
                    </div>
                    {getStatusBadge(selectedRequest.approval_status)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Schedule</Label>
                      <p className="text-sm">
                        {new Date(selectedRequest.time_slot_date).toLocaleDateString()} at {String(selectedRequest.hour_slot).padStart(2, '0')}:00-{String(selectedRequest.hour_slot + 2).padStart(2, '0')}:00
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Category</Label>
                      <p className="text-sm capitalize">{selectedRequest.radio_shows.category?.replace('_', ' ')}</p>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Subject/Topic</Label>
                    <p className="text-sm">{selectedRequest.radio_shows.subject}</p>
                  </div>

                  {selectedRequest.radio_shows.description && (
                    <div>
                      <Label className="text-sm font-medium">Description</Label>
                      <p className="text-sm">{selectedRequest.radio_shows.description}</p>
                    </div>
                  )}

                  {selectedRequest.radio_shows.topic_description && (
                    <div>
                      <Label className="text-sm font-medium">Episode Topic Description</Label>
                      <p className="text-sm">{selectedRequest.radio_shows.topic_description}</p>
                    </div>
                  )}

                  {selectedRequest.show_notes && (
                    <div>
                      <Label className="text-sm font-medium">Show Notes</Label>
                      <p className="text-sm">{selectedRequest.show_notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Uploaded Files */}
              {showFiles.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Uploaded Files ({showFiles.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {showFiles.map((file) => {
                        const Icon = getFileIcon(file.file_type, file.upload_purpose)
                        return (
                          <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <Icon className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{file.file_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {file.upload_purpose.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} • {(file.file_size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {file.file_type === 'audio' && (
                                <Button variant="outline" size="sm">
                                  <Play className="h-4 w-4" />
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => downloadFile(file)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action Buttons */}
              {selectedRequest.approval_status === 'pending' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Review Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label htmlFor="approval-notes">Approval Notes (Optional)</Label>
                        <Textarea
                          id="approval-notes"
                          placeholder="Add any notes for approval..."
                          value={approvalNotes}
                          onChange={(e) => setApprovalNotes(e.target.value)}
                        />
                        <Button 
                          className="w-full" 
                          onClick={handleApprove}
                          disabled={actionLoading}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {actionLoading ? "Approving..." : "Approve Request"}
                        </Button>
                      </div>
                      
                      <div className="space-y-3">
                        <Label htmlFor="rejection-reason">Rejection Reason (Required)</Label>
                        <Textarea
                          id="rejection-reason"
                          placeholder="Explain why this request is being rejected..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                        />
                        <Button 
                          variant="destructive" 
                          className="w-full"
                          onClick={handleReject}
                          disabled={actionLoading || !rejectionReason.trim()}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          {actionLoading ? "Rejecting..." : "Reject Request"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Previous Decision */}
              {selectedRequest.approval_status !== 'pending' && selectedRequest.approval_notes && (
                <Card>
                  <CardHeader>
                    <CardTitle>Decision Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedRequest.approval_notes}</p>
                    {selectedRequest.approved_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {selectedRequest.approval_status === 'approved' ? 'Approved' : 'Rejected'} on {new Date(selectedRequest.approved_at).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}