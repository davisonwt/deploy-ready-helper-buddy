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
  Wallet,
  Plus,
  Hand
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
        type: 'clubhouse', // Set the type to clubhouse
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
    
    // Create a live session with the room data
    const sessionData = {
      name: roomName.trim(),
      description: description.trim(),
      type: 'clubhouse',
      session_type: sessionType,
      bestowal_amount: sessionType === 'paid' ? bestowedAmount : 0,
      creator_name: user?.email || 'Host',
      is_active: true
    }
    
    // Pass the session data to the parent to start the live session
    onRoomCreated?.(sessionData)
    
    toast({
      title: "Live session started!",
      description: "Your clubhouse room is now live",
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

  // Format currency helper
  const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-white/20 p-6 rounded-t-2xl">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              {existingRoom ? 'Edit Clubhouse Room' : 'Create Clubhouse Room'}
            </h1>
            <p className="text-white/70 text-lg">Design your live audio conversation space</p>
          </div>
        </div>

        <div className="p-6 space-y-8">
          
          {/* Basic Room Configuration */}
          <Card className="bg-white/5 border-white/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-xl flex items-center gap-2">
                <Crown className="w-6 h-6 text-yellow-400" />
                Room Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="roomName" className="text-white font-medium">Room Name *</Label>
                  <Input
                    id="roomName"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="e.g., Tech Talk Tuesday"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-lg h-12 focus:bg-white/15"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxParticipants" className="text-white font-medium">Max Participants</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    min="2"
                    max="50"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 8)}
                    className="bg-white/10 border-white/20 text-white h-12 focus:bg-white/15"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-white font-medium">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell people what this room is about..."
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 min-h-[100px] focus:bg-white/15"
                />
              </div>
            </CardContent>
          </Card>

          {/* Session Type Configuration */}
          <Card className="bg-white/5 border-white/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-xl flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-green-400" />
                Session Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center mb-6">
                <div className="flex bg-white/10 rounded-xl p-2 backdrop-blur-sm">
                  <button
                    onClick={() => setSessionType('free')}
                    className={`px-8 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      sessionType === 'free'
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Free Session
                  </button>
                  <button
                    onClick={() => setSessionType('paid')}
                    className={`px-8 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      sessionType === 'paid'
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                        : 'text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Premium Session
                  </button>
                </div>
              </div>

              {/* Premium Session Financial Details */}
              {sessionType === 'paid' && (
                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-6 border border-purple-500/30">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-purple-400" />
                    Premium Session Pricing
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                      <Label htmlFor="bestowedAmount" className="text-purple-200 font-medium">Entry Fee (USDC)</Label>
                      <Input
                        id="bestowedAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={bestowedAmount}
                        onChange={(e) => setBestowedAmount(parseFloat(e.target.value) || 0)}
                        placeholder="10.00"
                        className="bg-white/10 border-purple-300/30 text-white h-12 focus:bg-white/15"
                      />
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-white/10 border-white/20">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-white">{formatCurrency(hostAmount)}</div>
                        <div className="text-white/70 text-sm">Host Gets</div>
                        <div className="text-white/50 text-xs">{((hostAmount / bestowedAmount) * 100).toFixed(1)}%</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-white/10 border-white/20">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-blue-400">{formatCurrency(platformFee)}</div>
                        <div className="text-white/70 text-sm">Platform Fee</div>
                        <div className="text-white/50 text-xs">10%</div>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-white/10 border-white/20">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-400">{formatCurrency(serviceFee)}</div>
                        <div className="text-white/70 text-sm">Service Fee</div>
                        <div className="text-white/50 text-xs">0.5%</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live Session Preview */}
          <Card className="bg-white/5 border-white/20 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-xl flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-400" />
                Live Session Preview
              </CardTitle>
              <p className="text-white/60">Configure who can participate in your room</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Host Section */}
                <div className="space-y-4">
                  <h3 className="text-yellow-400 font-semibold text-lg flex items-center gap-2">
                    <Crown className="w-5 h-5" />
                    Host (You)
                  </h3>
                  <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/40 h-32">
                    <CardContent className="p-4 h-full flex flex-col items-center justify-center">
                      <Badge className="bg-yellow-500/80 text-yellow-900 border-yellow-400 mb-2">
                        <Crown className="w-3 h-3 mr-1" />
                        Host
                      </Badge>
                      <Avatar className="w-12 h-12 border-2 border-yellow-400/50">
                        <AvatarFallback className="bg-gradient-to-br from-yellow-600 to-orange-600 text-white font-bold">
                          {user?.email?.[0]?.toUpperCase() || 'H'}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-white font-semibold text-sm mt-2">{user?.email || 'Host'}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Guest Section */}
                <div className="space-y-4">
                  <h3 className="text-purple-400 font-semibold text-lg">Featured Guest</h3>
                  <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-2 border-purple-500/40 h-32">
                    <CardContent className="p-4 h-full flex flex-col items-center justify-center">
                      <Badge className="bg-purple-500/80 text-purple-100 border-purple-400 mb-2">
                        Guest
                      </Badge>
                      <div className="w-12 h-12 border-2 border-dashed border-purple-400/50 rounded-full flex items-center justify-center">
                        <Plus className="w-6 h-6 text-purple-400" />
                      </div>
                      <p className="text-white/60 text-sm mt-2">Add guest speaker</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Co-hosts Section */}
              <div className="mt-6 space-y-4">
                <h3 className="text-blue-400 font-semibold text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Co-hosts
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-2 border-blue-500/40 h-28">
                      <CardContent className="p-3 h-full flex flex-col items-center justify-center">
                        <Badge className="bg-blue-500/80 text-blue-100 border-blue-400 text-xs mb-2">
                          Co-host {i}
                        </Badge>
                        <div className="w-10 h-10 border-2 border-dashed border-blue-400/50 rounded-full flex items-center justify-center">
                          <Plus className="w-5 h-5 text-blue-400" />
                        </div>
                        <p className="text-white/60 text-xs mt-1">Available</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Queue Preview */}
              <div className="mt-6 space-y-4">
                <h3 className="text-green-400 font-semibold text-lg flex items-center gap-2">
                  <Hand className="w-5 h-5" />
                  Speaker Queue (8 positions)
                </h3>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((pos) => (
                    <Card key={pos} className="bg-white/10 border-white/20 aspect-square">
                      <CardContent className="p-2 h-full flex flex-col items-center justify-center">
                        <div className="text-xs text-white/90 font-bold mb-1 bg-white/20 rounded-full w-5 h-5 flex items-center justify-center">
                          {pos}
                        </div>
                        <div className="w-6 h-6 border border-dashed border-white/40 rounded-full flex items-center justify-center">
                          <span className="text-white/50 text-xs">+</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button
              onClick={saveRoom}
              disabled={isLoading}
              size="lg"
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm px-8 py-3 h-auto"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save Room
                </>
              )}
            </Button>
            
            <Button
              onClick={startLiveSession}
              disabled={isLoading}
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/30 px-8 py-3 h-auto font-semibold"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Start Live Session
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

}