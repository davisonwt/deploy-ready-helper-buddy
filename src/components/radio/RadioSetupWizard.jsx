import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { 
  Users, 
  MessageSquare, 
  Phone, 
  DollarSign, 
  Settings, 
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Mic,
  Radio,
  Star,
  Crown,
  Headphones,
  Volume2
} from 'lucide-react'

const LAYOUT_OPTIONS = [
  {
    id: 'solo',
    name: 'Solo Show',
    description: 'Perfect for single host shows with full control',
    icon: Mic,
    features: ['Single Host', 'Full Control', 'Listener Interaction', 'Music Integration'],
    color: '#FFE156'
  },
  {
    id: 'duo',
    name: 'Co-Host Show',
    description: 'Two hosts working together with shared controls',
    icon: Users,
    features: ['2 Hosts', 'Shared Controls', 'Interactive Segments', 'Guest Management'],
    color: '#B9FBC0'
  },
  {
    id: 'talkshow',
    name: 'Talk Show',
    description: 'Multiple guests, call-ins, and dynamic discussions',
    icon: MessageSquare,
    features: ['Multiple Guests', 'Call-in System', 'Live Chat', 'Moderation Tools'],
    color: '#D5AAFF'
  },
  {
    id: 'commercial',
    name: 'Commercial Show',
    description: 'Business-focused with advertising slots and sponsorships',
    icon: DollarSign,
    features: ['Ad Slots', 'Sponsorships', 'Business Guests', 'Premium Features'],
    color: '#FFB7B7'
  }
]

const STEPS = [
  { id: 'layout', title: 'Choose Layout', icon: Settings },
  { id: 'hosts', title: 'Configure Hosts', icon: Users },
  { id: 'interaction', title: 'Listener Options', icon: MessageSquare },
  { id: 'monetization', title: 'Monetization', icon: DollarSign },
  { id: 'review', title: 'Review & Launch', icon: CheckCircle }
]

export default function RadioSetupWizard({ onComplete, colors }) {
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [config, setConfig] = useState({
    layout: '',
    showName: '',
    description: '',
    hosts: [{ name: '', role: 'main' }],
    allowMessages: false,
    allowCallIns: false,
    moderateMessages: true,
    enableAdvertising: false,
    adSlotPrice: 50,
    maxAdSlots: 3,
    features: []
  })

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const addHost = () => {
    setConfig(prev => ({
      ...prev,
      hosts: [...prev.hosts, { name: '', role: 'co-host' }]
    }))
  }

  const updateHost = (index, field, value) => {
    setConfig(prev => ({
      ...prev,
      hosts: prev.hosts.map((host, i) => 
        i === index ? { ...host, [field]: value } : host
      )
    }))
  }

  const removeHost = (index) => {
    setConfig(prev => ({
      ...prev,
      hosts: prev.hosts.filter((_, i) => i !== index)
    }))
  }

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const completeSetup = () => {
    toast({
      title: "Radio Show Setup Complete!",
      description: `${config.showName} is ready to go live!`,
    })
    onComplete?.(config)
  }

  const renderLayoutStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Choose Your Show Layout</h2>
        <p className="text-gray-600">Select the format that best fits your radio show style</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LAYOUT_OPTIONS.map((layout) => {
          const IconComponent = layout.icon
          const isSelected = config.layout === layout.id
          
          return (
            <Card
              key={layout.id}
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
                isSelected ? 'ring-2 ring-blue-500 shadow-lg' : ''
              }`}
              style={{
                backgroundColor: isSelected ? `${layout.color}20` : 'white',
                borderColor: isSelected ? layout.color : '#e5e7eb'
              }}
              onClick={() => updateConfig('layout', layout.id)}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: `${layout.color}30` }}
                  >
                    <IconComponent className="w-6 h-6" style={{ color: layout.color }} />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-2">{layout.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{layout.description}</p>
                    
                    <div className="flex flex-wrap gap-2">
                      {layout.features.map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {isSelected && (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="showName">Show Name *</Label>
          <Input
            id="showName"
            placeholder="Enter your radio show name"
            value={config.showName}
            onChange={(e) => updateConfig('showName', e.target.value)}
          />
        </div>
        
        <div>
          <Label htmlFor="description">Show Description</Label>
          <Textarea
            id="description"
            placeholder="Describe your show's theme and content"
            value={config.description}
            onChange={(e) => updateConfig('description', e.target.value)}
          />
        </div>
      </div>
    </div>
  )

  const renderHostsStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Configure Your Hosts</h2>
        <p className="text-gray-600">Set up your main host and co-hosts</p>
      </div>

      <div className="space-y-4">
        {config.hosts.map((host, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Host Name</Label>
                  <Input
                    placeholder="Enter host name"
                    value={host.name}
                    onChange={(e) => updateHost(index, 'name', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label>Role</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={host.role}
                    onChange={(e) => updateHost(index, 'role', e.target.value)}
                  >
                    <option value="main">Main Host</option>
                    <option value="co-host">Co-Host</option>
                    <option value="guest">Regular Guest</option>
                  </select>
                </div>
              </div>
              
              {index > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeHost(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </Button>
              )}
            </div>
          </Card>
        ))}

        <Button onClick={addHost} variant="outline" className="w-full">
          <Users className="w-4 h-4 mr-2" />
          Add Co-Host
        </Button>
      </div>
    </div>
  )

  const renderInteractionStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Listener Interaction Options</h2>
        <p className="text-gray-600">Configure how listeners can interact with your show</p>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              <div>
                <h3 className="font-semibold">Live Chat Messages</h3>
                <p className="text-sm text-gray-600">Allow listeners to send text messages during the show</p>
              </div>
            </div>
            <Switch
              checked={config.allowMessages}
              onCheckedChange={(checked) => updateConfig('allowMessages', checked)}
            />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-green-500" />
              <div>
                <h3 className="font-semibold">Phone-in / Voice Calls</h3>
                <p className="text-sm text-gray-600">Allow listeners to join the conversation via voice calls</p>
              </div>
            </div>
            <Switch
              checked={config.allowCallIns}
              onCheckedChange={(checked) => updateConfig('allowCallIns', checked)}
            />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-purple-500" />
              <div>
                <h3 className="font-semibold">Message Moderation</h3>
                <p className="text-sm text-gray-600">Review messages before they appear live</p>
              </div>
            </div>
            <Switch
              checked={config.moderateMessages}
              onCheckedChange={(checked) => updateConfig('moderateMessages', checked)}
            />
          </div>
        </Card>

        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Volume2 className="w-5 h-5 text-blue-500 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900">ChatApp Integration</h3>
              <p className="text-sm text-blue-700 mb-3">
                Listeners can use the ChatApp button on the radio interface to join voice conversations,
                send messages, or request to speak during your show.
              </p>
              <div className="flex gap-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">Voice Requests</Badge>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">Live Chat</Badge>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">Guest Queue</Badge>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )

  const renderMonetizationStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Monetization Options</h2>
        <p className="text-gray-600">Set up advertising slots and business features</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-green-500" />
            <div>
              <h3 className="font-semibold">Enable Advertising Slots</h3>
              <p className="text-sm text-gray-600">Allow guests to purchase advertising time during your show</p>
            </div>
          </div>
          <Switch
            checked={config.enableAdvertising}
            onCheckedChange={(checked) => updateConfig('enableAdvertising', checked)}
          />
        </div>

        {config.enableAdvertising && (
          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Price per Ad Slot ($)</Label>
                <Input
                  type="number"
                  value={config.adSlotPrice}
                  onChange={(e) => updateConfig('adSlotPrice', parseInt(e.target.value) || 0)}
                  min="1"
                />
              </div>
              
              <div>
                <Label>Maximum Ad Slots per Show</Label>
                <Input
                  type="number"
                  value={config.maxAdSlots}
                  onChange={(e) => updateConfig('maxAdSlots', parseInt(e.target.value) || 1)}
                  min="1"
                  max="10"
                />
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">Business Guest Features</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Guests can purchase ad slots to promote their business</li>
                <li>• Automated payment processing through our platform</li>
                <li>• Professional ad slot scheduling and management</li>
                <li>• Revenue sharing with the radio station</li>
              </ul>
            </div>
          </div>
        )}
      </Card>
    </div>
  )

  const renderReviewStep = () => {
    const selectedLayout = LAYOUT_OPTIONS.find(l => l.id === config.layout)
    
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Review Your Setup</h2>
          <p className="text-gray-600">Everything looks good? Let's go live!</p>
        </div>

        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Radio className="w-5 h-5" />
            {config.showName || 'Your Radio Show'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Show Details</h4>
              <div className="space-y-2 text-sm">
                <div><strong>Layout:</strong> {selectedLayout?.name}</div>
                <div><strong>Description:</strong> {config.description || 'No description'}</div>
                <div><strong>Hosts:</strong> {config.hosts.length}</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">Features Enabled</h4>
              <div className="space-y-2">
                {config.allowMessages && <Badge className="mr-2">Live Chat</Badge>}
                {config.allowCallIns && <Badge className="mr-2">Phone-ins</Badge>}
                {config.moderateMessages && <Badge className="mr-2">Moderation</Badge>}
                {config.enableAdvertising && <Badge className="mr-2">Advertising</Badge>}
              </div>
            </div>
          </div>

          {config.enableAdvertising && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-900">Monetization Active</h4>
              <p className="text-sm text-green-700">
                ${config.adSlotPrice} per slot • Max {config.maxAdSlots} slots per show
              </p>
            </div>
          )}
        </Card>

        <div className="text-center">
          <Button
            size="lg"
            onClick={completeSetup}
            className="px-8 py-4 text-lg font-bold"
            style={{
              backgroundColor: colors?.buttonBg || '#957DAD',
              color: colors?.buttonText || '#FFFFFF'
            }}
          >
            <Crown className="w-5 h-5 mr-2" />
            Launch Your Show!
          </Button>
        </div>
      </div>
    )
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return renderLayoutStep()
      case 1: return renderHostsStep()
      case 2: return renderInteractionStep()
      case 3: return renderMonetizationStep()
      case 4: return renderReviewStep()
      default: return renderLayoutStep()
    }
  }

  const currentStepData = STEPS[currentStep]
  const isLastStep = currentStep === STEPS.length - 1
  const canProceed = config.layout && config.showName

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon
            const isActive = index === currentStep
            const isCompleted = index < currentStep
            
            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                    isActive
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : isCompleted
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-300 text-gray-400'
                  }`}
                >
                  <StepIcon className="w-5 h-5" />
                </div>
                <div className="ml-2 hidden md:block">
                  <div className={`text-sm font-semibold ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                    {step.title}
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-4 ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <Card className="mb-6">
        <CardContent className="p-8">
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        {!isLastStep ? (
          <Button
            onClick={nextStep}
            disabled={!canProceed}
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}