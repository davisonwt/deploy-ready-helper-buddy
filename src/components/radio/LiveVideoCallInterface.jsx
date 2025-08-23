import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Crown,
  Shield,
  User,
  Settings,
  Plus,
  Search,
  UserPlus
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

export function LiveVideoCallInterface({ 
  liveSession, 
  activeHosts = [], 
  approvedGuests = [],
  currentUser,
  isHost = false,
  onHostsUpdate,
  onGuestsUpdate
}) {
  const { toast } = useToast()
  const [videoStates, setVideoStates] = useState({})
  const [audioStates, setAudioStates] = useState({})
  const [showUserSelector, setShowUserSelector] = useState(false)
  const [selectedSlotInfo, setSelectedSlotInfo] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [availableUsers, setAvailableUsers] = useState([])
  const videoRefs = useRef({})

  // Initialize video states for all participants
  useEffect(() => {
    const allParticipants = [...activeHosts, ...approvedGuests]
    const initialVideoStates = {}
    const initialAudioStates = {}
    
    allParticipants.forEach(participant => {
      const id = participant.id || participant.user_id
      initialVideoStates[id] = true
      initialAudioStates[id] = true
    })
    
    setVideoStates(initialVideoStates)
    setAudioStates(initialAudioStates)
  }, [activeHosts, approvedGuests])

  const toggleParticipantVideo = async (participantId) => {
    setVideoStates(prev => ({
      ...prev,
      [participantId]: !prev[participantId]
    }))
  }

  const toggleParticipantAudio = async (participantId) => {
    setAudioStates(prev => ({
      ...prev,
      [participantId]: !prev[participantId]
    }))
  }

  const searchAvailableUsers = async (query) => {
    if (!query.trim()) {
      setAvailableUsers([])
      return
    }

    try {
      const { data, error } = await supabase
        .rpc('search_user_profiles', { search_term: query })

      if (error) throw error
      
      // Filter out users who are already hosts
      const existingHostIds = activeHosts.map(h => h.user_id)
      const filteredUsers = (data || []).filter(user => 
        !existingHostIds.includes(user.user_id) && 
        user.user_id !== currentUser?.id
      )
      
      setAvailableUsers(filteredUsers)
    } catch (error) {
      console.error('Error searching users:', error)
      setAvailableUsers([])
    }
  }

  const handleSlotClick = (slotType, role = null) => {
    if (!isHost) return
    
    setSelectedSlotInfo({ slotType, role })
    setShowUserSelector(true)
    setSearchQuery('')
    setAvailableUsers([])
  }

  const assignUserToSlot = async (userId, displayName) => {
    if (!selectedSlotInfo || !liveSession?.id) return

    try {
      const { slotType, role } = selectedSlotInfo
      
      if (slotType === 'host') {
        // Add user as host with specified role
        const { error } = await supabase
          .from('radio_live_hosts')
          .insert({
            session_id: liveSession.id,
            user_id: userId,
            role: role || 'co_host'
          })

        if (error) throw error
        
        toast({
          title: "Host Added",
          description: `${displayName} has been added as ${role === 'admin' ? 'admin' : 'co-host'}`,
        })
        
        onHostsUpdate?.()
      }
      
      setShowUserSelector(false)
      setSelectedSlotInfo(null)
      setSearchQuery('')
      setAvailableUsers([])
      
    } catch (error) {
      console.error('Error assigning user to slot:', error)
      toast({
        title: "Error",
        description: "Failed to assign user to slot",
        variant: "destructive"
      })
    }
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'main_host':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'co_host':
        return <Shield className="h-4 w-4 text-blue-500" />
      case 'admin':
        return <Settings className="h-4 w-4 text-purple-500" />
      default:
        return <User className="h-4 w-4 text-gray-500" />
    }
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'main_host':
        return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30'
      case 'co_host':
        return 'bg-blue-500/20 text-blue-700 border-blue-500/30'
      case 'admin':
        return 'bg-purple-500/20 text-purple-700 border-purple-500/30'
      default:
        return 'bg-gray-500/20 text-gray-700 border-gray-500/30'
    }
  }

  const VideoPlaceholder = ({ participant, role = 'guest', isCurrentUser = false, isEmpty = false, onSlotClick }) => {
    const participantId = participant?.id || participant?.user_id || 'placeholder'
    const displayName = participant?.radio_djs?.dj_name || participant?.profiles?.display_name || 'Guest'
    const avatarUrl = participant?.radio_djs?.avatar_url || participant?.profiles?.avatar_url
    const isVideoOn = videoStates[participantId]
    const isAudioOn = audioStates[participantId]

    if (isEmpty) {
      return (
        <Card 
          className={`relative w-full h-48 border-dashed border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 overflow-hidden ${
            isHost ? 'cursor-pointer hover:border-primary hover:bg-primary/5 transition-all' : 'cursor-default'
          }`}
          onClick={isHost ? onSlotClick : undefined}
        >
          <CardContent className="h-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              {isHost ? (
                <>
                  <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">
                    {role === 'admin' ? 'Add Admin' : role === 'co_host' ? 'Add Co-Host' : `Guest Slot ${role}`}
                  </p>
                  <p className="text-xs">Click to assign</p>
                </>
              ) : (
                <>
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {role === 'admin' ? 'Admin Slot' : role === 'co_host' ? 'Co-Host Slot' : `Guest Slot ${role}`}
                  </p>
                  <p className="text-xs">Available</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className="relative w-full h-48 bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 overflow-hidden">
        <CardContent className="p-0 h-full relative">
          {/* Video placeholder or stream */}
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            {isVideoOn ? (
              <video
                ref={el => videoRefs.current[participantId] = el}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted={!isAudioOn}
              />
            ) : (
              <div className="flex flex-col items-center justify-center space-y-3">
                <Avatar className="h-16 w-16 border-2 border-gray-600">
                  <AvatarImage src={avatarUrl} alt={displayName} />
                  <AvatarFallback className="bg-gray-700 text-gray-300 text-lg">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <VideoOff className="h-6 w-6 text-gray-500" />
              </div>
            )}
          </div>

          {/* Overlay with participant info */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getRoleIcon(role)}
                <span className="text-white text-sm font-medium truncate">
                  {displayName}
                  {isCurrentUser && ' (You)'}
                </span>
                {role !== 'guest' && (
                  <Badge className={`text-xs ${getRoleBadgeColor(role)}`}>
                    {role.replace('_', ' ')}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-white hover:bg-white/20"
                  onClick={() => toggleParticipantAudio(participantId)}
                  disabled={!isCurrentUser && !isHost}
                >
                  {isAudioOn ? 
                    <Mic className="h-3 w-3" /> : 
                    <MicOff className="h-3 w-3 text-red-400" />
                  }
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-white hover:bg-white/20"
                  onClick={() => toggleParticipantVideo(participantId)}
                  disabled={!isCurrentUser && !isHost}
                >
                  {isVideoOn ? 
                    <Video className="h-3 w-3" /> : 
                    <VideoOff className="h-3 w-3 text-red-400" />
                  }
                </Button>
              </div>
            </div>
          </div>

          {/* Speaking indicator */}
          {isAudioOn && (
            <div className="absolute top-2 left-2">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Create co-host and admin slots
  const coHostSlots = 2 // Allow 2 co-hosts
  const adminSlots = 1 // Allow 1 admin
  const guestSlots = 3 // Allow 3 guests
  
  const coHosts = activeHosts.filter(host => host.role === 'co_host')
  const admins = activeHosts.filter(host => host.role === 'admin')
  const filledGuests = approvedGuests.slice(0, guestSlots)
  
  const emptyCoHostSlots = Math.max(0, coHostSlots - coHosts.length)
  const emptyAdminSlots = Math.max(0, adminSlots - admins.length)
  const emptyGuestSlots = Math.max(0, guestSlots - filledGuests.length)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Video className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Live Video Call</h3>
          <Badge variant="outline" className="bg-red-500/20 text-red-700 border-red-500/30">
            🔴 LIVE
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          {activeHosts.length + filledGuests.length} participants
        </div>
      </div>

      {/* Main host section */}
      {activeHosts.filter(host => host.role === 'main_host').map(host => (
        <div key={host.id} className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
            <Crown className="h-4 w-4 text-yellow-500" />
            <span>Moderator</span>
          </h4>
          <div className="w-full max-w-md">
            <VideoPlaceholder 
              participant={host} 
              role="main_host"
              isCurrentUser={host.user_id === currentUser?.id}
            />
          </div>
        </div>
      ))}

      {/* Co-hosts section */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
          <Shield className="h-4 w-4 text-blue-500" />
          <span>Co-Hosts ({coHosts.length}/{coHostSlots})</span>
        </h4>
        <div className="grid grid-cols-2 gap-4">
          {coHosts.map(host => (
            <VideoPlaceholder 
              key={host.id}
              participant={host} 
              role="co_host"
              isCurrentUser={host.user_id === currentUser?.id}
            />
          ))}
          
          {/* Empty co-host slots */}
          {Array.from({ length: emptyCoHostSlots }).map((_, index) => (
            <VideoPlaceholder 
              key={`empty-cohost-${index}`}
              isEmpty={true}
              role="co_host"
              onSlotClick={() => handleSlotClick('host', 'co_host')}
            />
          ))}
        </div>
      </div>

      {/* Admins section */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
          <Settings className="h-4 w-4 text-purple-500" />
          <span>Admins ({admins.length}/{adminSlots})</span>
        </h4>
        <div className="grid grid-cols-1 gap-4">
          {admins.map(host => (
            <VideoPlaceholder 
              key={host.id}
              participant={host} 
              role="admin"
              isCurrentUser={host.user_id === currentUser?.id}
            />
          ))}
          
          {/* Empty admin slots */}
          {Array.from({ length: emptyAdminSlots }).map((_, index) => (
            <VideoPlaceholder 
              key={`empty-admin-${index}`}
              isEmpty={true}
              role="admin"
              onSlotClick={() => handleSlotClick('host', 'admin')}
            />
          ))}
        </div>
      </div>

      {/* Guests section */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Guests ({filledGuests.length}/{guestSlots})</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Approved guests */}
          {filledGuests.map(guest => (
            <VideoPlaceholder 
              key={guest.id}
              participant={guest} 
              role="guest"
              isCurrentUser={guest.user_id === currentUser?.id}
            />
          ))}
          
          {/* Empty guest slots */}
          {Array.from({ length: emptyGuestSlots }).map((_, index) => (
            <VideoPlaceholder 
              key={`empty-guest-${index}`}
              isEmpty={true}
              role={filledGuests.length + index + 1}
            />
          ))}
        </div>
      </div>

      {/* User Selector Modal */}
      <Dialog open={showUserSelector} onOpenChange={setShowUserSelector}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add {selectedSlotInfo?.role === 'admin' ? 'Admin' : 'Co-Host'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  searchAvailableUsers(e.target.value)
                }}
                className="pl-10"
              />
            </div>
            
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {searchQuery && availableUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {searchQuery.length < 2 ? 'Type at least 2 characters to search' : 'No users found'}
                  </p>
                ) : (
                  availableUsers.map((user) => (
                    <Card 
                      key={user.user_id} 
                      className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      onClick={() => assignUserToSlot(user.user_id, user.display_name)}
                    >
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>
                            {user.display_name?.charAt(0)?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.display_name}</p>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}