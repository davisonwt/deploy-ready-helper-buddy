import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Plus, 
  Users, 
  Eye, 
  Clock, 
  Crown,
  Mic,
  Play,
  Edit,
  Trash2,
  Star
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { RoomCreationForm } from '@/components/clubhouse/RoomCreationForm'
import { ClubhouseLiveSession } from '@/components/clubhouse/ClubhouseLiveSession'

export default function ClubhousePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState('discover')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [activeLiveSession, setActiveLiveSession] = useState(null)
  
  const [myRooms, setMyRooms] = useState([])
  const [activeRooms, setActiveRooms] = useState([])
  const [featuredRooms, setFeaturedRooms] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchMyRooms()
      fetchActiveRooms()
      fetchFeaturedRooms()
      setupRealtimeSubscriptions()
    }
  }, [user])

  const fetchMyRooms = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          participant_count:room_participants(count)
        `)
        .or(`creator_id.eq.${user.id},admins.cs.{${user.id}},co_hosts.cs.{${user.id}}`)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMyRooms(data || [])
    } catch (error) {
      console.error('Error fetching my rooms:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchActiveRooms = async () => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          creator:creator_id (display_name, avatar_url),
          participant_count:room_participants(count)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setActiveRooms(data || [])
    } catch (error) {
      console.error('Error fetching active rooms:', error)
    }
  }

  const fetchFeaturedRooms = async () => {
    try {
      // For now, just get the most popular rooms
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          creator:creator_id (display_name, avatar_url),
          participant_count:room_participants(count)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6)

      if (error) throw error
      setFeaturedRooms(data || [])
    } catch (error) {
      console.error('Error fetching featured rooms:', error)
    }
  }

  const setupRealtimeSubscriptions = () => {
    const roomsChannel = supabase
      .channel('rooms-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rooms'
      }, () => {
        fetchMyRooms()
        fetchActiveRooms()
        fetchFeaturedRooms()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(roomsChannel)
    }
  }

  const handleRoomCreated = (roomData) => {
    setShowCreateForm(false)
    setEditingRoom(null)
    fetchMyRooms()
    toast({
      title: "Room saved!",
      description: "Your room is ready for live sessions",
    })
  }

  const startLiveSession = async (roomData) => {
    try {
      // Activate the room
      const { error } = await supabase
        .from('rooms')
        .update({ is_active: true })
        .eq('id', roomData.id)

      if (error) throw error

      setActiveLiveSession(roomData)
      toast({
        title: "Live session started!",
        description: `${roomData.name} is now live`,
      })
    } catch (error) {
      console.error('Error starting live session:', error)
      toast({
        title: "Error",
        description: "Failed to start live session",
        variant: "destructive"
      })
    }
  }

  const endLiveSession = async () => {
    if (!activeLiveSession) return

    try {
      const { error } = await supabase
        .from('rooms')
        .update({ is_active: false })
        .eq('id', activeLiveSession.id)

      if (error) throw error

      setActiveLiveSession(null)
      fetchActiveRooms()
      toast({
        title: "Live session ended",
        description: "You've left the live session",
      })
    } catch (error) {
      console.error('Error ending live session:', error)
    }
  }

  const joinRoom = async (roomData) => {
    setActiveLiveSession(roomData)
  }

  const deleteRoom = async (roomId) => {
    if (!confirm('Are you sure you want to delete this room?')) return

    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', roomId)

      if (error) throw error
      
      fetchMyRooms()
      toast({
        title: "Room deleted",
        description: "Room has been permanently deleted",
      })
    } catch (error) {
      console.error('Error deleting room:', error)
      toast({
        title: "Error",
        description: "Failed to delete room",
        variant: "destructive"
      })
    }
  }

  const RoomCard = ({ room, showJoinButton = false, showControls = false }) => (
    <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:scale-105 transition-transform duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg text-white mb-1">{room.name}</CardTitle>
            {room.description && (
              <p className="text-sm text-white/60 line-clamp-2">{room.description}</p>
            )}
          </div>
          
          {room.is_active && (
            <Badge className="bg-red-500 text-white animate-pulse">
              LIVE
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 text-sm text-white/60">
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{room.participant_count?.[0]?.count || 0}/{room.max_participants}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{room.is_active ? 'Live' : 'Offline'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Avatar className="w-6 h-6">
              <AvatarImage src={room.creator?.avatar_url} />
              <AvatarFallback className="text-xs">
                {(room.creator?.display_name || 'H')[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-white/60">
              {room.creator?.display_name || 'Host'}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {showJoinButton && (
            <Button
              onClick={() => joinRoom(room)}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              <Mic className="w-4 h-4 mr-2" />
              Join Room
            </Button>
          )}
          
          {showControls && (
            <>
              <Button
                onClick={() => startLiveSession(room)}
                disabled={room.is_active}
                className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                <Play className="w-4 h-4 mr-2" />
                Go Live
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingRoom(room)}
                className="text-white/60 hover:text-white"
              >
                <Edit className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteRoom(room.id)}
                className="text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (activeLiveSession) {
    return (
      <ClubhouseLiveSession
        roomData={activeLiveSession}
        onEndSession={endLiveSession}
      />
    )
  }

  if (showCreateForm || editingRoom) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-6xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => {
              setShowCreateForm(false)
              setEditingRoom(null)
            }}
            className="mb-6 text-white/60 hover:text-white"
          >
            ← Back to Rooms
          </Button>
          
          <RoomCreationForm
            onRoomCreated={handleRoomCreated}
            existingRoom={editingRoom}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Clubhouse
          </h1>
          <p className="text-white/60">Drop-in audio conversations</p>
        </div>

        {/* Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 border-slate-700">
            <TabsTrigger value="discover" className="text-white">
              Discover
            </TabsTrigger>
            <TabsTrigger value="my-rooms" className="text-white">
              My Rooms
            </TabsTrigger>
            <TabsTrigger value="create" className="text-white">
              Create
            </TabsTrigger>
          </TabsList>

          {/* Discover Tab */}
          <TabsContent value="discover" className="space-y-8">
            {/* Featured Rooms */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Star className="w-5 h-5 text-yellow-400" />
                <h2 className="text-xl font-semibold text-white">Featured</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredRooms.map((room) => (
                  <RoomCard key={room.id} room={room} showJoinButton />
                ))}
              </div>
            </div>

            {/* Active Rooms */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <h2 className="text-xl font-semibold text-white">Live Now</h2>
              </div>
              
              <ScrollArea className="h-96">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeRooms.map((room) => (
                    <RoomCard key={room.id} room={room} showJoinButton />
                  ))}
                </div>
              </ScrollArea>
              
              {activeRooms.length === 0 && (
                <Card className="bg-slate-800/50 border-slate-700/50 p-8 text-center">
                  <Mic className="w-12 h-12 mx-auto mb-4 text-white/40" />
                  <p className="text-white/60">No live rooms at the moment</p>
                  <p className="text-white/40 text-sm">Be the first to start a conversation!</p>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* My Rooms Tab */}
          <TabsContent value="my-rooms" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">My Rooms</h2>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Room
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myRooms.map((room) => (
                <RoomCard key={room.id} room={room} showControls />
              ))}
            </div>
            
            {myRooms.length === 0 && (
              <Card className="bg-slate-800/50 border-slate-700/50 p-8 text-center">
                <Crown className="w-12 h-12 mx-auto mb-4 text-white/40" />
                <p className="text-white/60 mb-4">You haven't created any rooms yet</p>
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Room
                </Button>
              </Card>
            )}
          </TabsContent>

          {/* Create Tab */}
          <TabsContent value="create">
            <Card className="bg-slate-800/50 border-slate-700/50 p-8 text-center">
              <Crown className="w-16 h-16 mx-auto mb-4 text-orange-400" />
              <h3 className="text-xl font-semibold text-white mb-2">Start Your Own Room</h3>
              <p className="text-white/60 mb-6">
                Create a space for meaningful audio conversations with your community
              </p>
              <Button
                onClick={() => setShowCreateForm(true)}
                size="lg"
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Room
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}