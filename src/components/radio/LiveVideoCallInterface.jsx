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
  Settings
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

export function LiveVideoCallInterface({ 
  liveSession, 
  activeHosts = [], 
  approvedGuests = [],
  currentUser,
  isHost = false 
}) {
  const { toast } = useToast()
  const [videoStates, setVideoStates] = useState({})
  const [audioStates, setAudioStates] = useState({})
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

  const VideoPlaceholder = ({ participant, role = 'guest', isCurrentUser = false }) => {
    const participantId = participant?.id || participant?.user_id || 'placeholder'
    const displayName = participant?.radio_djs?.dj_name || participant?.profiles?.display_name || 'Guest'
    const avatarUrl = participant?.radio_djs?.avatar_url || participant?.profiles?.avatar_url
    const isVideoOn = videoStates[participantId]
    const isAudioOn = audioStates[participantId]

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

  // Create empty guest slots
  const guestSlots = 3
  const filledGuests = approvedGuests.slice(0, guestSlots)
  const emptySlots = Math.max(0, guestSlots - filledGuests.length)

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

      {/* Co-hosts and admins grid */}
      {activeHosts.filter(host => host.role !== 'main_host').length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Co-hosts & Admins</h4>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {activeHosts
              .filter(host => host.role !== 'main_host')
              .map(host => (
                <VideoPlaceholder 
                  key={host.id}
                  participant={host} 
                  role={host.role}
                  isCurrentUser={host.user_id === currentUser?.id}
                />
              ))
            }
          </div>
        </div>
      )}

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
          {Array.from({ length: emptySlots }).map((_, index) => (
            <Card key={`empty-${index}`} className="w-full h-48 bg-gray-100 dark:bg-gray-800 border-dashed border-2 border-gray-300 dark:border-gray-600">
              <CardContent className="h-full flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Guest Slot {filledGuests.length + index + 1}</p>
                  <p className="text-xs">Available</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}