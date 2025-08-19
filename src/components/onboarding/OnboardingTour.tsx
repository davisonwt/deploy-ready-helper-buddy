import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Play, X, MapPin, Users, Calendar, ChevronRight, BookOpen, Lightbulb, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface Step {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  action?: () => void
  progress?: number
}

interface OnboardingTourProps {
  isVisible: boolean
  onClose: () => void
  onComplete: () => void
}

export function OnboardingTour({ isVisible, onClose, onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const steps: Step[] = [
    {
      id: "welcome",
      title: "Welcome to Sow2Grow!",
      description: "Your gateway to agricultural crowdfunding and community building in the 364yhvh community. Let's take a quick tour to get you started.",
      icon: <Users className="h-8 w-8 text-primary" />,
    },
    {
      id: "orchards",
      title: "Discover Orchards",
      description: "Browse and support agricultural projects from community members. Each orchard represents a real farming initiative that needs your support.",
      icon: <MapPin className="h-8 w-8 text-green-600" />,
      action: () => window.location.href = "/browse-orchards"
    },
    {
      id: "create",
      title: "Create Your Own Orchard",
      description: "Have a farming project? Create your own orchard to receive funding and support from the community. Share your vision and watch it grow!",
      icon: <Target className="h-8 w-8 text-blue-600" />,
      action: () => window.location.href = "/create-orchard"
    },
    {
      id: "community",
      title: "Join the Community",
      description: "Connect with other farmers, share videos, and chat with community members. Learn from experienced growers and share your knowledge.",
      icon: <BookOpen className="h-8 w-8 text-purple-600" />,
      action: () => window.location.href = "/community-videos"
    },
    {
      id: "ai",
      title: "AI Marketing Assistant",
      description: "Use our AI-powered tools to create compelling content for your orchards. Generate scripts, marketing tips, thumbnails, and content ideas.",
      icon: <Lightbulb className="h-8 w-8 text-yellow-600" />,
      action: () => window.location.href = "/ai-assistant"
    },
    {
      id: "gamification",
      title: "Track Your Progress",
      description: "Earn points and achievements as you participate in the community. Level up by creating orchards, supporting others, and engaging with content.",
      icon: <Play className="h-8 w-8 text-orange-600" />,
    }
  ]

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex)
  }

  const progress = ((currentStep + 1) / steps.length) * 100

  if (!isVisible) return null

  const currentStepData = steps[currentStep]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 50 }}
        className="relative max-w-2xl w-full mx-4 bg-background rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary/10 to-secondary/10 p-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 hover-scale"
          >
            <X className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center space-x-4 mb-4">
            {currentStepData.icon}
            <div>
              <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
              <p className="text-sm text-muted-foreground">
                Step {currentStep + 1} of {steps.length}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <p className="text-lg text-muted-foreground leading-relaxed">
                {currentStepData.description}
              </p>

              {/* Step Navigation */}
              <div className="grid grid-cols-6 gap-2">
                {steps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => goToStep(index)}
                    className={`p-2 rounded-lg text-xs transition-all hover-scale ${
                      index === currentStep
                        ? 'bg-primary text-primary-foreground'
                        : index < currentStep
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-1">
                      <div className="scale-75">{step.icon}</div>
                      <span className="truncate w-full">{step.title.split(' ')[0]}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Action Button */}
              {currentStepData.action && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Ready to explore?</h4>
                        <p className="text-sm text-muted-foreground">
                          Click to go to this feature now
                        </p>
                      </div>
                      <Button
                        onClick={currentStepData.action}
                        className="hover-scale"
                      >
                        Explore
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 bg-muted/30">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            Previous
          </Button>
          
          <div className="flex space-x-2">
            <Button variant="ghost" onClick={onClose}>
              Skip Tour
            </Button>
            <Button onClick={nextStep}>
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}