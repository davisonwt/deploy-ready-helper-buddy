import { useEffect, useState } from 'react'
import { VoiceCommands } from './voice/VoiceCommands'
import { MyGardenPanel } from './MyGardenPanel'
import { LetItRainPanel } from './LetItRainPanel'
import { SupportPanel } from './SupportPanel'
import { GosatPanel } from './GosatPanel'
import { useAppContext } from '../contexts/AppContext'
import { getCurrentTheme } from '@/utils/dashboardThemes'
import { JitsiVideoWindow, startJitsiCall } from './video/JitsiVideoWindow'

function Layout({ children }) {
  const { voiceCommandsEnabled, setVoiceCommandsEnabled } = useAppContext()
  const [showVoiceCommands, setShowVoiceCommands] = useState(false)
  const [isGardenOpen, setIsGardenOpen] = useState(false)
  const [isLetItRainOpen, setIsLetItRainOpen] = useState(false)
  const [isSupportOpen, setIsSupportOpen] = useState(false)
  const [isGosatOpen, setIsGosatOpen] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme())
  const [jitsiCall, setJitsiCall] = useState(null)

  useEffect(() => {
    const handleJitsiStart = (event) => {
      setJitsiCall(event.detail)
    }

    window.addEventListener('jitsi-start-call', handleJitsiStart)
    return () => window.removeEventListener('jitsi-start-call', handleJitsiStart)
  }, [])

  useEffect(() => {
    const open = () => setIsLetItRainOpen(true)
    window.addEventListener('s2g-open-let-it-rain', open)
    return () => window.removeEventListener('s2g-open-let-it-rain', open)
  }, [])

  useEffect(() => {
    const openGarden = () => setIsGardenOpen(true)
    const openSupport = () => setIsSupportOpen(true)
    const openGosat = () => setIsGosatOpen(true)

    window.addEventListener('s2g-open-my-garden', openGarden)
    window.addEventListener('s2g-open-support', openSupport)
    window.addEventListener('s2g-open-gosat', openGosat)

    return () => {
      window.removeEventListener('s2g-open-my-garden', openGarden)
      window.removeEventListener('s2g-open-support', openSupport)
      window.removeEventListener('s2g-open-gosat', openGosat)
    }
  }, [])

  useEffect(() => {
    const themeInterval = setInterval(() => {
      setCurrentTheme(getCurrentTheme())
    }, 2 * 60 * 60 * 1000)

    return () => clearInterval(themeInterval)
  }, [])

  return (
    <div className="min-h-screen" style={{ background: currentTheme.background }}>
      {children}

      <VoiceCommands
        isEnabled={voiceCommandsEnabled}
        onToggle={() => setVoiceCommandsEnabled(!voiceCommandsEnabled)}
        isOpen={showVoiceCommands}
        onOpenChange={setShowVoiceCommands}
      />

      <MyGardenPanel isOpen={isGardenOpen} onClose={() => setIsGardenOpen(false)} />
      <LetItRainPanel isOpen={isLetItRainOpen} onClose={() => setIsLetItRainOpen(false)} />
      <SupportPanel isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} />
      <GosatPanel isOpen={isGosatOpen} onClose={() => setIsGosatOpen(false)} />

      {jitsiCall && (
        <JitsiVideoWindow
          isOpen={!!jitsiCall}
          roomName={jitsiCall.roomName}
          displayName={jitsiCall.displayName}
          password={jitsiCall.password}
          onClose={() => setJitsiCall(null)}
        />
      )}
    </div>
  )
}

export default Layout

if (typeof window !== 'undefined') {
  window.startJitsiCall = startJitsiCall
  window.startJitsi = startJitsiCall
}