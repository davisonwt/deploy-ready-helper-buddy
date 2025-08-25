import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Users, 
  Crown, 
  UserPlus, 
  Mic, 
  X,
  ChevronDown,
  Save,
  Play,
  Settings
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export function RoomCreationForm({ onRoomCreated, existingRoom = null }) {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [roomName, setRoomName] = useState(existingRoom?.name || '')
  const [description, setDescription] = useState(existingRoom?.description || '')
  const [maxParticipants, setMaxParticipants] = useState(existingRoom?.max_participants || 8)
  
  const [allUsers, setAllUsers] = useState([])
  const [admins, setAdmins] = useState(existingRoom?.admins || [])
  const [coHosts, setCoHosts] = useState(existingRoom?.co_hosts || [])
  const [startingGuests, setStartingGuests] = useState(existingRoom?.starting_guests || [])
  
  const [isLoading, setIsLoading] = useState(false)
  const [showAdminPopover, setShowAdminPopover] = useState(false)
  const [showCoHostPopover, setShowCoHostPopover] = useState(false)
  const [showGuestPopover, setShowGuestPopover] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, first_name, last_name')
        .neq('user_id', user?.id)
        .limit(100)

      if (error) throw error
      setAllUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const getUserInfo = (userId) => {
    return allUsers.find(u => u.user_id === userId) || {}
  }

  const addToRole = (userId, role) => {
    const userInfo = getUserInfo(userId)
    if (!userInfo.user_id) return

    // Remove from other roles first
    setAdmins(prev => prev.filter(id => id !== userId))
    setCoHosts(prev => prev.filter(id => id !== userId))
    setStartingGuests(prev => prev.filter(id => id !== userId))

    // Add to selected role
    if (role === 'admin') {
      setAdmins(prev => [...prev, userId])
    } else if (role === 'co_host') {
      setCoHosts(prev => [...prev, userId])
    } else if (role === 'guest') {
      setStartingGuests(prev => [...prev, userId])
    }
  }

  const removeFromRole = (userId, role) => {
    if (role === 'admin') {
      setAdmins(prev => prev.filter(id => id !== userId))
    } else if (role === 'co_host') {
      setCoHosts(prev => prev.filter(id => id !== userId))
    } else if (role === 'guest') {
      setStartingGuests(prev => prev.filter(id => id !== userId))
    }
  }

  const saveRoom = async () => {
    if (!roomName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a room name",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    try {
      const roomData = {
        name: roomName.trim(),
        description: description.trim(),
        max_participants: maxParticipants,
        admins: admins,
        co_hosts: coHosts,
        starting_guests: startingGuests,
        is_active: false
      }

      if (existingRoom?.id) {
        // Update existing room
        const { error } = await supabase
          .from('rooms')
          .update(roomData)
          .eq('id', existingRoom.id)

        if (error) throw error
      } else {
        // Create new room
        roomData.creator_id = user.id
        const { data, error } = await supabase
          .from('rooms')
          .insert(roomData)
          .select()
          .single()

        if (error) throw error
        roomData.id = data.id
      }

      toast({
        title: "Room saved!",
        description: `${roomName} has been saved successfully`,
      })

      onRoomCreated?.(roomData)
    } catch (error) {
      console.error('Error saving room:', error)
      toast({
        title: "Error",
        description: "Failed to save room",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const startLiveSession = async () => {
    await saveRoom()
    // TODO: Navigate to live session
    toast({
      title: "Starting live session...",
      description: "Opening your room for live conversation",
    })
  }

  const RoleCard = ({ title, users, role, onAdd, onRemove, icon: Icon, color, maxUsers }) => (
    <Card className={`border-2 ${color} backdrop-blur-sm`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            <CardTitle className="text-lg">{title}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {users.length}/{maxUsers || '∞'}
            </Badge>
          </div>
          
          <Popover open={role === 'admin' ? showAdminPopover : role === 'co_host' ? showCoHostPopover : showGuestPopover}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (role === 'admin') setShowAdminPopover(!showAdminPopover)
                  else if (role === 'co_host') setShowCoHostPopover(!showCoHostPopover)
                  else setShowGuestPopover(!showGuestPopover)
                }}
                disabled={maxUsers && users.length >= maxUsers}
                className="h-8 w-8 p-0"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <Command>
                <CommandInput placeholder="Search users..." />
                <CommandList>
                  <CommandEmpty>No users found.</CommandEmpty>
                  <CommandGroup>
                    <ScrollArea className="h-60">
                      {allUsers
                        .filter(u => !admins.includes(u.user_id) && !coHosts.includes(u.user_id) && !startingGuests.includes(u.user_id))
                        .map((u) => (
                        <CommandItem
                          key={u.user_id}
                          onSelect={() => {
                            onAdd(u.user_id, role)
                            if (role === 'admin') setShowAdminPopover(false)
                            else if (role === 'co_host') setShowCoHostPopover(false)
                            else setShowGuestPopover(false)
                          }}
                          className="flex items-center gap-3 p-3"
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={u.avatar_url} />
                            <AvatarFallback>
                              {(u.display_name || u.first_name || 'U')[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span>{u.display_name || `${u.first_name} ${u.last_name}` || 'Unknown User'}</span>
                        </CommandItem>
                      ))}
                    </ScrollArea>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {users.map(userId => {
            const userInfo = getUserInfo(userId)
            return (
              <div key={userId} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={userInfo.avatar_url} />
                    <AvatarFallback>
                      {(userInfo.display_name || userInfo.first_name || 'U')[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {userInfo.display_name || `${userInfo.first_name} ${userInfo.last_name}` || 'Unknown User'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(userId, role)}
                  className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )
          })}
          
          {users.length === 0 && (
            <div className="text-center py-8 text-white/50">
              <Icon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No {title.toLowerCase()} assigned</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
          {existingRoom ? 'Edit Room' : 'Create Your Room'}
        </h1>
        <p className="text-white/60">Set up your Clubhouse-style conversation space</p>
      </div>

      {/* Basic Room Settings */}
      <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Room Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roomName">Room Name *</Label>
              <Input
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="My Awesome Room"
                className="bg-white/5 border-white/10"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="maxParticipants">Max Participants</Label>
              <Input
                id="maxParticipants"
                type="number"
                min="2"
                max="50"
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 8)}
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this room about?"
              className="bg-white/5 border-white/10 min-h-[80px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Role Assignment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RoleCard
          title="Admins"
          users={admins}
          role="admin"
          onAdd={addToRole}
          onRemove={removeFromRole}
          icon={Crown}
          color="border-yellow-500/30 bg-yellow-500/5"
          maxUsers={3}
        />
        
        <RoleCard
          title="Co-hosts"
          users={coHosts}
          role="co_host"
          onAdd={addToRole}
          onRemove={removeFromRole}
          icon={Users}
          color="border-blue-500/30 bg-blue-500/5"
          maxUsers={5}
        />
        
        <RoleCard
          title="Starting Guests"
          users={startingGuests}
          role="guest"
          onAdd={addToRole}
          onRemove={removeFromRole}
          icon={Mic}
          color="border-green-500/30 bg-green-500/5"
          maxUsers={3}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          onClick={saveRoom}
          disabled={isLoading}
          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
        >
          <Save className="w-4 h-4 mr-2" />
          {existingRoom ? 'Update Room' : 'Save Room'}
        </Button>
        
        <Button
          onClick={startLiveSession}
          disabled={isLoading || !roomName.trim()}
          className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
        >
          <Play className="w-4 h-4 mr-2" />
          Start Live Session
        </Button>
      </div>
    </div>
  )
}