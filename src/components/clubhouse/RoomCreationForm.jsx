import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
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

  const handleLayoutSelect = (layoutKey) => {
    setSelectedLayout(layoutKey)
    setCurrentStep('form')
  }

  const SlotCard = ({ title, user, onClick, className = '' }) => (
    <Card 
      className={`cursor-pointer hover:bg-gray-50 transition-colors border-2 ${className}`}
      onClick={onClick}
    >
      <CardContent className="p-3 h-full flex flex-col items-center justify-center">
        {user ? (
          <>
            <Avatar className="w-8 h-8 mb-2">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>{user.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium text-center">{user.name}</span>
          </>
        ) : (
          <>
            <UserPlus className="w-6 h-6 text-gray-400 mb-2" />
            <span className="text-xs text-gray-500 text-center">{title}</span>
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
      <div className="h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col rounded-3xl m-4 overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-md border-b border-white/20 px-6 py-4 flex-shrink-0 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Choose Your Clubhouse Layout</h1>
            <Button variant="ghost" onClick={onClose} className="rounded-full">
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
                    className="cursor-pointer hover:shadow-xl transition-all duration-200 border-2 hover:scale-[1.02] backdrop-blur-sm rounded-3xl"
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
                      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 mb-4 border border-white/70 shadow-sm">
                        <div className="flex gap-3 mb-3">
                          
                          {/* Speaking Area */}
                          <div className="flex-1">
                            <div className="text-xs font-semibold text-gray-700 mb-3 text-center">SPEAKERS</div>
                            
                            {/* Host */}
                            <div className="flex justify-center mb-3">
                              <div className="bg-yellow-100 border border-yellow-300 rounded-xl px-3 py-2 text-center">
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
                                    <div className="bg-emerald-100 border border-emerald-300 rounded-xl px-2 py-1 text-center">
                                      <div className="text-xs font-bold text-emerald-800">GUEST</div>
                                    </div>
                                    {Array(2).fill(0).map((_, i) => (
                                      <div key={i} className="bg-blue-100 border border-blue-300 rounded-xl px-2 py-1 text-center">
                                        <div className="text-xs font-bold text-blue-800">CO</div>
                                      </div>
                                    ))}
                                  </>
                                ) : (
                                  // Other layouts: Regular co-hosts/panelists
                                  Array(Math.min(layout.coHostSlots, 4)).fill(0).map((_, i) => (
                                    <div key={i} className="bg-blue-100 border border-blue-300 rounded-xl px-2 py-1 text-center">
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
                                <div key={i} className="bg-green-100 border border-green-300 rounded-lg h-7 w-7 flex items-center justify-center">
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
                          <div className="w-1/3 bg-gray-50 rounded-xl border border-gray-200 p-2">
                            <div className="text-xs font-semibold text-gray-700 mb-2 text-center flex items-center justify-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              CHAT & QUEUE
                            </div>
                             <div className="space-y-1">
                               <div className="bg-white rounded-lg p-1 text-xs text-gray-600">Hi everyone! 👋</div>
                               <div className="bg-white rounded-lg p-1 text-xs text-gray-600">Can I join to speak?</div>
                               <div className="bg-orange-100 rounded-lg p-1 text-xs text-orange-700">🎤 Voice recording sent</div>
                               <div className="bg-yellow-100 rounded-lg p-1 text-xs text-yellow-700">⏳ Awaiting host approval</div>
                               <div className="bg-green-100 rounded-lg p-1 text-xs text-green-700">✅ Recording approved</div>
                               <div className="bg-blue-100 rounded-lg p-1 text-xs text-blue-700">🙋 In queue to speak</div>
                             </div>
                            <div className="text-xs text-center text-gray-500 mt-2">Unlimited listeners</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Description */}
                      <p 
                        className="text-sm text-center mb-4 leading-relaxed" 
                        style={{ color: colors.text }}
                      >
                        {layout.description}
                      </p>
                      
                      {/* Action Button */}
                      <Button 
                        className="w-full shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl"
                        style={{
                          backgroundColor: colors.buttonBg,
                          color: colors.buttonText,
                          border: 'none'
                        }}
                        onClick={() => handleLayoutSelect(key)}
                      >
                        Choose This Layout
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

  // Form Step - Compact Single Page Layout
  if (currentStep === 'form') {
    const layout = layouts[selectedLayout]
    const colorSchemes = {
      standard: { bg: '#D5AAFF', text: '#2A2A2A', buttonBg: '#FFE156', buttonText: '#2A2A2A' },
      panel: { bg: '#E0BBE4', text: '#2A2A2A', buttonBg: '#957DAD', buttonText: '#FFFFFF' },
      interview: { bg: '#957DAD', text: '#FFFFFF', buttonBg: '#FFE156', buttonText: '#2A2A2A' },
      townhall: { bg: '#B9FBC0', text: '#2A2A2A', buttonBg: '#957DAD', buttonText: '#FFFFFF' },
      intimate: { bg: '#FFE156', text: '#2A2A2A', buttonBg: '#957DAD', buttonText: '#FFFFFF' },
      large: { bg: '#FFB7B7', text: '#2A2A2A', buttonBg: '#957DAD', buttonText: '#FFFFFF' }
    }
    const colors = colorSchemes[selectedLayout] || colorSchemes.standard

    return (
      <div 
        className="h-screen flex flex-col rounded-3xl m-4 overflow-hidden shadow-2xl"
        style={{
          background: `linear-gradient(135deg, ${colors.bg}40, ${colors.bg}20)`,
          backdropFilter: 'blur(20px)'
        }}
      >
        
        {/* Header */}
        <div 
          className="px-6 py-3 flex-shrink-0 border-b rounded-t-3xl backdrop-blur-md"
          style={{
            backgroundColor: `${colors.bg}90`,
            borderBottomColor: `${colors.bg}60`
          }}
        >
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep('layout')} 
              className="rounded-full shadow-md hover:shadow-lg transition-all"
              style={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                borderColor: colors.buttonBg,
                color: colors.text
              }}
            >
              ← Change
            </Button>
            <h1 
              className="text-xl font-bold" 
              style={{ color: colors.text }}
            >
              Configure & Go Live
            </h1>
            <Button 
              variant="ghost" 
              onClick={onClose}
              style={{ color: colors.text }}
              className="hover:bg-white/20 rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Main Content - Single View NO SCROLLING */}
        <div className="flex-1 p-4">
          <div className="grid grid-cols-12 gap-4 h-full">
            
            {/* Left Column - Layout Preview & Topic */}
            <div className="col-span-4 space-y-3">
              
              {/* Compact Layout Preview */}
              <Card 
                className="rounded-2xl border-2 backdrop-blur-sm shadow-xl"
                style={{ 
                  backgroundColor: `${colors.bg}85`,
                  borderColor: colors.bg
                }}
              >
                <CardContent className="p-3">
                  <div className="text-center mb-2">
                    <h3 
                      className="text-sm font-bold mb-2" 
                      style={{ color: colors.text }}
                    >
                      {layout.name}
                    </h3>
                    <div className="bg-white/95 rounded-xl p-2 shadow-inner">
                      
                      {/* Mini Layout Display */}
                      <div className="flex gap-2 mb-2">
                        <div className="flex-1">
                          <div className="text-xs font-bold text-gray-700 mb-1 text-center">SPEAKERS</div>
                          
                          {/* Host */}
                          <div className="flex justify-center mb-1">
                            <div className="bg-yellow-200 border border-yellow-400 rounded px-1 py-1 text-center">
                              <Crown className="w-2 h-2 mx-auto text-yellow-600" />
                            </div>
                          </div>
                          
                          {/* Co-hosts */}
                          {layout.coHostSlots > 0 && (
                            <div className="flex justify-center gap-1 mb-1">
                              {Array(Math.min(layout.coHostSlots, 3)).fill(0).map((_, i) => (
                                <div key={i} className="bg-blue-200 border border-blue-400 rounded px-1 py-1">
                                  <div className="w-1 h-1 bg-blue-600 rounded-full"></div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Audience */}
                          <div className="grid grid-cols-3 gap-1 justify-center max-w-16 mx-auto">
                            {Array(Math.min(layout.inviteSlots, 6)).fill(0).map((_, i) => (
                              <div key={i} className="bg-green-200 border border-green-400 rounded h-3 w-3 flex items-center justify-center">
                                <div className="w-1 h-1 bg-green-600 rounded-full"></div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Chat */}
                        <div className="w-1/3 bg-gray-100 rounded p-1">
                          <MessageSquare className="w-2 h-2 mx-auto mb-1 text-gray-600" />
                          <div className="space-y-1">
                            <div className="bg-white rounded h-1"></div>
                            <div className="bg-orange-100 rounded h-1"></div>
                            <div className="bg-green-100 rounded h-1"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Topic Input */}
              <div>
                <Label 
                  className="text-sm font-bold mb-2 block" 
                  style={{ color: colors.text }}
                >
                  Live Topic
                </Label>
                <Input
                  value={liveTopic}
                  onChange={(e) => setLiveTopic(e.target.value)}
                  placeholder="Enter your live topic..."
                  className="text-center font-semibold h-10 rounded-2xl backdrop-blur-sm shadow-lg border-2"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    borderColor: colors.buttonBg,
                    color: colors.text
                  }}
                />
              </div>

              {/* Session Settings */}
              <Card 
                className="rounded-2xl backdrop-blur-sm"
                style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-semibold">Session Type</Label>
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={sessionType === 'paid'} 
                        onCheckedChange={(checked) => setSessionType(checked ? 'paid' : 'free')}
                      />
                      <span className="text-xs font-medium">
                        {sessionType === 'free' ? 'Free' : 'Paid'}
                      </span>
                    </div>
                  </div>
                  
                  {sessionType === 'paid' && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-3 h-3" />
                      <Input
                        type="number"
                        step="0.01"
                        value={entryFee}
                        onChange={(e) => setEntryFee(parseFloat(e.target.value) || 0)}
                        placeholder="1.00"
                        className="flex-1 rounded-xl h-8 text-sm"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Middle Column - Host & Co-hosts */}
            <div className="col-span-4 space-y-3">
              
              {/* Host Section */}
              <div>
                <h3 
                  className="text-sm font-semibold mb-2 text-center" 
                  style={{ color: colors.text }}
                >
                  Host
                </h3>
                <SlotCard
                  title="host"
                  user={hostSlot}
                  onClick={() => handleSlotClick('host')}
                  className="border-yellow-300 bg-yellow-50 h-16 rounded-2xl shadow-lg hover:shadow-xl transition-all"
                />
              </div>

              {/* Co-hosts/Panelists */}
              {layout.coHostSlots > 0 && (
                <div>
                  <h3 
                    className="text-sm font-semibold mb-2 text-center" 
                    style={{ color: colors.text }}
                  >
                    {selectedLayout === 'panel' ? 'Panelists' : 
                     selectedLayout === 'interview' ? 'Guest & Co-hosts' :
                     selectedLayout === 'townhall' ? 'Moderators' : 'Co-hosts'}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {coHostSlots.slice(0, 4).map((slot, index) => (
                      <SlotCard
                        key={index}
                        title={selectedLayout === 'interview' && index === 0 ? 'guest' : 
                               selectedLayout === 'panel' ? 'panelist' :
                               selectedLayout === 'townhall' ? 'moderator' : 'co-host'}
                        user={slot}
                        onClick={() => handleSlotClick('cohost', index)}
                        className="border-blue-300 bg-blue-50 h-14 rounded-2xl shadow-md hover:shadow-lg transition-all"
                      />
                    )))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Audience & Actions */}
            <div className="col-span-4 space-y-3">
              
              {/* Audience Section */}
              <div>
                <h3 
                  className="text-sm font-semibold mb-2 text-center" 
                  style={{ color: colors.text }}
                >
                  {selectedLayout === 'intimate' ? 'Participants' : 'Audience Queue'}
                </h3>
                <div className="grid grid-cols-5 gap-1">
                  {inviteSlots.slice(0, 10).map((slot, index) => (
                    <Card 
                      key={index}
                      className="cursor-pointer hover:shadow-md transition-all border border-green-300 bg-green-50 h-10 rounded-xl"
                      onClick={() => handleSlotClick('invite', index)}
                    >
                      <CardContent className="p-1 h-full flex flex-col items-center justify-center">
                        {slot ? (
                          <>
                            <Avatar className="w-4 h-4 mb-1">
                              <AvatarImage src={slot.avatar} />
                              <AvatarFallback className="text-xs">{slot.name?.[0] || 'A'}</AvatarFallback>
                            </Avatar>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3 text-gray-400" />
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )))}
                </div>
                <div 
                  className="text-center text-xs mt-1" 
                  style={{ color: colors.text }}
                >
                  {layout.inviteSlots} can speak from queue
                </div>
              </div>

              {/* Features */}
              <Card 
                className="rounded-2xl backdrop-blur-sm"
                style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
              >
                <CardContent className="p-3">
                  <h4 className="text-sm font-semibold mb-2 text-center">Features Included</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <Camera className="w-3 h-3 text-green-600" />
                      <span>Video for hosts & guests</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mic className="w-3 h-3 text-green-600" />
                      <span>Voice recordings in chat</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3 text-green-600" />
                      <span>Document sharing</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button 
                  onClick={saveRoom} 
                  variant="outline" 
                  size="sm" 
                  className="w-full rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    borderColor: colors.buttonBg,
                    color: colors.text
                  }}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </Button>
                <Button 
                  onClick={goLive} 
                  size="sm" 
                  className="w-full rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 animate-pulse"
                  style={{
                    backgroundColor: colors.buttonBg,
                    color: colors.buttonText,
                    border: 'none'
                  }}
                >
                  <Play className="w-4 h-4 mr-2" />
                  🚀 GO LIVE NOW
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // If no matching step, return null or default view
  return null
}
