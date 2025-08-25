import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Settings, 
  Users, 
  Calendar, 
  Radio, 
  BarChart3, 
  Clock,
  Globe,
  UserPlus,
  Activity,
  X,
  Crown,
  Headphones,
  Mic
} from 'lucide-react'
import TimezoneSlotAssignment from '@/components/radio/TimezoneSlotAssignment'
import GlobalDJScheduler from '@/components/radio/GlobalDJScheduler'
import AdminRadioManagement from '@/components/radio/AdminRadioManagement'
import PersonnelSlotAssignment from '@/components/radio/PersonnelSlotAssignment'
import { StationStats } from '@/components/radio/StationStats'
import { CreateDJProfileForm } from '@/components/radio/CreateDJProfileForm'

const radioOptions = {
  schedule: {
    name: 'Schedule Management',
    description: 'Advanced timezone-aware radio show scheduling and time slot coordination',
    icon: Calendar,
    color: { bg: '#FFE156', text: '#2A2A2A', buttonBg: '#957DAD', buttonText: '#FFFFFF', opacity: 0.9 },
    features: ['24/7 Global Coverage', 'Timezone Management', 'Smart Scheduling', 'Conflict Resolution']
  },
  personnel: {
    name: 'Personnel Assignment',
    description: 'DJ assignment, host management, and staff coordination across time zones',
    icon: Users,
    color: { bg: '#B9FBC0', text: '#2A2A2A', buttonBg: '#957DAD', buttonText: '#FFFFFF', opacity: 0.9 },
    features: ['DJ Management', 'Role Assignment', 'Availability Tracking', 'Emergency Coverage']
  },
  global: {
    name: 'Global DJ Scheduler',
    description: '24/7 worldwide coverage optimization with optimal daylight hour assignments',
    icon: Globe,
    color: { bg: '#D5AAFF', text: '#2A2A2A', buttonBg: '#FFE156', buttonText: '#2A2A2A', opacity: 0.9 },
    features: ['Global Coverage', 'Optimal Hours', 'Regional Assignment', 'Auto-rotation']
  },
  admin: {
    name: 'Admin Controls',
    description: 'Station administration, show approvals, and comprehensive management tools',
    icon: Settings,
    color: { bg: '#957DAD', text: '#FFFFFF', buttonBg: '#FFE156', buttonText: '#2A2A2A', opacity: 0.95 },
    features: ['Show Approvals', 'System Settings', 'User Management', 'Content Moderation']
  },
  analytics: {
    name: 'Station Analytics',
    description: 'Performance metrics, listener statistics, and comprehensive reporting dashboard',
    icon: BarChart3,
    color: { bg: '#FFB7B7', text: '#2A2A2A', buttonBg: '#957DAD', buttonText: '#FFFFFF', opacity: 0.9 },
    features: ['Listener Stats', 'Performance Metrics', 'Show Analytics', 'Trend Analysis']
  },
  profiles: {
    name: 'DJ Profiles',
    description: 'DJ profile creation, management, and specialized skill assignment',
    icon: Mic,
    color: { bg: '#E0BBE4', text: '#2A2A2A', buttonBg: '#957DAD', buttonText: '#FFFFFF', opacity: 0.9 },
    features: ['Profile Creation', 'Skill Management', 'Bio & Specialties', 'Emergency Availability']
  }
}

export default function RadioManagementPage() {
  const [currentStep, setCurrentStep] = useState('selection') // 'selection', 'management'
  const [selectedOption, setSelectedOption] = useState('')
  const [showDJProfileForm, setShowDJProfileForm] = useState(false)

  const handleOptionSelect = (optionKey) => {
    setSelectedOption(optionKey)
    setCurrentStep('management')
  }

  const handleBack = () => {
    setCurrentStep('selection')
    setSelectedOption('')
  }

  // Selection Step
  if (currentStep === 'selection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 flex flex-col">
        
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-sm border-b px-6 py-6 flex-shrink-0 shadow-sm">
          <div className="max-w-7xl mx-auto text-center">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full">
                <Radio className="h-12 w-12 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Heretic's Radio Management System
                </h1>
                <p className="text-lg text-gray-600 mt-2">Choose your management module to get started</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
              {Object.entries(radioOptions).map(([key, option]) => {
                const IconComponent = option.icon
                const colors = option.color
                
                return (
                  <Card 
                    key={key}
                    className="cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 hover:scale-[1.02] backdrop-blur-sm animate-fade-in"
                    style={{ 
                      backgroundColor: `${colors.bg}${Math.round(colors.opacity * 255).toString(16).padStart(2, '0')}`,
                      borderColor: colors.bg,
                      color: colors.text,
                      boxShadow: `0 20px 50px ${colors.bg}60, 0 0 0 1px ${colors.bg}20`
                    }}
                    onClick={() => handleOptionSelect(key)}
                  >
                    <CardContent className="p-6">
                      
                      {/* Header with Icon */}
                      <div className="text-center mb-6">
                        <div className="relative inline-block">
                          <div 
                            className="p-4 rounded-xl mb-4 shadow-lg"
                            style={{ backgroundColor: `${colors.buttonBg}30` }}
                          >
                            <IconComponent 
                              className="w-12 h-12 animate-pulse" 
                              style={{ color: colors.text }}
                            />
                          </div>
                          <div 
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full border-2 border-white shadow-lg"
                            style={{ backgroundColor: colors.buttonBg }}
                          ></div>
                        </div>
                        <h3 
                          className="text-2xl font-bold mb-2" 
                          style={{ color: colors.text }}
                        >
                          {option.name}
                        </h3>
                      </div>
                      
                      {/* Description */}
                      <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 mb-6 border border-white/70 shadow-inner">
                        <p 
                          className="text-sm font-medium mb-4 text-center leading-relaxed" 
                          style={{ color: colors.text }}
                        >
                          {option.description}
                        </p>
                        
                        {/* Features Preview */}
                        <div className="grid grid-cols-2 gap-2">
                          {option.features.map((feature, index) => (
                            <div 
                              key={index}
                              className="bg-gradient-to-r from-white/80 to-white/60 rounded-lg p-2 text-center shadow-sm hover:shadow-md transition-shadow"
                            >
                              <div 
                                className="text-xs font-semibold"
                                style={{ color: colors.text }}
                              >
                                {feature}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      <Button 
                        className="w-full font-semibold transition-all duration-300 hover:shadow-xl animate-pulse"
                        style={{ 
                          backgroundColor: `${colors.buttonBg}${Math.round(0.95 * 255).toString(16).padStart(2, '0')}`,
                          color: colors.buttonText,
                          border: 'none',
                          boxShadow: `0 8px 25px ${colors.buttonBg}40`
                        }}
                      >
                        <Crown className="w-4 h-4 mr-2" />
                        Enter {option.name}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            
            {/* Quick Stats Section */}
            <Card className="bg-white/80 backdrop-blur-sm border-2 border-purple-200 shadow-xl">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-center mb-6 text-purple-900">
                  <Activity className="w-6 h-6 inline mr-2" />
                  Station Overview
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
                    <Headphones className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <div className="font-bold text-2xl text-blue-900">24/7</div>
                    <div className="text-sm text-blue-700">Live Coverage</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-100 to-green-200 rounded-xl">
                    <Users className="w-8 h-8 mx-auto mb-2 text-green-600" />
                    <div className="font-bold text-2xl text-green-900">Global</div>
                    <div className="text-sm text-green-700">DJ Network</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
                    <Globe className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                    <div className="font-bold text-2xl text-purple-900">8</div>
                    <div className="text-sm text-purple-700">Time Zones</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl">
                    <BarChart3 className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                    <div className="font-bold text-2xl text-orange-900">Live</div>
                    <div className="text-sm text-orange-700">Analytics</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Management Step - Apply chosen option's color theme
  const option = radioOptions[selectedOption]
  const colors = option?.color || radioOptions.schedule.color

  return (
    <div 
      className="min-h-screen flex flex-col"
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
            onClick={handleBack} 
            className="shadow-md hover:shadow-lg transition-shadow"
            style={{
              backgroundColor: 'rgba(255,255,255,0.9)',
              borderColor: colors.buttonBg,
              color: colors.text
            }}
          >
            ← Back to Options
          </Button>
          <div className="text-center">
            <h1 
              className="text-xl font-bold flex items-center gap-2" 
              style={{ color: colors.text }}
            >
              <option.icon className="w-6 h-6" />
              {option.name}
            </h1>
          </div>
          <div></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Beautiful Chosen Option Display */}
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
              Active Management Module
            </h2>
          </div>
          
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
                
                {/* Header with Icon */}
                <div className="text-center mb-4">
                  <option.icon 
                    className="w-12 h-12 mx-auto mb-3 animate-pulse" 
                    style={{ color: colors.text }}
                  />
                  <h3 
                    className="text-2xl font-bold" 
                    style={{ color: colors.text }}
                  >
                    {option.name}
                  </h3>
                </div>
                
                {/* Description */}
                <div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 mb-4 border border-white/70 shadow-lg">
                  <p 
                    className="text-sm font-medium mb-3 text-center" 
                    style={{ color: colors.text }}
                  >
                    {option.description}
                  </p>
                  
                  {/* Features grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {option.features.map((feature, index) => (
                      <div 
                        key={index}
                        className="bg-gradient-to-r from-white/80 to-white/60 rounded-lg p-2 text-center shadow-sm"
                      >
                        <div 
                          className="text-xs font-semibold"
                          style={{ color: colors.text }}
                        >
                          {feature}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Management Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-6">
          <div className="h-full">
            
            {/* Go Live Button */}
            <div className="mb-6 text-center">
              <Button 
                size="lg"
                className="shadow-xl hover:shadow-2xl transition-all duration-300 animate-pulse font-bold px-8 py-4 text-lg"
                style={{
                  backgroundColor: colors.buttonBg,
                  color: colors.buttonText,
                  border: 'none',
                  boxShadow: `0 10px 30px ${colors.buttonBg}50`
                }}
                onClick={() => {
                  // Add your go-live logic here
                  alert(`Going live with ${option.name}! Your radio management system is now active.`)
                }}
              >
                🚀 Go Live with {option.name}
              </Button>
            </div>
            {selectedOption === 'schedule' && (
              <Card className="h-full bg-white/95 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <CardTitle 
                    className="flex items-center gap-2" 
                    style={{ color: colors.text }}
                  >
                    <Calendar className="h-5 w-5" />
                    Advanced Schedule Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full overflow-auto">
                  <TimezoneSlotAssignment />
                </CardContent>
              </Card>
            )}
            
            {selectedOption === 'personnel' && (
              <Card className="h-full bg-white/95 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <CardTitle 
                    className="flex items-center gap-2" 
                    style={{ color: colors.text }}
                  >
                    <Users className="h-5 w-5" />
                    Personnel & DJ Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full overflow-auto">
                  <AdminRadioManagement />
                </CardContent>
              </Card>
            )}
            
            {selectedOption === 'global' && (
              <Card className="h-full bg-white/95 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <CardTitle 
                    className="flex items-center gap-2" 
                    style={{ color: colors.text }}
                  >
                    <Globe className="h-5 w-5" />
                    Global DJ Scheduler
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full overflow-auto">
                  <GlobalDJScheduler />
                </CardContent>
              </Card>
            )}
            
            {selectedOption === 'admin' && (
              <Card className="h-full bg-white/95 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <CardTitle 
                    className="flex items-center gap-2" 
                    style={{ color: colors.text }}
                  >
                    <Settings className="h-5 w-5" />
                    Administrative Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full overflow-auto">
                  <AdminRadioManagement />
                </CardContent>
              </Card>
            )}
            
            {selectedOption === 'analytics' && (
              <Card className="h-full bg-white/95 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <CardTitle 
                    className="flex items-center gap-2" 
                    style={{ color: colors.text }}
                  >
                    <BarChart3 className="h-5 w-5" />
                    Station Analytics & Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full overflow-auto">
                  <StationStats />
                </CardContent>
              </Card>
            )}
            
            {selectedOption === 'profiles' && (
              <Card className="h-full bg-white/95 backdrop-blur-sm shadow-xl">
                <CardHeader>
                  <CardTitle 
                    className="flex items-center gap-2" 
                    style={{ color: colors.text }}
                  >
                    <Mic className="h-5 w-5" />
                    DJ Profile Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-full overflow-auto p-6">
                  <div className="space-y-6">
                    <div className="text-center">
                      <Button
                        onClick={() => setShowDJProfileForm(true)}
                        size="lg"
                        className="shadow-lg hover:shadow-xl transition-all duration-200"
                        style={{
                          backgroundColor: colors.buttonBg,
                          color: colors.buttonText,
                          border: 'none'
                        }}
                      >
                        <UserPlus className="w-5 h-5 mr-2" />
                        Create New DJ Profile
                      </Button>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {/* DJ Profile cards would go here */}
                      <Card className="p-4 border-2 border-dashed border-gray-300 text-center">
                        <div className="text-gray-500">
                          <Mic className="w-12 h-12 mx-auto mb-2" />
                          <p>DJ profiles will appear here</p>
                        </div>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* DJ Profile Creation Dialog */}
      <CreateDJProfileForm 
        open={showDJProfileForm} 
        onClose={() => setShowDJProfileForm(false)} 
      />
    </div>
  )
}