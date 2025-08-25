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
      <div className="h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col">
        
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Choose Your Clubhouse Layout</h1>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-gray-600 mt-2">Select the perfect layout for your live session</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {Object.entries(layouts).map(([key, layout]) => {
                const IconComponent = layout.icon
                
                // Color schemes with inline styles for hex colors with transparency
                const colorSchemes = {
                  standard: {
                    bg: '#D5AAFF', // Light Purple with transparency
                    text: '#2A2A2A', // Dark Gray
                    buttonBg: '#FFE156', // Bright Yellow
                    buttonText: '#2A2A2A',
                    opacity: 0.85
                  },
                  panel: {
                    bg: '#E0BBE4', // Lavender with transparency
                    text: '#2A2A2A', // Dark Gray
                    buttonBg: '#957DAD', // Dusty Purple
                    buttonText: '#FFFFFF',
                    opacity: 0.85
                  },
                  interview: {
                    bg: '#957DAD', // Dusty Purple with transparency
                    text: '#FFFFFF', // White text for dark background
                    buttonBg: '#FFE156', // Bright Yellow
                    buttonText: '#2A2A2A',
                    opacity: 0.9
                  },
                  townhall: {
                    bg: '#B9FBC0', // Mint Green with transparency
                    text: '#2A2A2A', // Dark Gray
                    buttonBg: '#957DAD', // Dusty Purple
                    buttonText: '#FFFFFF',
                    opacity: 0.85
                  },
                  intimate: {
                    bg: '#FFE156', // Bright Yellow with transparency
                    text: '#2A2A2A', // Dark Gray
                    buttonBg: '#957DAD', // Dusty Purple
                    buttonText: '#FFFFFF',
                    opacity: 0.85
                  },
                  large: {
                    bg: '#FFB7B7', // Soft Peach with transparency
                    text: '#2A2A2A', // Dark Gray
                    buttonBg: '#957DAD', // Dusty Purple
                    buttonText: '#FFFFFF',
                    opacity: 0.85
                  }
                }
                
                const colors = colorSchemes[key]
                
                return (
                  <Card 
                    key={key}
                    className="cursor-pointer hover:shadow-xl transition-all duration-200 border-2 hover:scale-[1.02] backdrop-blur-sm"
                    style={{ 
                      backgroundColor: `${colors.bg}${Math.round(colors.opacity * 255).toString(16).padStart(2, '0')}`,
                      borderColor: colors.bg,
                      color: colors.text,
                      boxShadow: `0 8px 32px ${colors.bg}40`
                    }}
                    onClick={() => handleLayoutSelect(key)}
                  >
                    <CardContent className="p-6">
                      
                      {/* Header with Layout Name */}
                      <div className="text-center mb-4">
                        <IconComponent 
                          className="w-10 h-10 mx-auto mb-3" 
                          style={{ color: colors.text }}
                        />
                        <h3 
                          className="text-xl font-bold" 
                          style={{ color: colors.text }}
                        >
                          {layout.name}
                        </h3>
                      </div>
                      
                      {/* Layout Preview */}
                      <div className="bg-white/95 backdrop-blur-sm rounded-lg p-4 mb-4 border border-white/70 shadow-sm">
                        <div className="flex gap-3 mb-3">
                          
                          {/* Speaking Area */}
                          <div className="flex-1">
                            <div className="text-xs font-semibold text-gray-700 mb-3 text-center">SPEAKERS</div>
                            
                            {/* Host */}
                            <div className="flex justify-center mb-3">
                              <div className="bg-yellow-100 border border-yellow-300 rounded px-3 py-2 text-center">
                                <Crown className="w-4 h-4 mx-auto mb-1 text-yellow-600" />
                                <div className="text-xs font-bold text-yellow-800">HOST</div>
                              </div>
                            </div>
                            
                            {/* Co-hosts/Panelists - Different layouts */}
                            {layout.coHostSlots > 0 && (
                              <div className="flex justify-center gap-2 mb-3">
                                {key === 'interview' ? (
                                  // Interview: 1 Guest + 2 Co-hosts
                                  <>
                                    <div className="bg-emerald-100 border border-emerald-300 rounded px-2 py-1 text-center">
                                      <div className="text-xs font-bold text-emerald-800">GUEST</div>
                                    </div>
                                    {Array(2).fill(0).map((_, i) => (
                                      <div key={i} className="bg-blue-100 border border-blue-300 rounded px-2 py-1 text-center">
                                        <div className="text-xs font-bold text-blue-800">CO</div>
                                      </div>
                                    ))}
                                  </>
                                ) : (
                                  // Other layouts: Regular co-hosts/panelists
                                  Array(Math.min(layout.coHostSlots, 4)).fill(0).map((_, i) => (
                                    <div key={i} className="bg-blue-100 border border-blue-300 rounded px-2 py-1 text-center">
                                      <div className="text-xs font-bold text-blue-800">
                                        {key === 'panel' ? 'PAN' : 'CO'}
                                      </div>
                                    </div>
                                  ))
                                )}
                                {layout.coHostSlots > 4 && <span className="text-xs text-gray-500">+{layout.coHostSlots - 4}</span>}
                              </div>
                            )}
                            
                            {/* Audience grid - Proper arrangements */}
                            <div className={`grid gap-1 justify-center ${
                              layout.inviteSlots <= 4 ? 'grid-cols-2' : 
                              layout.inviteSlots <= 6 ? 'grid-cols-3' : 
                              'grid-cols-4'
                            } max-w-40 mx-auto`}>
                              {Array(Math.min(layout.inviteSlots, 8)).fill(0).map((_, i) => (
                                <div key={i} className="bg-green-100 border border-green-300 rounded h-7 w-7 flex items-center justify-center">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                </div>
                              ))}
                            </div>
                            {layout.inviteSlots > 8 && (
                              <div className="text-xs text-center text-gray-500 mt-1">+{layout.inviteSlots - 8} more</div>
                            )}
                            <div className="text-xs text-center text-gray-600 mt-2">
                              {layout.inviteSlots} audience can speak
                            </div>
                          </div>
                          
                          {/* Messages/Queue Area */}
                          <div className="w-1/3 bg-gray-50 rounded border border-gray-200 p-2">
                            <div className="text-xs font-semibold text-gray-700 mb-2 text-center flex items-center justify-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              CHAT & QUEUE
                            </div>
                             <div className="space-y-1">
                               <div className="bg-white rounded p-1 text-xs text-gray-600">Hi everyone! 👋</div>
                               <div className="bg-white rounded p-1 text-xs text-gray-600">Can I join to speak?</div>
                               <div className="bg-orange-100 rounded p-1 text-xs text-orange-700">🎤 Voice recording sent</div>
                               <div className="bg-yellow-100 rounded p-1 text-xs text-yellow-700">⏳ Awaiting host approval</div>
                               <div className="bg-green-100 rounded p-1 text-xs text-green-700">✅ Recording approved</div>
                               <div className="bg-blue-100 rounded p-1 text-xs text-blue-700">🙋 In queue to speak</div>
                             </div>
                            <div className="text-xs text-center text-gray-500 mt-2">Unlimited listeners</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Features */}
                      <div className="flex justify-center gap-4 mb-4 text-sm" style={{ color: colors.text }}>
                        <div className="flex items-center gap-1">
                          <Camera className="w-4 h-4 text-red-500" />
                          <span>Video</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4 text-orange-500" />
                          <span>Docs</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Mic className="w-4 h-4 text-green-500" />
                          <span>Audio</span>
                        </div>
                      </div>
                      
                      {/* Best For */}
                      <div className="text-center mb-4">
                        <div className="text-sm font-semibold mb-2" style={{ color: colors.text }}>
                          BEST FOR:
                        </div>
                        <div className="text-sm opacity-90" style={{ color: colors.text }}>
                          {key === 'standard' && 'General discussions, Q&A sessions'}
                          {key === 'panel' && 'Expert panels, debates with multiple speakers'}
                          {key === 'interview' && 'One-on-one interviews with guest + moderators'}
                          {key === 'townhall' && 'Large community meetings, announcements'}
                          {key === 'intimate' && 'Small group conversations, workshops'}
                          {key === 'large' && 'Presentations, lectures, big events'}
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full font-semibold transition-all duration-200 hover:shadow-lg"
                        style={{ 
                          backgroundColor: `${colors.buttonBg}${Math.round(0.95 * 255).toString(16).padStart(2, '0')}`,
                          color: colors.buttonText,
                          border: 'none',
                          boxShadow: `0 4px 16px ${colors.buttonBg}30`
                        }}
                      >
                        Choose {layout.name}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            <div className="h-8"></div>
          </div>
        </div>
      </div>
    )
  }

  // Form Step - only show when currentStep is 'form'
  if (currentStep === 'form') {
    const layout = layouts[selectedLayout]
    const colorSchemes = {
      standard: { bg: '#D5AAFF', text: '#2A2A2A', buttonBg: '#FFE156', buttonText: '#2A2A2A', opacity: 0.9 },
      panel: { bg: '#E0BBE4', text: '#2A2A2A', buttonBg: '#957DAD', buttonText: '#FFFFFF', opacity: 0.9 },
      interview: { bg: '#957DAD', text: '#FFFFFF', buttonBg: '#FFE156', buttonText: '#2A2A2A', opacity: 0.95 },
      townhall: { bg: '#B9FBC0', text: '#2A2A2A', buttonBg: '#957DAD', buttonText: '#FFFFFF', opacity: 0.9 },
      intimate: { bg: '#FFE156', text: '#2A2A2A', buttonBg: '#957DAD', buttonText: '#FFFFFF', opacity: 0.9 },
      large: { bg: '#FFB7B7', text: '#2A2A2A', buttonBg: '#957DAD', buttonText: '#FFFFFF', opacity: 0.9 }
    }
    const colors = colorSchemes[selectedLayout] || colorSchemes.standard

  return (
    <div 
      className="h-screen flex flex-col"
      style={{
        background: `linear-gradient(135deg, ${colors.bg}30, ${colors.bg}15, ${colors.buttonBg}20)`
      }}
    >
      
      {/* Fixed Header */}
      <div 
        className="backdrop-blur-sm border-b px-6 py-4 flex-shrink-0 z-10 shadow-lg"
        style={{
          backgroundColor: `${colors.bg}95`,
          borderBottomColor: `${colors.bg}40`
        }}
      >
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep('layout')} 
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{
              backgroundColor: 'rgba(255,255,255,0.9)',
              borderColor: colors.buttonBg,
              color: colors.text
            }}
          >
            ← Change Layout
          </Button>
          <div className="text-center">
            <h1 
              className="text-xl font-bold" 
              style={{ color: colors.text }}
            >
              Configure Your Session
            </h1>
          </div>
          <Button 
            variant="ghost" 
            onClick={onClose}
            style={{ color: colors.text }}
            className="hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Beautiful Chosen Layout Display */}
      <div 
        className="backdrop-blur-sm border-b px-6 py-6 flex-shrink-0 shadow-inner"
        style={{
          backgroundColor: `${colors.bg}20`,
          borderBottomColor: `${colors.bg}30`
        }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-4">
            <h2 
              className="text-lg font-semibold mb-2" 
              style={{ color: colors.text }}
            >
              Your Chosen Layout
            </h2>
          </div>
          
          {selectedLayout && layouts[selectedLayout] && (() => {
            const layout = layouts[selectedLayout]
            const IconComponent = layout.icon
            
            const colorSchemes = {
              standard: { bg: '#D5AAFF', text: '#2A2A2A', buttonBg: '#FFE156', buttonText: '#2A2A2A', opacity: 0.9 },
              panel: { bg: '#E0BBE4', text: '#2A2A2A', buttonBg: '#957DAD', buttonText: '#FFFFFF', opacity: 0.9 },
              interview: { bg: '#957DAD', text: '#FFFFFF', buttonBg: '#FFE156', buttonText: '#2A2A2A', opacity: 0.95 },
              townhall: { bg: '#B9FBC0', text: '#2A2A2A', buttonBg: '#957DAD', buttonText: '#FFFFFF', opacity: 0.9 },
              intimate: { bg: '#FFE156', text: '#2A2A2A', buttonBg: '#957DAD', buttonText: '#FFFFFF', opacity: 0.9 },
              large: { bg: '#FFB7B7', text: '#2A2A2A', buttonBg: '#957DAD', buttonText: '#FFFFFF', opacity: 0.9 }
            }
            
            const colors = colorSchemes[selectedLayout]
            
            return (
              <div className="flex justify-center">
                <Card 
                  className="animate-fade-in hover:scale-105 transition-all duration-300 border-2 backdrop-blur-sm shadow-2xl max-w-md"
                  style={{ 
                    backgroundColor: `${colors.bg}${Math.round(colors.opacity * 255).toString(16).padStart(2, '0')}`,
                    borderColor: colors.bg,
                    color: colors.text,
                    boxShadow: `0 20px 50px ${colors.bg}60, 0 0 0 1px ${colors.bg}20`
                  }}
                >
                  <CardContent className="p-6">
                    
                    {/* Header with Layout Name */}
                    <div className="text-center mb-4">
                      <IconComponent 
                        className="w-12 h-12 mx-auto mb-3 animate-pulse" 
                        style={{ color: colors.text }}
                      />
                      <h3 
                        className="text-2xl font-bold" 
                        style={{ color: colors.text }}
                      >
                        {layout.name}
                      </h3>
                    </div>
                    
                    {/* Layout Preview */}
                    <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/70 shadow-lg">
                      <div className="flex gap-3 mb-3">
                        
                        {/* Speaking Area */}
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-gray-700 mb-3 text-center">SPEAKERS</div>
                          
                          {/* Host */}
                          <div className="flex justify-center mb-3">
                            <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 border-2 border-yellow-300 rounded-lg px-3 py-2 text-center shadow-md hover:shadow-lg transition-shadow">
                              <Crown className="w-4 h-4 mx-auto mb-1 text-yellow-600" />
                              <div className="text-xs font-bold text-yellow-800">HOST</div>
                            </div>
                          </div>
                          
                          {/* Co-hosts/Panelists */}
                          {layout.coHostSlots > 0 && (
                            <div className="flex justify-center gap-2 mb-3">
                              {selectedLayout === 'interview' ? (
                                <>
                                  <div className="bg-gradient-to-r from-emerald-100 to-emerald-200 border-2 border-emerald-300 rounded-lg px-2 py-1 text-center shadow-sm">
                                    <div className="text-xs font-bold text-emerald-800">GUEST</div>
                                  </div>
                                  {Array(2).fill(0).map((_, i) => (
                                    <div key={i} className="bg-gradient-to-r from-blue-100 to-blue-200 border-2 border-blue-300 rounded-lg px-2 py-1 text-center shadow-sm">
                                      <div className="text-xs font-bold text-blue-800">CO</div>
                                    </div>
                                  ))}
                                </>
                              ) : (
                                Array(Math.min(layout.coHostSlots, 4)).fill(0).map((_, i) => (
                                  <div key={i} className="bg-gradient-to-r from-blue-100 to-blue-200 border-2 border-blue-300 rounded-lg px-2 py-1 text-center shadow-sm">
                                    <div className="text-xs font-bold text-blue-800">
                                      {selectedLayout === 'panel' ? 'PAN' : 'CO'}
                                    </div>
                                  </div>
                                ))
                              )}
                              {layout.coHostSlots > 4 && <span className="text-xs text-gray-500">+{layout.coHostSlots - 4}</span>}
                            </div>
                          )}
                          
                          {/* Audience grid */}
                          <div className={`grid gap-1 justify-center ${
                            layout.inviteSlots <= 4 ? 'grid-cols-2' : 
                            layout.inviteSlots <= 6 ? 'grid-cols-3' : 
                            'grid-cols-4'
                          } max-w-40 mx-auto`}>
                            {Array(Math.min(layout.inviteSlots, 8)).fill(0).map((_, i) => (
                              <div key={i} className="bg-gradient-to-r from-green-100 to-green-200 border-2 border-green-300 rounded-md h-7 w-7 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
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
                        
                        {/* Messages/Queue Area */}
                        <div className="w-1/3 bg-gradient-to-b from-gray-50 to-gray-100 rounded-lg border-2 border-gray-200 p-2 shadow-inner">
                          <div className="text-xs font-semibold text-gray-700 mb-2 text-center flex items-center justify-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            CHAT & QUEUE
                          </div>
                          <div className="space-y-1">
                            <div className="bg-white rounded-md p-1 text-xs text-gray-600 shadow-sm">Hi everyone! 👋</div>
                            <div className="bg-white rounded-md p-1 text-xs text-gray-600 shadow-sm">Can I join to speak?</div>
                            <div className="bg-gradient-to-r from-orange-100 to-orange-200 rounded-md p-1 text-xs text-orange-700 shadow-sm">🎤 Voice recording sent</div>
                            <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-md p-1 text-xs text-yellow-700 shadow-sm">⏳ Awaiting host approval</div>
                            <div className="bg-gradient-to-r from-green-100 to-green-200 rounded-md p-1 text-xs text-green-700 shadow-sm">✅ Recording approved</div>
                            <div className="bg-gradient-to-r from-blue-100 to-blue-200 rounded-md p-1 text-xs text-blue-700 shadow-sm">🙋 In queue to speak</div>
                          </div>
                          <div className="text-xs text-center text-gray-500 mt-2 font-medium">Unlimited listeners</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Description */}
                    <div className="text-center">
                      <p 
                        className="text-sm font-medium mb-3" 
                        style={{ color: colors.text }}
                      >
                        {layout.description}
                      </p>
                      
                      <div className="text-xs opacity-80" style={{ color: colors.text }}>
                        {selectedLayout === 'standard' && 'Perfect for casual discussions and Q&A sessions'}
                        {selectedLayout === 'panel' && 'Expert panels, multi-speaker discussions'}
                        {selectedLayout === 'interview' && 'One-on-one interviews with guest + moderators'}
                        {selectedLayout === 'townhall' && 'Large community meetings, announcements'}
                        {selectedLayout === 'intimate' && 'Small group conversations, workshops'}
                        {selectedLayout === 'large' && 'Presentations, lectures, big events'}
                      </div>
                    </div>
                    
                    <div 
                      className="mt-4 px-4 py-2 rounded-lg text-center text-sm font-semibold animate-pulse"
                      style={{ 
                        backgroundColor: `${colors.buttonBg}40`,
                        color: colors.buttonText,
                        border: `2px solid ${colors.buttonBg}`
                      }}
                    >
                      ✨ Currently Configuring ✨
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })()}
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* LEFT SIDE - Messages */}
        <div 
          className="w-80 border-r p-4 flex-shrink-0 backdrop-blur-sm"
          style={{
            backgroundColor: `${colors.bg}15`,
            borderRightColor: `${colors.bg}30`
          }}
        >
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare 
              className="w-5 h-5" 
              style={{ color: colors.text }}
            />
            <h3 
              className="font-semibold" 
              style={{ color: colors.text }}
            >
              Messages & Queue
            </h3>
          </div>
          
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {messages.map((message, index) => (
                <div 
                  key={index} 
                  className="p-3 rounded-lg text-sm shadow-sm backdrop-blur-sm"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    borderLeft: `4px solid ${colors.buttonBg}`,
                    color: colors.text
                  }}
                >
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
                <Label 
                  className="text-2xl font-bold" 
                  style={{ color: colors.text }}
                >
                  live: topic
                </Label>
              </div>
              <Input
                value={liveTopic}
                onChange={(e) => setLiveTopic(e.target.value)}
                placeholder="Enter your live topic here..."
                className="text-xl text-center font-semibold h-14 max-w-2xl mx-auto backdrop-blur-sm shadow-lg border-2"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  borderColor: colors.buttonBg,
                  color: colors.text
                }}
              />
            </div>

            {/* Dynamic Layout Rendering */}
            {selectedLayout && layouts[selectedLayout] && (
              <div className="space-y-12 max-w-6xl mx-auto">
                
                {/* Host Section */}
                <div className="text-center">
                  <h3 
                    className="text-lg font-semibold mb-4" 
                    style={{ color: colors.text }}
                  >
                    Host
                  </h3>
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
                    <h3 
                      className="text-lg font-semibold mb-4" 
                      style={{ color: colors.text }}
                    >
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
                  <h3 
                    className="text-lg font-semibold mb-4" 
                    style={{ color: colors.text }}
                  >
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
                    <div 
                      className="text-sm mt-2" 
                      style={{ color: colors.text }}
                    >
                      +{layouts[selectedLayout].inviteSlots - 8} more slots available
                    </div>
                  )}
                  <div 
                    className="mt-2 text-sm" 
                    style={{ color: colors.text }}
                  >
                    {layouts[selectedLayout].inviteSlots} people can speak from audience queue
                  </div>
                </div>
              </div>
            )}

            {/* Session Settings */}
            <div className="max-w-4xl mx-auto mb-8 mt-12">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Label 
                    className="text-lg font-semibold" 
                    style={{ color: colors.text }}
                  >
                    Session Type:
                  </Label>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={sessionType === 'paid'} 
                      onCheckedChange={(checked) => setSessionType(checked ? 'paid' : 'free')}
                    />
                    <span 
                      className="font-medium" 
                      style={{ color: colors.text }}
                    >
                      {sessionType === 'free' ? 'Free Session' : 'Paid Session'}
                    </span>
                  </div>
                </div>
                
                {sessionType === 'paid' && (
                  <div className="flex items-center gap-2">
                    <DollarSign 
                      className="w-4 h-4" 
                      style={{ color: colors.text }}
                    />
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

              <div 
                className="flex gap-4 text-sm justify-center flex-wrap" 
                style={{ color: colors.text }}
              >
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
              <Button 
                onClick={saveRoom} 
                variant="outline" 
                size="lg" 
                className="px-8 shadow-lg hover:shadow-xl transition-all duration-200"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.9)',
                  borderColor: colors.buttonBg,
                  color: colors.text
                }}
              >
                <Save className="w-5 h-5 mr-2" />
                Save Configuration
              </Button>
              <Button 
                onClick={goLive} 
                size="lg" 
                className="px-8 shadow-lg hover:shadow-xl transition-all duration-200"
                style={{
                  backgroundColor: colors.buttonBg,
                  color: colors.buttonText,
                  border: 'none'
                }}
              >
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

  // If no matching step, return null or default view
  return null
}