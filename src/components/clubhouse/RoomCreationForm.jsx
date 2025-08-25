import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Crown, 
  Users, 
  UserPlus, 
  Play,
  Save,
  DollarSign,
  MessageSquare,
  Camera,
  FileText,
  Mic,
  Layout
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'

export function RoomCreationForm({ onRoomCreated }) {
  const { user } = useAuth()
  const { toast } = useToast()
  
  // Layout configurations
  const layouts = {
    standard: {
      name: 'Standard Discussion',
      description: '8 visible boxes: 1 Host + 1 Co-host + 6 Audience (Unlimited guests in chat/queue)',
      hostSlots: 1,
      coHostSlots: 1,
      inviteSlots: 6,
      grid: 'grid-cols-4',
      icon: Users,
      color: 'bg-blue-50 border-blue-200'
    },
    panel: {
      name: 'Panel Discussion',
      description: '8 visible boxes: 1 Host + 3 Panelists + 4 Audience (Unlimited guests in chat/queue)',
      hostSlots: 1,
      coHostSlots: 3,
      inviteSlots: 4,
      grid: 'grid-cols-3',
      icon: Crown, 
      color: 'bg-purple-50 border-purple-200'
    },
    interview: {
      name: 'Interview Style',
      description: '8 visible boxes: 1 Host + 1 Guest + 2 Co-hosts + 4 Audience (Unlimited guests in chat/queue)',
      hostSlots: 1,
      coHostSlots: 3, // Guest + 2 co-hosts
      inviteSlots: 4,
      grid: 'grid-cols-4',
      icon: Mic,
      color: 'bg-green-50 border-green-200'
    },
    townhall: {
      name: 'Town Hall',
      description: '8 visible boxes: 1 Host + 2 Moderators + 5 Audience (Unlimited guests in chat/queue)',
      hostSlots: 1,
      coHostSlots: 2,
      inviteSlots: 5,
      grid: 'grid-cols-4',
      icon: Users,
      color: 'bg-yellow-50 border-yellow-200'
    },
    intimate: {
      name: 'Intimate Circle',
      description: '8 visible boxes: 1 Host + 7 Participants (Unlimited guests in chat/queue)',
      hostSlots: 1,
      coHostSlots: 0,
      inviteSlots: 7,
      grid: 'grid-cols-4',
      icon: Crown,
      color: 'bg-pink-50 border-pink-200'
    },
    large: {
      name: 'Large Audience',
      description: '8 visible boxes: 1 Host + 1 Co-host + 6 Audience (Unlimited guests in chat/queue)',
      hostSlots: 1,
      coHostSlots: 1,
      inviteSlots: 6,
      grid: 'grid-cols-4',
      icon: Users,
      color: 'bg-indigo-50 border-indigo-200'
    }
  }
  
  const [currentStep, setCurrentStep] = useState('layout') // 'layout', 'form', 'live'
  const [selectedLayout, setSelectedLayout] = useState('')
  const [liveTopic, setLiveTopic] = useState('')
  const [sessionType, setSessionType] = useState('free')
  const [entryFee, setEntryFee] = useState(0)
  const [hostSlot, setHostSlot] = useState(null)
  const [coHostSlots, setCoHostSlots] = useState([])
  const [inviteSlots, setInviteSlots] = useState([])
  
  // Initialize slots when layout changes
  useEffect(() => {
    if (selectedLayout && layouts[selectedLayout]) {
      const layout = layouts[selectedLayout]
      setCoHostSlots(Array(layout.coHostSlots).fill(null))
      setInviteSlots(Array(layout.inviteSlots).fill(null))
    }
  }, [selectedLayout])
  
  const [messages] = useState([
    'messages show here (guests name and icon image also show) - this is the queueing line',
    'messages show here (guests name and icon image also show) - this is the queueing line',
    'messages show here (guests name and icon image also show) - this is the queueing line',
    'messages show here (guests name and icon image also show) - this is the queueing line',
    'messages show here (guests name and icon image also show) - this is the queueing line',
    'messages show here (guests name and icon image also show) - this is the queueing line',
    'messages show here (guests name and icon image also show) - this is the queueing line',
  ])

  const handleLayoutSelect = (layoutKey) => {
    setSelectedLayout(layoutKey)
    setCurrentStep('form')
  }

  const SlotCard = ({ title, user, onClick, className = '' }) => (
    <Card 
      className={`h-32 cursor-pointer hover:bg-gray-50 transition-colors border-2 ${className}`}
      onClick={onClick}
    >
      <CardContent className="p-4 h-full flex flex-col items-center justify-center">
        {user ? (
          <>
            <Avatar className="w-12 h-12 mb-2">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-center">{user.name}</span>
          </>
        ) : (
          <>
            <UserPlus className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-sm text-gray-500 text-center">{title}</span>
          </>
        )}
      </CardContent>
    </Card>
  )

  const handleSlotClick = (slotType, index = null) => {
    // For now, just add a placeholder user
    const placeholderUser = { name: 'User ' + Math.random().toString(36).substr(2, 5), avatar: null }
    
    if (slotType === 'host') {
      setHostSlot(hostSlot ? null : placeholderUser)
    } else if (slotType === 'cohost' && index !== null) {
      const newSlots = [...coHostSlots]
      newSlots[index] = newSlots[index] ? null : placeholderUser
      setCoHostSlots(newSlots)
    } else if (slotType === 'invite' && index !== null) {
      const newSlots = [...inviteSlots]
      newSlots[index] = newSlots[index] ? null : placeholderUser
      setInviteSlots(newSlots)
    }
  }

  const saveRoom = async () => {
    if (!liveTopic.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter a live topic",
        variant: "destructive"
      })
      return
    }

    try {
      const roomData = {
        name: liveTopic.trim(),
        type: 'clubhouse',
        session_type: sessionType,
        entry_fee: sessionType === 'paid' ? entryFee : 0,
        layout: selectedLayout,
        host_user: hostSlot,
        co_host_users: coHostSlots,
        invite_slots: inviteSlots,
        is_active: false,
        creator_id: user.id
      }

      const { data, error } = await supabase
        .from('rooms')
        .insert(roomData)
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Room saved!",
        description: `${liveTopic} has been configured successfully`,
      })

      onRoomCreated?.(data)
    } catch (error) {
      console.error('Error saving room:', error)
      toast({
        title: "Error",
        description: "Failed to save room configuration",
        variant: "destructive"
      })
    }
  }

  const goLive = async () => {
    await saveRoom()
    
    const sessionData = {
      name: liveTopic.trim(),
      type: 'clubhouse',
      session_type: sessionType,
      entry_fee: sessionType === 'paid' ? entryFee : 0,
      layout: selectedLayout,
      creator_name: user?.email || 'Host',
      is_active: true,
      host_user: hostSlot,
      co_host_users: coHostSlots,
      invite_slots: inviteSlots
    }
    
    onRoomCreated?.(sessionData)
    
    toast({
      title: "Going Live!",
      description: "Your clubhouse session is now live",
    })
  }

  // Layout Selection Step
  if (currentStep === 'layout') {
    return (
      <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-2">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-2">
              <h1 className="text-lg font-bold text-white mb-1">Choose Layout</h1>
              <p className="text-xs text-gray-300">Select your session format</p>
            </div>

            {/* Mobile-optimized Grid - TikTok style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {Object.entries(layouts).map(([key, layout]) => {
                const IconComponent = layout.icon
                return (
                  <Card 
                    key={key}
                    className={`cursor-pointer hover:shadow-lg transition-all duration-200 bg-gray-900 border-gray-700 border hover:scale-[1.02] h-40`}
                    onClick={() => handleLayoutSelect(key)}
                  >
                    <CardContent className="p-2 h-full">
                      
                      {/* TikTok-style Layout Preview */}
                      <div className="flex gap-2 h-32">
                        
                        {/* Host Area (Left) - Like TikTok */}
                        <div className="w-1/2 bg-gray-800 rounded-lg p-2 flex flex-col items-center justify-center">
                          <IconComponent className="w-6 h-6 mb-1 text-orange-400" />
                          <div className="text-xs font-bold text-white text-center">Host</div>
                          <div className="text-xs text-gray-400 mt-1 text-center leading-tight">
                            {layout.name}
                          </div>
                        </div>
                        
                        {/* Participants Grid (Right) - Like TikTok */}
                        <div className="w-1/2 grid grid-cols-2 gap-1">
                          
                          {/* Co-host slots */}
                          {Array(Math.min(layout.coHostSlots, 2)).fill(0).map((_, i) => (
                            <div key={i} className="bg-blue-800 rounded-lg flex items-center justify-center">
                              <Users className="w-3 h-3 text-blue-300" />
                            </div>
                          ))}
                          
                          {/* Audience slots - fill remaining */}
                          {Array(4 - Math.min(layout.coHostSlots, 2)).fill(0).map((_, i) => (
                            <div key={i} className="bg-gray-700 rounded-lg flex items-center justify-center border border-gray-600 border-dashed">
                              <UserPlus className="w-2 h-2 text-gray-400" />
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Chat Preview (Bottom) */}
                      <div className="mt-2 bg-gray-800 rounded p-1">
                        <div className="flex items-center gap-1 mb-1">
                          <MessageSquare className="w-2 h-2 text-gray-400" />
                          <div className="flex gap-1">
                            {Array(4).fill(0).map((_, i) => (
                              <div key={i} className="w-1 h-1 bg-blue-400 rounded-full"></div>
                            ))}
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 text-center">Live Chat</div>
                      </div>
                      
                      {/* Select Button */}
                      <Button className="mt-2 w-full text-xs py-1 h-6 bg-orange-600 hover:bg-orange-700" size="sm">
                        Select {layout.name}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Form Step
  return (
    <div className="min-h-screen bg-white flex">
      
      {/* LEFT SIDE - Messages */}
      <div className="w-80 bg-gray-50 border-r p-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5" />
          <h3 className="font-semibold">Messages & Queue</h3>
        </div>
        
        <ScrollArea className="h-96">
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div key={index} className="p-3 bg-white rounded text-sm border-l-4 border-blue-400">
                {message}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* RIGHT SIDE - Main Layout */}
      <div className="flex-1 p-6">
        
        {/* Header with back button and selected layout */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" onClick={() => setCurrentStep('layout')}>
              ← Change Layout
            </Button>
            <div className="text-center">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {layouts[selectedLayout]?.name}
              </Badge>
            </div>
            <div></div>
          </div>
          
          <div className="text-center">
            <div className="mb-4">
              <Label className="text-2xl font-bold text-gray-800">live: topic</Label>
            </div>
            <Input
              value={liveTopic}
              onChange={(e) => setLiveTopic(e.target.value)}
              placeholder="Enter your live topic here..."
              className="text-xl text-center font-semibold h-14 max-w-2xl mx-auto"
            />
          </div>
        </div>

        {/* Dynamic Layout Rendering */}
        {selectedLayout && layouts[selectedLayout] && (
          <div className="space-y-8 max-w-6xl mx-auto">
            
            {/* Host Section */}
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">Host</h3>
              <SlotCard
                title="host"
                user={hostSlot}
                onClick={() => handleSlotClick('host')}
                className="border-yellow-300 bg-yellow-50 h-40 w-64 mx-auto"
              />
            </div>

            {/* Co-hosts/Panelists Section */}
            {layouts[selectedLayout].coHostSlots > 0 && (
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">
                  {selectedLayout === 'panel' ? 'Panelists' : 
                   selectedLayout === 'interview' ? 'Guest & Co-hosts' :
                   selectedLayout === 'townhall' ? 'Moderators' : 'Co-hosts'}
                </h3>
                <div className={`grid ${layouts[selectedLayout].coHostSlots === 1 ? 'grid-cols-1' : 
                                  layouts[selectedLayout].coHostSlots === 2 ? 'grid-cols-2' : 
                                  'grid-cols-3'} gap-4 justify-center max-w-4xl mx-auto`}>
                  {coHostSlots.map((slot, index) => (
                    <SlotCard
                      key={index}
                      title={selectedLayout === 'interview' && index === 0 ? 'featured guest' : 
                             selectedLayout === 'panel' ? 'panelist' :
                             selectedLayout === 'townhall' ? 'moderator' : 'co-host'}
                      user={slot}
                      onClick={() => handleSlotClick('cohost', index)}
                      className="border-blue-300 bg-blue-50 h-32"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Audience/Participants Section */}
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">
                {selectedLayout === 'intimate' ? 'Participants' : 'Audience Queue'}
              </h3>
              <div className={`grid ${layouts[selectedLayout].grid} gap-4 justify-center max-w-6xl mx-auto`}>
                {inviteSlots.map((slot, index) => (
                  <SlotCard
                    key={index}
                    title="invite / request"
                    user={slot}
                    onClick={() => handleSlotClick('invite', index)}
                    className="border-green-300 bg-green-50 h-32"
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Session Settings */}
        <div className="max-w-4xl mx-auto mb-8 mt-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Label className="text-lg font-semibold">Session Type:</Label>
              <div className="flex items-center gap-2">
                <Switch 
                  checked={sessionType === 'paid'} 
                  onCheckedChange={(checked) => setSessionType(checked ? 'paid' : 'free')}
                />
                <span className="font-medium">
                  {sessionType === 'free' ? 'Free Session' : 'Paid Session'}
                </span>
              </div>
            </div>
            
            {sessionType === 'paid' && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <Input
                  type="number"
                  step="0.01"
                  value={entryFee}
                  onChange={(e) => setEntryFee(parseFloat(e.target.value) || 0)}
                  placeholder="1.00"
                  className="w-32"
                />
              </div>
            )}
          </div>

          <div className="flex gap-4 text-sm text-gray-600 justify-center">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              <span>Camera on/off for hosts, co-host or guest</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Documents shareable for studies</span>
            </div>
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4" />
              <span>Voice recordings in messages</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <Button onClick={saveRoom} variant="outline" size="lg" className="px-8">
            <Save className="w-5 h-5 mr-2" />
            Save Configuration
          </Button>
          <Button onClick={goLive} size="lg" className="px-8 bg-red-600 hover:bg-red-700">
            <Play className="w-5 h-5 mr-2" />
            Go Live
          </Button>
        </div>
      </div>
    </div>
  )
}