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
  /**
   * True while a stall interior (StallInteriorView) is open full-screen --
   * App.tsx reads this to hide the global FloatingBasketButton,
   * WalletBalanceChip and GroundskeeperWidget (the pine-tree FAB), none of
   * which the interior's own fixed bottom tile strip has room to coexist
   * with. Farm-Stalls batch 2, item 1.
   */
  stallInteriorOpen: boolean
  setStallInteriorOpen: (open: boolean) => void
  /**
   * True while a WizardContainer-based flow (StallBuildPage's "Edit your
   * stall", /sow/* etc.) is on screen -- its own Back/Next/Submit bar sits
   * at the bottom of a short, single-column page, exactly where
   * NotificationBanner/PayoutSetupBanner's fixed bottom-right corner nudge
   * lands, so first-time users could get their wizard-navigation taps
   * swallowed by an unrelated "Enable Notifications" card. Those banners
   * hide themselves while this is true, matching stallInteriorOpen's
   * precedent above.
   */
  wizardOpen: boolean
  setWizardOpen: (open: boolean) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showGamificationHUD, setShowGamificationHUD] = useState(false)
  const [voiceCommandsEnabled, setVoiceCommandsEnabled] = useState(false)
  const [isFirstVisit, setIsFirstVisit] = useState(false)
  const [stallInteriorOpen, setStallInteriorOpen] = useState(false)
  const [wizardOpen, setWizardOpen] = useState(false)

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
    setIsFirstVisit,
    stallInteriorOpen,
    setStallInteriorOpen,
    wizardOpen,
    setWizardOpen
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