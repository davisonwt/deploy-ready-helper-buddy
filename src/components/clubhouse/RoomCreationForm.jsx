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
      description: '1 Host + 1 Co-host + 8 Audience',
      hostSlots: 1,
      coHostSlots: 1,
      inviteSlots: 8,
      grid: 'grid-cols-4',
      icon: Users,
      color: 'bg-blue-50 border-blue-200'
    },
    panel: {
      name: 'Panel Discussion',
      description: '1 Host + 3 Panelists + 6 Audience',
      hostSlots: 1,
      coHostSlots: 3,
      inviteSlots: 6,
      grid: 'grid-cols-3',
      icon: Crown, 
      color: 'bg-purple-50 border-purple-200'
    },
    interview: {
      name: 'Interview Style',
      description: '1 Host + 1 Guest + 2 Co-hosts + 4 Audience',
      hostSlots: 1,
      coHostSlots: 3, // Guest + 2 co-hosts
      inviteSlots: 4,
      grid: 'grid-cols-4',
      icon: Mic,
      color: 'bg-green-50 border-green-200'
    },
    townhall: {
      name: 'Town Hall',
      description: '1 Host + 2 Moderators + 12 Audience',
      hostSlots: 1,
      coHostSlots: 2,
      inviteSlots: 12,
      grid: 'grid-cols-4',
      icon: Users,
      color: 'bg-yellow-50 border-yellow-200'
    },
    intimate: {
      name: 'Intimate Circle',
      description: '1 Host + 7 Participants',
      hostSlots: 1,
      coHostSlots: 0,
      inviteSlots: 7,
      grid: 'grid-cols-4',
      icon: Crown,
      color: 'bg-pink-50 border-pink-200'
    },
    large: {
      name: 'Large Audience',
      description: '1 Host + 1 Co-host + 16 Audience',
      hostSlots: 1,
      coHostSlots: 1,
      inviteSlots: 16,
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
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">Choose Your Clubhouse Layout</h1>
            <p className="text-lg text-gray-600">Select the format that best fits your session type</p>
          </div>

          <div className="h-[calc(100vh-200px)] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 pb-8">
              {Object.entries(layouts).map(([key, layout]) => {
                const IconComponent = layout.icon
                return (
                  <Card 
                    key={key}
                    className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${layout.color} border-2 hover:scale-105`}
                    onClick={() => handleLayoutSelect(key)}
                  >
                    <CardContent className="p-6">
                      <div className="text-center mb-4">
                        <IconComponent className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{layout.name}</h3>
                        <p className="text-gray-600 text-sm">{layout.description}</p>
                      </div>
                      
                      {/* Complete Layout Preview */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200 mb-4">
                        
                        {/* Messages/Queue Sidebar Preview */}
                        <div className="flex gap-2 mb-4">
                          <div className="w-20 bg-gray-100 rounded p-2">
                            <div className="text-xs font-semibold mb-2 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              Messages
                            </div>
                            <div className="space-y-1">
                              {Array(4).fill(0).map((_, i) => (
                                <div key={i} className="h-2 bg-blue-200 rounded"></div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Main Session Area */}
                          <div className="flex-1">
                            {/* Host slot preview */}
                            <div className="flex justify-center mb-2">
                              <div className="w-16 h-10 bg-yellow-300 rounded border border-yellow-400 flex items-center justify-center">
                                <Crown className="w-3 h-3" />
                              </div>
                            </div>
                            
                            {/* Co-host slots preview */}
                            {layout.coHostSlots > 0 && (
                              <div className="flex justify-center gap-1 mb-2">
                                {Array(Math.min(layout.coHostSlots, 3)).fill(0).map((_, i) => (
                                  <div key={i} className="w-12 h-8 bg-blue-300 rounded border border-blue-400 flex items-center justify-center">
                                    <Users className="w-2 h-2" />
                                  </div>
                                ))}
                                {layout.coHostSlots > 3 && <span className="text-xs text-gray-500 self-center">+{layout.coHostSlots - 3}</span>}
                              </div>
                            )}
                            
                            {/* Audience slots preview */}
                            <div className="flex justify-center gap-1 flex-wrap mb-2">
                              {Array(Math.min(layout.inviteSlots, 8)).fill(0).map((_, i) => (
                                <div key={i} className="w-8 h-6 bg-green-300 rounded border border-green-400"></div>
                              ))}
                              {layout.inviteSlots > 8 && <span className="text-xs text-gray-500">+{layout.inviteSlots - 8}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Document/Video Sharing Area Preview */}
                        <div className="bg-gray-50 rounded p-2 mb-2">
                          <div className="text-xs font-semibold mb-2 text-center text-gray-600">Shared Content Area</div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white rounded p-2 border border-gray-200 text-center">
                              <FileText className="w-4 h-4 mx-auto mb-1 text-gray-500" />
                              <div className="text-xs text-gray-500">Documents</div>
                              <div className="text-xs text-gray-400">PDF, Slides</div>
                            </div>
                            <div className="bg-white rounded p-2 border border-gray-200 text-center">
                              <Camera className="w-4 h-4 mx-auto mb-1 text-gray-500" />
                              <div className="text-xs text-gray-500">Video Share</div>
                              <div className="text-xs text-gray-400">Screen, Camera</div>
                            </div>
                          </div>
                        </div>

                        {/* Course/Presentation Mode Preview */}
                        <div className="bg-blue-50 rounded p-2 border border-blue-200">
                          <div className="text-xs font-semibold mb-1 text-blue-700 text-center">Course Mode</div>
                          <div className="flex items-center justify-center gap-2 text-xs text-blue-600">
                            <div className="w-3 h-2 bg-blue-300 rounded"></div>
                            <span>Presenter Focus</span>
                            <div className="w-3 h-2 bg-blue-300 rounded"></div>
                          </div>
                        </div>
                      </div>

                      {/* Feature List */}
                      <div className="text-xs text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <Camera className="w-3 h-3" />
                          <span>Video on/off for all roles</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3" />
                          <span>Document sharing & collaboration</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mic className="w-3 h-3" />
                          <span>Voice recordings in queue</span>
                        </div>
                      </div>

                      <Button className="mt-4 w-full" size="lg">
                        Select This Layout
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