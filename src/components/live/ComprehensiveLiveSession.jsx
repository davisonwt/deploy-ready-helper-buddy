import React, { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Video,
  VideoOff,
  Mic,
  MicOff,
  Heart,
  Gift,
  Camera,
  Share,
  Send,
  ChevronDown,
  Star,
  DollarSign,
  Crown,
  X,
  Upload,
  FileText,
  Users,
  Eye,
  Settings,
  UserPlus,
  Hand,
  ChevronRight,
  MoreVertical
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useGamification } from '@/hooks/useGamification'

export function ComprehensiveLiveSession({ 
  sessionData, 
  sessionType = 'chat', 
  onEndSession, 
  onLeaveSession 
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  const { createNotification } = useGamification()
  
  // Core state
  const [participants, setParticipants] = useState([])
  const [messages, setMessages] = useState([])
  const [callQueue, setCallQueue] = useState([])
  const [guestRequests, setGuestRequests] = useState([])
  const [listeners, setListeners] = useState([])
  const [sessionDocuments, setSessionDocuments] = useState([])
  const [activeDocument, setActiveDocument] = useState(null)
  
  // UI state
  const [newMessage, setNewMessage] = useState('')
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [showGiftsMenu, setShowGiftsMenu] = useState(false)
  const [showDocumentViewer, setShowDocumentViewer] = useState(false)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [viewerCount, setViewerCount] = useState(0)
  
  // Session info
  const [isHost, setIsHost] = useState(false)
  const [coHosts, setCoHosts] = useState([])
  const [currentGuest, setCurrentGuest] = useState(null)
  const [sessionInfo, setSessionInfo] = useState(null)
  const [hasRequestedToSpeak, setHasRequestedToSpeak] = useState(false)
  const [channels, setChannels] = useState([])
  const chatRef = useRef(null)
  const fileInputRef = useRef(null)

  // Initialize session and check permissions
  useEffect(() => {
    if (sessionData && user) {
      initializeSession()
      checkHostPermissions()
      setupRealtimeSubscriptions()
      fetchInitialData()
    }

    return () => {
      cleanupSubscriptions()
    }
  }, [sessionData, user])

  const initializeSession = async () => {
    try {
      // Determine session type and setup accordingly
      if (sessionType === 'radio') {
        await initializeRadioSession()
      } else if (sessionType === 'chat') {
        await initializeChatSession()
      } else {
        await initializeGenericSession()
      }
    } catch (error) {
      console.error('Error initializing session:', error)
    }
  }

  const initializeRadioSession = async () => {
    // For radio sessions, integrate with existing radio infrastructure
    setSessionInfo({
      id: sessionData.id,
      title: sessionData.title || 'Live Radio Session',
      type: 'radio',
      created_by: sessionData.created_by
    })
  }

  const initializeChatSession = async () => {
    setSessionInfo({
      id: sessionData.room_id || sessionData.id,
      title: sessionData.name || sessionData.title || 'Live Chat Session',
      type: 'chat',
      created_by: sessionData.created_by
    })
  }

  const initializeGenericSession = async () => {
    setSessionInfo({
      id: sessionData.id,
      title: sessionData.title || 'Live Session',
      type: 'generic',
      created_by: sessionData.created_by
    })
  }

  const checkHostPermissions = async () => {
    try {
      const isSessionHost = sessionData.created_by === user?.id
      
      // Server-side role verification using RPC
      const { data: hasAdminRole, error } = await supabase
        .rpc('has_role', { role_name: 'admin' })
      
      if (error) {
        console.error('Error checking admin role:', error)
        setIsHost(isSessionHost) // Fallback to session host only
        return
      }
      
      const { data: hasGosatRole } = await supabase
        .rpc('has_role', { role_name: 'gosat' })
      
      setIsHost(isSessionHost || hasAdminRole || hasGosatRole)
    } catch (error) {
      console.error('Error in checkHostPermissions:', error)
      setIsHost(sessionData.created_by === user?.id)
    }
  }

  const fetchInitialData = async () => {
    try {
      await Promise.all([
        fetchParticipants(),
        fetchMessages(),
        fetchCallQueue(),
        fetchGuestRequests(),
        fetchListeners(),
        fetchSessionDocuments(),
        checkUserRequestStatus()
      ])
    } catch (error) {
      console.error('Error fetching initial data:', error)
    }
  }

  const checkUserRequestStatus = async () => {
    if (!sessionInfo || !user) return
    
    try {
      const { data, error } = await supabase
        .from('radio_guest_requests')
        .select('*')
        .eq('session_id', sessionInfo.id)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single()

      if (data && !error) {
        setHasRequestedToSpeak(true)
      }
    } catch (error) {
      // No pending request found, which is fine
    }
  }

  const fetchListeners = async () => {
    if (!sessionInfo) return
    
    try {
      const { data, error } = await supabase
        .from('session_listeners')
        .select('*')
        .eq('session_id', sessionInfo.id)
        .eq('is_active', true)
        .order('joined_at', { ascending: true })

      if (error) throw error
      setListeners(data || [])
      setViewerCount((data || []).length)
    } catch (error) {
      console.error('Error fetching listeners:', error)
    }
  }

  const fetchSessionDocuments = async () => {
    if (!sessionInfo) return
    
    try {
      const { data, error } = await supabase
        .from('session_documents')
        .select('*')
        .eq('session_id', sessionInfo.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSessionDocuments(data || [])
      
      if (data && data.length > 0 && !activeDocument) {
        setActiveDocument(data[0])
        setCurrentPage(data[0].current_page || 1)
      }
    } catch (error) {
      console.error('Error fetching session documents:', error)
    }
  }

  const joinAsListener = async () => {
    if (!sessionInfo || !user) return

    try {
      const { error } = await supabase
        .from('session_listeners')
        .upsert({
          session_id: sessionInfo.id,
          user_id: user.id,
          display_name: user.user_metadata?.display_name || 'Anonymous',
          avatar_url: user.user_metadata?.avatar_url,
          is_active: true,
          last_seen: new Date().toISOString()
        })

      if (error) throw error
      await awardPoints('joining live session', 3)
      fetchListeners()
    } catch (error) {
      console.error('Error joining as listener:', error)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file || !sessionInfo) return

    try {
      // Upload file to storage
      const fileName = `${sessionInfo.id}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('session-documents')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Create document record
      const { error: dbError } = await supabase
        .from('session_documents')
        .insert({
          session_id: sessionInfo.id,
          uploader_id: user.id,
          file_name: file.name,
          file_path: fileName,
          file_type: file.type,
          file_size: file.size,
          total_pages: file.type.includes('pdf') ? 1 : 1 // Default to 1, could be calculated
        })

      if (dbError) throw dbError

      await awardPoints('sharing a document', 10)
      fetchSessionDocuments()
      toast({
        title: "Document uploaded!",
        description: `${file.name} has been shared (+10 points!)`,
      })
      
      setShowUploadDialog(false)
    } catch (error) {
      console.error('Error uploading file:', error)
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const changeDocumentPage = async (newPage) => {
    if (!activeDocument || !isHost) return

    try {
      const { error } = await supabase.rpc('update_document_page', {
        document_id_param: activeDocument.id,
        new_page: newPage
      })

      if (error) throw error
      setCurrentPage(newPage)
      
      // Update local state immediately
      setActiveDocument(prev => ({
        ...prev,
        current_page: newPage
      }))
    } catch (error) {
      console.error('Error changing page:', error)
    }
  }

  const fetchParticipants = async () => {
    // Mock participants for now - replace with real data
    const mockParticipants = [
      {
        id: '1',
        user_id: user?.id,
        display_name: user?.user_metadata?.display_name || 'You',
        avatar_url: user?.user_metadata?.avatar_url,
        role: isHost ? 'host' : 'participant',
        is_video_enabled: true,
        is_audio_enabled: true,
        joined_at: new Date(),
        is_speaking: false
      }
    ]
    setParticipants(mockParticipants)
  }

  const fetchMessages = async () => {
    if (sessionType === 'radio' && sessionData.id) {
      try {
        const { data, error } = await supabase
          .from('radio_live_messages')
          .select('*')
          .eq('session_id', sessionData.id)
          .order('created_at', { ascending: true })
          .limit(50)

        if (error) throw error
        setMessages(data || [])
      } catch (error) {
        console.error('Error fetching messages:', error)
      }
    }
  }

  const fetchCallQueue = async () => {
    if (sessionType === 'radio' && sessionData.id) {
      try {
        const { data, error } = await supabase
          .from('radio_call_queue')
          .select('*')
          .eq('session_id', sessionData.id)
          .eq('status', 'waiting')
          .order('created_at', { ascending: true })

        if (error) throw error
        setCallQueue(data || [])
      } catch (error) {
        console.error('Error fetching call queue:', error)
      }
    }
  }

  const fetchGuestRequests = async () => {
    if (sessionType === 'radio' && sessionData.id) {
      try {
        const { data, error } = await supabase
          .from('radio_guest_requests')
          .select('*')
          .eq('session_id', sessionData.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })

        if (error) throw error
        setGuestRequests(data || [])
      } catch (error) {
        console.error('Error fetching guest requests:', error)
      }
    }
  }

  const updateViewerCount = async () => {
    // Mock viewer count - replace with real-time data
    setViewerCount(Math.floor(Math.random() * 500) + 50)
  }

  const setupRealtimeSubscriptions = () => {
    if (!sessionInfo) return

    const newChannels = []

    // Messages subscription for all session types
    const messagesChannel = supabase
      .channel(`session-messages-${sessionInfo.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: sessionType === 'radio' ? 'radio_live_messages' : 'live_session_messages',
        filter: `session_id=eq.${sessionInfo.id}`
      }, () => {
        fetchMessages()
      })
      .subscribe()
    newChannels.push(messagesChannel)

    // Guest requests subscription for radio sessions
    if (sessionType === 'radio') {
      const requestsChannel = supabase
        .channel(`radio-requests-${sessionInfo.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'radio_guest_requests',
          filter: `session_id=eq.${sessionInfo.id}`
        }, () => {
          fetchGuestRequests()
          checkUserRequestStatus()
        })
        .subscribe()
      newChannels.push(requestsChannel)

      // Call queue subscription
      const queueChannel = supabase
        .channel(`radio-queue-${sessionInfo.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'radio_call_queue',
          filter: `session_id=eq.${sessionInfo.id}`
        }, () => {
          fetchCallQueue()
        })
        .subscribe()
      newChannels.push(queueChannel)
    }

    // Listeners subscription for all session types
    const listenersChannel = supabase
      .channel(`session-listeners-${sessionInfo.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_listeners',
        filter: `session_id=eq.${sessionInfo.id}`
      }, () => {
        fetchListeners()
      })
      .subscribe()
    newChannels.push(listenersChannel)

    // Documents subscription for all session types
    const documentsChannel = supabase
      .channel(`session-documents-${sessionInfo.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_documents',
        filter: `session_id=eq.${sessionInfo.id}`
      }, (payload) => {
        fetchSessionDocuments()
        
        // If document page changed, update all viewers
        if (payload.eventType === 'UPDATE' && payload.new.current_page !== payload.old?.current_page) {
          if (activeDocument?.id === payload.new.id) {
            setCurrentPage(payload.new.current_page)
            setActiveDocument(prev => ({
              ...prev,
              current_page: payload.new.current_page
            }))
          }
        }
      })
      .subscribe()
    newChannels.push(documentsChannel)

    setChannels(newChannels)

    // Auto-join as listener when session starts
    setTimeout(() => {
      if (user && !listeners.some(l => l.user_id === user.id)) {
        joinAsListener()
      }
    }, 1000)
  }

  const cleanupSubscriptions = () => {
    channels.forEach(channel => {
      supabase.removeChannel(channel)
    })
    setChannels([])
  }

  // Awards points for participation actions
  const awardPoints = async (action, points) => {
    try {
      await createNotification(
        'points_earned',
        `+${points} points!`,
        `You earned ${points} points for ${action}`,
      )
    } catch (error) {
      console.error('Error awarding points:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !sessionInfo) return

    try {
      let insertData = {
        session_id: sessionInfo.id,
        sender_id: user.id,
        content: newMessage.trim(),
        message_type: 'message'
      }

      if (sessionType === 'radio') {
        // Insert into radio_live_messages for radio sessions
        const { error } = await supabase
          .from('radio_live_messages')
          .insert({
            session_id: sessionInfo.id,
            sender_id: user.id,
            message: newMessage.trim(),
            message_type: 'text'
          })
        if (error) throw error
      } else {
        // Insert into live_session_messages for other session types
        const { error } = await supabase
          .from('live_session_messages')
          .insert(insertData)
        if (error) throw error
      }

      // Add to local messages immediately for better UX
      const newMsg = {
        id: Date.now().toString(),
        sender_id: user.id,
        message: newMessage.trim(),
        content: newMessage.trim(),
        created_at: new Date().toISOString(),
        profiles: {
          display_name: user.user_metadata?.display_name || user.email || 'You',
          avatar_url: user.user_metadata?.avatar_url
        }
      }
      setMessages(prev => [...prev, newMsg])
      setNewMessage('')

      // Award points for messaging
      await awardPoints('sending a message', 2)

      // Scroll to bottom
      setTimeout(() => {
        if (chatRef.current) {
          chatRef.current.scrollTop = chatRef.current.scrollHeight
        }
      }, 100)
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      })
    }
  }

  const joinCallQueue = async () => {
    if (!sessionInfo) return

    try {
      if (sessionType === 'radio') {
        const { error } = await supabase
          .from('radio_call_queue')
          .insert({
            session_id: sessionInfo.id,
            user_id: user.id,
            topic: 'General discussion',
            status: 'waiting'
          })

        if (error) throw error
      }

      // Award points for joining queue
      await awardPoints('joining the call queue', 5)

      toast({
        title: "Joined Queue",
        description: "You've been added to the call queue (+5 points!)",
      })
    } catch (error) {
      console.error('Error joining queue:', error)
    }
  }

  const sendGift = async (giftType) => {
    const points = giftType === 'usdc' ? 20 : giftType === 'hearts' ? 5 : 10
    await awardPoints(`sending ${giftType}`, points)
    
    toast({
      title: `${giftType} sent!`,
      description: `+${points} points earned!`,
      duration: 2000
    })
    setShowGiftsMenu(false)
  }

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled)
    toast({
      title: isVideoEnabled ? "Camera turned off" : "Camera turned on",
      duration: 2000
    })
  }

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled)
    toast({
      title: isAudioEnabled ? "Microphone muted" : "Microphone unmuted",
      duration: 2000
    })
  }

  // Create numbered queue slots (1-8)
  const queueSlots = Array.from({ length: 8 }, (_, i) => {
    const queueNumber = i + 1
    const queueEntry = callQueue[i]
    return {
      number: queueNumber,
      participant: queueEntry || null
    }
  })

  const requestToSpeak = async () => {
    if (!sessionInfo || !user || hasRequestedToSpeak) return
    
    try {
      const { error } = await supabase
        .from('radio_guest_requests')
        .insert({
          session_id: sessionInfo.id,
          user_id: user.id,
          request_message: 'Requesting to speak'
        })

      if (error) throw error
      
      setHasRequestedToSpeak(true)
      toast({
        title: "Request sent!",
        description: "Host will review your request to speak",
      })
    } catch (error) {
      console.error('Error requesting to speak:', error)
      toast({
        title: "Error",
        description: "Failed to send speaking request",
        variant: "destructive"
      })
    }
  }

  const approveGuestRequest = async (requestId, userId) => {
    if (!isHost) return
    
    try {
      // Approve the request
      const { error: updateError } = await supabase
        .from('radio_guest_requests')
        .update({ 
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (updateError) throw updateError

      // Move user to guest slot
      await moveToGuestSlot(userId)
      
      toast({
        title: "Request approved!",
        description: "Guest has been invited to speak",
      })
    } catch (error) {
      console.error('Error approving request:', error)
      toast({
        title: "Error",
        description: "Failed to approve request",
        variant: "destructive"
      })
    }
  }

  const rejectGuestRequest = async (requestId) => {
    if (!isHost) return
    
    try {
      const { error } = await supabase
        .from('radio_guest_requests')
        .update({ 
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (error) throw error
      
      toast({
        title: "Request rejected",
        description: "Guest request has been declined",
      })
    } catch (error) {
      console.error('Error rejecting request:', error)
    }
  }

  const moveToGuestSlot = async (userId) => {
    const userProfile = listeners.find(l => l.user_id === userId)
    if (userProfile) {
      setCurrentGuest({
        user_id: userProfile.user_id,
        display_name: userProfile.display_name,
        avatar_url: userProfile.avatar_url
      })
    }
  }

  const promoteToCoHost = async (userId) => {
    if (!isHost) return
    
    const userProfile = listeners.find(l => l.user_id === userId)
    if (userProfile && coHosts.length < 3) {
      setCoHosts(prev => [...prev, {
        user_id: userProfile.user_id,
        display_name: userProfile.display_name,
        avatar_url: userProfile.avatar_url
      }])
      
      toast({
        title: "User promoted!",
        description: `${userProfile.display_name} is now a co-host`,
      })
    }
  }

  const removeFromStage = (userId, type) => {
    if (!isHost) return
    
    if (type === 'guest') {
      setCurrentGuest(null)
      toast({
        title: "Guest removed",
        description: "Guest has been moved back to audience",
      })
    } else if (type === 'cohost') {
      setCoHosts(prev => prev.filter(ch => ch.user_id !== userId))
      toast({
        title: "Co-host removed",
        description: "Co-host has been moved back to audience",
      })
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex overflow-hidden z-50">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-black/20 backdrop-blur-sm border-b border-white/10 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-white font-medium">LIVE</span>
            </div>
            <span className="text-white/80 text-lg">{sessionInfo?.title || 'Live Session'}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 text-sm text-white/60">
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>{listeners.length}</span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onLeaveSession}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex w-full pt-20">
        {/* Left Panel - Stage */}
        <div className="flex-1 p-6 flex flex-col">
          {/* Main Stage */}
          <div className="flex-1 flex flex-col justify-center max-w-4xl mx-auto w-full">
            {/* Host and Guest Section */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Host */}
              <Card className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border-blue-500/30 backdrop-blur-sm overflow-hidden group hover:scale-105 transition-transform duration-200">
                <div className="aspect-video relative">
                  <div className="absolute top-4 left-4 z-10">
                    <Badge className="bg-yellow-500 text-black font-medium px-3 py-1">
                      <Crown className="w-3 h-3 mr-1" />
                      Host
                    </Badge>
                  </div>
                  
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500/10 to-purple-500/10">
                    {isVideoEnabled ? (
                      <div className="text-6xl">🎥</div>
                    ) : (
                      <Avatar className="w-32 h-32 border-4 border-blue-400">
                        <AvatarImage src={user?.user_metadata?.avatar_url} />
                        <AvatarFallback className="text-4xl bg-blue-600 text-white">
                          {user?.user_metadata?.display_name?.[0] || 'H'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                      <p className="text-white font-medium truncate">
                        {user?.user_metadata?.display_name || 'Host'}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Guest */}
              <Card className="bg-gradient-to-br from-green-600/20 to-teal-600/20 border-green-500/30 backdrop-blur-sm overflow-hidden group hover:scale-105 transition-transform duration-200">
                <div className="aspect-video relative">
                  <div className="absolute top-4 left-4 z-10">
                    <Badge className="bg-green-500 text-white font-medium px-3 py-1">
                      Guest
                    </Badge>
                  </div>
                  
                  {/* Host Controls */}
                  {isHost && currentGuest && (
                    <div className="absolute top-4 right-4 z-10">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromStage(currentGuest.user_id, 'guest')}
                        className="h-6 w-6 p-0 bg-red-500/20 hover:bg-red-500/40 text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  
                  <div className="w-full h-full flex items-center justify-center">
                    {currentGuest ? (
                      <Avatar className="w-32 h-32 border-4 border-green-400">
                        <AvatarImage src={currentGuest.avatar_url} />
                        <AvatarFallback className="text-4xl bg-green-600 text-white">
                          {currentGuest.display_name?.[0] || 'G'}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="text-center">
                        <div className="text-6xl mb-4">👋</div>
                        <p className="text-white/60">Waiting for guest</p>
                      </div>
                    )}
                  </div>
                  
                  {currentGuest && (
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                        <p className="text-white font-medium truncate">
                          {currentGuest.display_name}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Co-hosts Row */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[0, 1, 2].map((index) => {
                const coHost = coHosts[index]
                return (
                  <Card key={index} className="bg-white/5 border-white/10 backdrop-blur-sm h-32 overflow-hidden group">
                    <div className="relative h-full">
                      <div className="absolute top-2 left-2 z-10">
                        <Badge variant="secondary" className="bg-blue-500/80 text-white text-xs px-2 py-1">
                          Co-host
                        </Badge>
                      </div>
                      
                      {/* Host Controls */}
                      {isHost && coHost && (
                        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFromStage(coHost.user_id, 'cohost')}
                            className="h-6 w-6 p-0 bg-red-500/20 hover:bg-red-500/40 text-red-400"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                      
                      <div className="h-full flex items-center justify-center">
                        {coHost ? (
                          <Avatar className="w-16 h-16 border-2 border-blue-400">
                            <AvatarImage src={coHost.avatar_url} />
                            <AvatarFallback className="bg-blue-600 text-white">
                              {coHost.display_name?.[0] || 'C'}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="text-white/30 text-sm">Empty</div>
                        )}
                      </div>
                      
                      {coHost && (
                        <div className="absolute bottom-2 left-2 right-2">
                          <div className="bg-black/50 backdrop-blur-sm rounded px-2 py-1">
                            <p className="text-white text-xs truncate">
                              {coHost.display_name}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-auto">
            <Button
              variant="ghost"
              size="lg"
              onClick={toggleAudio}
              className={`w-14 h-14 rounded-full ${
                isAudioEnabled 
                  ? 'bg-white/10 hover:bg-white/20' 
                  : 'bg-red-500/80 hover:bg-red-500'
              }`}
            >
              {isAudioEnabled ? 
                <Mic className="w-6 h-6 text-white" /> : 
                <MicOff className="w-6 h-6 text-white" />
              }
            </Button>
            
            <Button
              variant="ghost"
              size="lg"
              onClick={toggleVideo}
              className={`w-14 h-14 rounded-full ${
                isVideoEnabled 
                  ? 'bg-white/10 hover:bg-white/20' 
                  : 'bg-red-500/80 hover:bg-red-500'
              }`}
            >
              {isVideoEnabled ? 
                <Video className="w-6 h-6 text-white" /> : 
                <VideoOff className="w-6 h-6 text-white" />
              }
            </Button>

            {!isHost && (
              <Button
                onClick={requestToSpeak}
                disabled={hasRequestedToSpeak}
                className={`${
                  hasRequestedToSpeak 
                    ? 'bg-yellow-600 hover:bg-yellow-700' 
                    : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600'
                } text-white px-6 py-3 rounded-full`}
              >
                <Hand className="w-5 h-5 mr-2" />
                {hasRequestedToSpeak ? 'Request Pending...' : 'Request to Speak'}
              </Button>
            )}

            <div className="relative">
              <Button
                onClick={() => setShowGiftsMenu(!showGiftsMenu)}
                variant="ghost"
                className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20"
              >
                <Gift className="w-6 h-6 text-white" />
              </Button>
              
              {showGiftsMenu && (
                <Card className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur-sm border-slate-600 p-3 min-w-48">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => sendGift('hearts')}
                      className="flex items-center gap-2 text-red-400 hover:bg-red-500/20"
                    >
                      <Heart className="w-4 h-4" />
                      Hearts
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => sendGift('usdc')}
                      className="flex items-center gap-2 text-green-400 hover:bg-green-500/20"
                    >
                      <DollarSign className="w-4 h-4" />
                      USDC
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => sendGift('stars')}
                      className="flex items-center gap-2 text-yellow-400 hover:bg-yellow-500/20"
                    >
                      <Star className="w-4 h-4" />
                      Stars
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => sendGift('gifts')}
                      className="flex items-center gap-2 text-purple-400 hover:bg-purple-500/20"
                    >
                      <Gift className="w-4 h-4" />
                      Gifts
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Chat & Audience */}
        <div className="w-96 border-l border-white/10 bg-black/20 backdrop-blur-sm flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-white/10">
            <h3 className="text-white font-medium">Live Chat</h3>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full p-4" ref={chatRef}>
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-3">
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarImage src={msg.profiles?.avatar_url} />
                      <AvatarFallback className="bg-slate-600 text-white text-xs">
                        {msg.profiles?.display_name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white/80 text-sm font-medium truncate">
                          {msg.profiles?.display_name || 'User'}
                        </span>
                      </div>
                      <p className="text-white/90 text-sm break-words">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <Button
                onClick={sendMessage}
                disabled={!newMessage.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Audience & Requests Panel */}
          <div className="border-t border-white/10">
            {/* Guest Requests (Host Only) */}
            {isHost && guestRequests.length > 0 && (
              <div className="p-4 border-b border-white/10">
                <h4 className="text-white/80 text-sm font-medium mb-3">Speaking Requests</h4>
                <div className="space-y-2">
                  {guestRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={request.profiles?.avatar_url} />
                          <AvatarFallback className="bg-slate-600 text-white text-xs">
                            {request.profiles?.display_name?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-white/90 text-sm">
                          {request.profiles?.display_name}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => approveGuestRequest(request.id, request.user_id)}
                          className="bg-green-600 hover:bg-green-700 h-6 px-2 text-xs"
                        >
                          ✓
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => rejectGuestRequest(request.id)}
                          variant="ghost"
                          className="text-red-400 hover:bg-red-500/20 h-6 px-2 text-xs"
                        >
                          ✗
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audience List */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white/80 text-sm font-medium">
                  Audience ({listeners.length})
                </h4>
                {isHost && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white/60 hover:text-white hover:bg-white/10"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <ScrollArea className="h-32">
                <div className="space-y-1">
                  {listeners.map((listener) => (
                    <div key={listener.id} className="flex items-center justify-between group py-1">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={listener.avatar_url} />
                          <AvatarFallback className="bg-slate-600 text-white text-xs">
                            {listener.display_name?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-white/70 text-sm truncate">
                          {listener.display_name}
                        </span>
                      </div>
                      
                      {isHost && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => promoteToCoHost(listener.user_id)}
                            className="h-6 px-2 text-blue-400 hover:bg-blue-500/20"
                          >
                            <UserPlus className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx"
        onChange={handleFileUpload}
        className="hidden"
      />

    </div>
  )
}