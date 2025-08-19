import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface AppContextType {
  showOnboarding: boolean
  setShowOnboarding: (show: boolean) => void
  showGamificationHUD: boolean
  setShowGamificationHUD: (show: boolean) => void
  voiceCommandsEnabled: boolean
  setVoiceCommandsEnabled: (enabled: boolean) => void
  isFirstVisit: boolean
  setIsFirstVisit: (isFirst: boolean) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showGamificationHUD, setShowGamificationHUD] = useState(false)
  const [voiceCommandsEnabled, setVoiceCommandsEnabled] = useState(false)
  const [isFirstVisit, setIsFirstVisit] = useState(false)

  useEffect(() => {
    // Check if this is the user's first visit
    const hasVisited = localStorage.getItem('sow2grow-has-visited')
    const voiceEnabled = localStorage.getItem('sow2grow-voice-enabled') === 'true'
    
    if (!hasVisited) {
      setIsFirstVisit(true)
      setShowOnboarding(true)
      localStorage.setItem('sow2grow-has-visited', 'true')
    }

    setVoiceCommandsEnabled(voiceEnabled)
  }, [])

  const handleSetVoiceCommandsEnabled = (enabled: boolean) => {
    setVoiceCommandsEnabled(enabled)
    localStorage.setItem('sow2grow-voice-enabled', enabled.toString())
  }

  const value = {
    showOnboarding,
    setShowOnboarding,
    showGamificationHUD,
    setShowGamificationHUD,
    voiceCommandsEnabled,
    setVoiceCommandsEnabled: handleSetVoiceCommandsEnabled,
    isFirstVisit,
    setIsFirstVisit
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider')
  }
  return context
}