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
  Settings,
  DollarSign,
  Calculator,
  Wallet
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { InteractiveSection } from './InteractiveSection'

export function RoomCreationForm({ onRoomCreated, existingRoom = null }) {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [roomName, setRoomName] = useState(existingRoom?.name || '')
  const [description, setDescription] = useState(existingRoom?.description || '')
  const [maxParticipants, setMaxParticipants] = useState(existingRoom?.max_participants || 8)
  const [sessionType, setSessionType] = useState('free') // 'free' or 'paid'
  const [bestowedAmount, setBestowedAmount] = useState(0)
  const [hostAmount, setHostAmount] = useState(0)
  const [platformFee, setPlatformFee] = useState(0)
  const [serviceFee, setServiceFee] = useState(0)
  
  const [allUsers, setAllUsers] = useState([])
  const [admins, setAdmins] = useState(existingRoom?.admins || [])
  const [coHosts, setCoHosts] = useState(existingRoom?.co_hosts || [])
  const [startingGuests, setStartingGuests] = useState(existingRoom?.starting_guests || [])
  
  const [isLoading, setIsLoading] = useState(false)
  const [showAdminPopover, setShowAdminPopover] = useState(false)
  const [showCoHostPopover, setShowCoHostPopover] = useState(false)
  const [showGuestPopover, setShowGuestPopover] = useState(false)

  // Calculate fees when bestowal amount changes
  useEffect(() => {
    if (bestowedAmount > 0) {
      const platform = bestowedAmount * 0.10 // 10%
      const service = bestowedAmount * 0.005 // 0.5%
      const host = bestowedAmount - platform - service

      setPlatformFee(platform)
      setServiceFee(service)
      setHostAmount(host)
    } else {
      setPlatformFee(0)
      setServiceFee(0)
      setHostAmount(0)
    }
  }, [bestowedAmount])

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
        is_active: false,
        session_type: sessionType,
        bestowal_amount: sessionType === 'paid' ? bestowedAmount : 0,
        platform_fee: sessionType === 'paid' ? platformFee : 0,
        service_fee: sessionType === 'paid' ? serviceFee : 0,
        host_amount: sessionType === 'paid' ? hostAmount : 0
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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
          {existingRoom ? 'Edit Room' : 'Create Your Clubhouse Room'}
        </h1>
        <p className="text-white/60">Design your live session by configuring each section</p>
      </div>

      {/* Room Configuration Header */}
      <Card className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this room about?"
                className="bg-white/5 border-white/10"
              />
            </div>
          </div>

          {/* Session Type Toggle */}
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="flex bg-slate-800/50 rounded-lg p-1">
              <button
                onClick={() => setSessionType('free')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  sessionType === 'free'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                Free Session
              </button>
              <button
                onClick={() => setSessionType('paid')}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                  sessionType === 'paid'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                    : 'text-white/60 hover:text-white/80'
                }`}
              >
                Premium Session
              </button>
            </div>
          </div>

          {/* Bestowal Configuration for Paid Sessions */}
          {sessionType === 'paid' && (
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-purple-500/20">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bestowedAmount" className="text-purple-300">Bestowal Amount (USDC)</Label>
                  <Input
                    id="bestowedAmount"
                    type="number"
                    min="1"
                    step="0.01"
                    value={bestowedAmount}
                    onChange={(e) => setBestowedAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                
                <div className="flex flex-col justify-center">
                  <span className="text-green-300 text-sm">Host Gets:</span>
                  <span className="font-bold text-green-400">${hostAmount.toFixed(2)}</span>
                </div>
                
                <div className="flex flex-col justify-center">
                  <span className="text-blue-300 text-sm">Platform (10%):</span>
                  <span className="font-bold text-blue-400">${platformFee.toFixed(2)}</span>
                </div>
                
                <div className="flex flex-col justify-center">
                  <span className="text-orange-300 text-sm">Service (0.5%):</span>
                  <span className="font-bold text-orange-400">${serviceFee.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interactive Clubhouse Layout */}
      <Card className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-center">
            Live Session Layout Preview
            <p className="text-sm text-white/60 font-normal mt-1">Hover over sections to configure roles and participants</p>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          
          {/* Host Section */}
          <div className="text-center mb-8">
            <InteractiveSection
              title="Host Section"
              description="You'll be here as the main host"
              icon={Crown}
              color="border-yellow-500/50 bg-yellow-500/10"
              users={[]} // Host is always current user
              role="host"
              isHostSection={true}
              sessionType={sessionType}
              bestowedAmount={bestowedAmount}
            />
          </div>

          {/* Admins Row */}
          <div className="mb-8">
            <h3 className="text-center text-white/80 text-sm mb-4">Admin Positions (Max 3)</h3>
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              {[0, 1, 2].map((index) => (
                <InteractiveSection
                  key={`admin-${index}`}
                  title={`Admin ${index + 1}`}
                  description="Room moderator"
                  icon={Crown}
                  color="border-yellow-500/30 bg-yellow-500/5"
                  users={admins}
                  role="admin"
                  onAdd={addToRole}
                  onRemove={removeFromRole}
                  allUsers={allUsers}
                  getUserInfo={getUserInfo}
                  position={index}
                />
              ))}
            </div>
          </div>

          {/* Co-hosts Row */}
          <div className="mb-8">
            <h3 className="text-center text-white/80 text-sm mb-4">Co-host Positions (Max 5)</h3>
            <div className="grid grid-cols-5 gap-3 max-w-2xl mx-auto">
              {[0, 1, 2, 3, 4].map((index) => (
                <InteractiveSection
                  key={`cohost-${index}`}
                  title={`Co-host ${index + 1}`}
                  description="Assistant host"
                  icon={Users}
                  color="border-blue-500/30 bg-blue-500/5"
                  users={coHosts}
                  role="co_host"
                  onAdd={addToRole}
                  onRemove={removeFromRole}
                  allUsers={allUsers}
                  getUserInfo={getUserInfo}
                  position={index}
                />
              ))}
            </div>
          </div>

          {/* Starting Guests Row */}
          <div className="mb-8">
            <h3 className="text-center text-white/80 text-sm mb-4">Starting Guest Speakers (Max 3)</h3>
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              {[0, 1, 2].map((index) => (
                <InteractiveSection
                  key={`guest-${index}`}
                  title={`Guest ${index + 1}`}
                  description="Pre-approved speaker"
                  icon={Mic}
                  color="border-green-500/30 bg-green-500/5"
                  users={startingGuests}
                  role="guest"
                  onAdd={addToRole}
                  onRemove={removeFromRole}
                  allUsers={allUsers}
                  getUserInfo={getUserInfo}
                  position={index}
                />
              ))}
            </div>
          </div>

          {/* Audience Section */}
          <div className="border-t border-white/10 pt-6">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-700/50 border-2 border-slate-600/50 rounded-full mb-3">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">Audience Section</h3>
              <p className="text-sm text-white/60">
                {sessionType === 'paid' && bestowedAmount > 0 
                  ? `Listeners who contribute $${bestowedAmount} USDC can request to speak`
                  : 'Anyone can join and request to speak'
                }
              </p>
              <div className="mt-2 text-xs text-white/40">
                Max capacity: {maxParticipants} total participants
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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