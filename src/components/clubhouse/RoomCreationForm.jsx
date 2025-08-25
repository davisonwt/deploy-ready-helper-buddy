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
  Layout,
  X
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'

export function RoomCreationForm({ onRoomCreated, onClose }) {
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
      <div className="h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm border-b px-6 py-4 flex-shrink-0 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Choose Your Clubhouse Layout
            </h1>
            <Button variant="ghost" onClick={onClose} className="hover:bg-red-50 hover:text-red-600 transition-colors">
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-gray-600 mt-2">Select the perfect layout for your live session</p>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {Object.entries(layouts).map(([key, layout], index) => {
                const IconComponent = layout.icon
                
                // Enhanced color schemes with gradients
                const colorSchemes = {
                  standard: {
                    gradient: 'from-blue-400 to-purple-500',
                    bg: 'bg-gradient-to-br from-blue-50 to-purple-50',
                    buttonGradient: 'from-yellow-400 to-orange-500',
                    iconColor: 'text-blue-600',
                    shadow: 'shadow-blue-200/50'
                  },
                  panel: {
                    gradient: 'from-purple-400 to-pink-500',
                    bg: 'bg-gradient-to-br from-purple-50 to-pink-50',
                    buttonGradient: 'from-purple-500 to-indigo-600',
                    iconColor: 'text-purple-600',
                    shadow: 'shadow-purple-200/50'
                  },
                  interview: {
                    gradient: 'from-emerald-400 to-teal-500',
                    bg: 'bg-gradient-to-br from-emerald-50 to-teal-50',
                    buttonGradient: 'from-emerald-500 to-green-600',
                    iconColor: 'text-emerald-600',
                    shadow: 'shadow-emerald-200/50'
                  },
                  townhall: {
                    gradient: 'from-amber-400 to-orange-500',
                    bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
                    buttonGradient: 'from-amber-500 to-yellow-600',
                    iconColor: 'text-amber-600',
                    shadow: 'shadow-amber-200/50'
                  },
                  intimate: {
                    gradient: 'from-rose-400 to-pink-500',
                    bg: 'bg-gradient-to-br from-rose-50 to-pink-50',
                    buttonGradient: 'from-rose-500 to-pink-600',
                    iconColor: 'text-rose-600',
                    shadow: 'shadow-rose-200/50'
                  },
                  large: {
                    gradient: 'from-indigo-400 to-blue-500',
                    bg: 'bg-gradient-to-br from-indigo-50 to-blue-50',
                    buttonGradient: 'from-indigo-500 to-purple-600',
                    iconColor: 'text-indigo-600',
                    shadow: 'shadow-indigo-200/50'
                  }
                }
                
                const colors = colorSchemes[key]
                
                return (
                  <Card 
                    key={key}
                    className={`group cursor-pointer transition-all duration-300 ease-out transform hover:scale-105 hover:-translate-y-2 
                              ${colors.bg} ${colors.shadow} shadow-xl hover:shadow-2xl 
                              border-0 rounded-2xl backdrop-blur-sm hover:backdrop-blur-md
                              animate-fade-in opacity-0`}
                    style={{ 
                      animationDelay: `${index * 100}ms`,
                      animationFillMode: 'forwards'
                    }}
                    onClick={() => handleLayoutSelect(key)}
                  >
                    <CardContent className="p-8 relative overflow-hidden">
                      
                      {/* Animated background pattern */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-5 
                                     group-hover:opacity-10 transition-opacity duration-300`} />
                      
                      {/* Floating decorative elements */}
                      <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-white/20 blur-xl 
                                    group-hover:bg-white/30 transition-all duration-500 animate-pulse" />
                      <div className="absolute bottom-4 left-4 w-16 h-16 rounded-full bg-white/10 blur-lg 
                                    group-hover:bg-white/20 transition-all duration-700" />
                      
                      {/* Header with animated icon */}
                      <div className="text-center mb-6 relative z-10">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl 
                                      bg-white/80 backdrop-blur-sm shadow-lg mb-4 
                                      group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                          <IconComponent 
                            className={`w-10 h-10 ${colors.iconColor} group-hover:scale-110 transition-transform duration-300`}
                          />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors">
                          {layout.name}
                        </h3>
                      </div>
                      
                      {/* Enhanced Layout Preview */}
                      <div className="bg-white/90 backdrop-blur-sm rounded-xl p-4 mb-6 border border-white/50 
                                    shadow-inner group-hover:bg-white/95 transition-all duration-300">
                        <div className="flex gap-3 mb-3">
                          
                          {/* Speaking Area */}
                          <div className="flex-1">
                            <div className="text-xs font-semibold text-gray-700 mb-3 text-center tracking-wide">
                              SPEAKERS
                            </div>
                            
                            {/* Animated Host */}
                            <div className="flex justify-center mb-3">
                              <div className="bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-300 
                                            rounded-lg px-3 py-2 text-center shadow-sm hover:shadow-md transition-all duration-200
                                            transform hover:scale-105">
                                <Crown className="w-4 h-4 mx-auto mb-1 text-yellow-600 animate-pulse" />
                                <div className="text-xs font-bold text-yellow-800">HOST</div>
                              </div>
                            </div>
                            
                            {/* Animated Co-hosts/Panelists */}
                            {layout.coHostSlots > 0 && (
                              <div className="flex justify-center gap-2 mb-3">
                                {key === 'interview' ? (
                                  <>
                                    <div className="bg-gradient-to-r from-emerald-100 to-green-100 border-2 border-emerald-300 
                                                  rounded-lg px-2 py-1 text-center shadow-sm transform hover:scale-105 transition-all duration-200">
                                      <div className="text-xs font-bold text-emerald-800">GUEST</div>
                                    </div>
                                    {Array(2).fill(0).map((_, i) => (
                                      <div key={i} className="bg-gradient-to-r from-blue-100 to-indigo-100 border-2 border-blue-300 
                                                           rounded-lg px-2 py-1 text-center shadow-sm transform hover:scale-105 
                                                           transition-all duration-200 animate-fade-in"
                                           style={{ animationDelay: `${(i + 1) * 50}ms` }}>
                                        <div className="text-xs font-bold text-blue-800">CO</div>
                                      </div>
                                    ))}
                                  </>
                                ) : (
                                  Array(Math.min(layout.coHostSlots, 4)).fill(0).map((_, i) => (
                                    <div key={i} className="bg-gradient-to-r from-blue-100 to-indigo-100 border-2 border-blue-300 
                                                         rounded-lg px-2 py-1 text-center shadow-sm transform hover:scale-105 
                                                         transition-all duration-200 animate-fade-in"
                                         style={{ animationDelay: `${i * 50}ms` }}>
                                      <div className="text-xs font-bold text-blue-800">
                                        {key === 'panel' ? 'PAN' : 'CO'}
                                      </div>
                                    </div>
                                  ))
                                )}
                                {layout.coHostSlots > 4 && 
                                  <span className="text-xs text-gray-500 self-center">+{layout.coHostSlots - 4}</span>
                                }
                              </div>
                            )}
                            
                            {/* Animated Audience grid */}
                            <div className={`grid gap-1 justify-center ${
                              layout.inviteSlots <= 4 ? 'grid-cols-2' : 
                              layout.inviteSlots <= 6 ? 'grid-cols-3' : 
                              'grid-cols-4'
                            } max-w-40 mx-auto`}>
                              {Array(Math.min(layout.inviteSlots, 8)).fill(0).map((_, i) => (
                                <div key={i} className="bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 
                                                     rounded-lg h-7 w-7 flex items-center justify-center shadow-sm
                                                     transform hover:scale-110 transition-all duration-200 animate-scale-in"
                                     style={{ animationDelay: `${i * 25}ms` }}>
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" 
                                       style={{ animationDelay: `${i * 100}ms` }} />
                                </div>
                              ))}
                            </div>
                            {layout.inviteSlots > 8 && (
                              <div className="text-xs text-center text-gray-500 mt-1">+{layout.inviteSlots - 8} more</div>
                            )}
                            <div className="text-xs text-center text-gray-600 mt-2 font-medium">
                              {layout.inviteSlots} audience can speak
                            </div>
                          </div>
                          
                          {/* Enhanced Messages/Queue Area */}
                          <div className="w-1/3 bg-gradient-to-b from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 p-2 
                                        shadow-inner">
                            <div className="text-xs font-semibold text-gray-700 mb-2 text-center flex items-center justify-center gap-1">
                              <MessageSquare className="w-3 h-3 animate-pulse" />
                              CHAT & QUEUE
                            </div>
                            <div className="space-y-1">
                              <div className="bg-white rounded-md p-1 text-xs text-gray-600 shadow-sm animate-fade-in">
                                Hi everyone! 👋
                              </div>
                              <div className="bg-white rounded-md p-1 text-xs text-gray-600 shadow-sm animate-fade-in"
                                   style={{ animationDelay: '100ms' }}>
                                Can I join to speak?
                              </div>
                              <div className="bg-gradient-to-r from-orange-100 to-amber-100 rounded-md p-1 text-xs text-orange-700 
                                            shadow-sm animate-fade-in border border-orange-200"
                                   style={{ animationDelay: '200ms' }}>
                                🎤 Voice recording sent
                              </div>
                              <div className="bg-gradient-to-r from-yellow-100 to-amber-100 rounded-md p-1 text-xs text-yellow-700 
                                            shadow-sm animate-fade-in border border-yellow-200"
                                   style={{ animationDelay: '300ms' }}>
                                ⏳ Awaiting host approval
                              </div>
                              <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-md p-1 text-xs text-green-700 
                                            shadow-sm animate-fade-in border border-green-200"
                                   style={{ animationDelay: '400ms' }}>
                                ✅ Recording approved
                              </div>
                              <div className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-md p-1 text-xs text-blue-700 
                                            shadow-sm animate-fade-in border border-blue-200"
                                   style={{ animationDelay: '500ms' }}>
                                🙋 In queue to speak
                              </div>
                            </div>
                            <div className="text-xs text-center text-gray-500 mt-2 font-medium">Unlimited listeners</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Enhanced Features Section */}
                      <div className="flex justify-center gap-4 mb-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1 bg-white/50 rounded-lg px-2 py-1 backdrop-blur-sm shadow-sm">
                          <Camera className="w-4 h-4 text-red-500" />
                          <span>Video</span>
                        </div>
                        <div className="flex items-center gap-1 bg-white/50 rounded-lg px-2 py-1 backdrop-blur-sm shadow-sm">
                          <FileText className="w-4 h-4 text-orange-500" />
                          <span>Docs</span>
                        </div>
                        <div className="flex items-center gap-1 bg-white/50 rounded-lg px-2 py-1 backdrop-blur-sm shadow-sm">
                          <Mic className="w-4 h-4 text-green-500" />
                          <span>Audio</span>
                        </div>
                      </div>
                      
                      {/* Best For section with enhanced styling */}
                      <div className="text-center mb-6 relative z-10">
                        <div className="text-sm font-semibold mb-2 text-gray-700 tracking-wide">
                          BEST FOR:
                        </div>
                        <div className="text-sm text-gray-600 font-medium px-3 py-2 bg-white/60 rounded-lg backdrop-blur-sm shadow-sm">
                          {key === 'standard' && 'General discussions, Q&A sessions'}
                          {key === 'panel' && 'Expert panels, debates with multiple speakers'}
                          {key === 'interview' && 'One-on-one interviews with guest + moderators'}
                          {key === 'townhall' && 'Large community meetings, announcements'}
                          {key === 'intimate' && 'Small group conversations, workshops'}
                          {key === 'large' && 'Presentations, lectures, big events'}
                        </div>
                      </div>
                      
                      {/* Enhanced animated button */}
                      <Button 
                        className={`w-full font-semibold text-white border-0 rounded-xl h-12 text-base
                                  bg-gradient-to-r ${colors.buttonGradient} 
                                  shadow-lg hover:shadow-xl
                                  transform transition-all duration-300 
                                  hover:scale-105 hover:-translate-y-1
                                  focus:scale-105 focus:shadow-xl
                                  relative overflow-hidden group`}
                      >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          <span>Choose {layout.name}</span>
                          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center 
                                        group-hover:bg-white/30 transition-colors">
                            <span className="text-sm">→</span>
                          </div>
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 
                                      transform -skew-x-12 -translate-x-full group-hover:translate-x-full 
                                      transition-transform duration-700" />
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
    <div className="h-screen bg-white flex flex-col">
      
      {/* Fixed Header */}
      <div className="bg-white border-b px-6 py-4 flex-shrink-0 z-10">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setCurrentStep('layout')}>
            ← Change Layout
          </Button>
          <div className="text-center">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {layouts[selectedLayout]?.name}
            </Badge>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* LEFT SIDE - Messages */}
        <div className="w-80 bg-gray-50 border-r p-4 flex-shrink-0">
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

        {/* RIGHT SIDE - Main Layout with Full Scrolling */}
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1">
            <div className="p-6 pb-20">
            
            {/* Topic Input */}
            <div className="text-center mb-12">
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

            {/* Dynamic Layout Rendering */}
            {selectedLayout && layouts[selectedLayout] && (
              <div className="space-y-12 max-w-6xl mx-auto">
                
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
                  {/* Horizontal grid for audience - smaller boxes */}
                  <div className="flex flex-wrap gap-2 justify-center max-w-5xl mx-auto">
                    {inviteSlots.map((slot, index) => (
                      <Card 
                        key={index}
                        className="cursor-pointer hover:bg-gray-50 transition-colors border-2 border-green-300 bg-green-50 w-16 h-20"
                        onClick={() => handleSlotClick('invite', index)}
                      >
                        <CardContent className="p-1 h-full flex flex-col items-center justify-center">
                          {slot ? (
                            <>
                              <Avatar className="w-8 h-8 mb-1">
                                <AvatarImage src={slot.avatar} />
                                <AvatarFallback className="text-xs">{slot.name?.[0] || 'A'}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium text-center leading-tight">{slot.name}</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-6 h-6 text-gray-400 mb-1" />
                              <span className="text-xs text-gray-500 text-center leading-tight">audience {index + 1}</span>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {layouts[selectedLayout].inviteSlots > 8 && (
                    <div className="text-sm text-gray-600 mt-2">
                      +{layouts[selectedLayout].inviteSlots - 8} more slots available
                    </div>
                  )}
                  <div className="mt-2 text-sm text-gray-600">
                    {layouts[selectedLayout].inviteSlots} people can speak from audience queue
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

              <div className="flex gap-4 text-sm text-gray-600 justify-center flex-wrap">
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
            <div className="flex gap-4 justify-center pb-8">
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
            </ScrollArea>
          </div>
        </div>
    </div>
  )
}