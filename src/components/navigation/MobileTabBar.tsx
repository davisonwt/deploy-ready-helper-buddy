import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Search, Plus, Sprout, User } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'

interface MobileTabBarProps {
  onOpenGarden: () => void
}

export function MobileTabBar({ onOpenGarden }: MobileTabBarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  
  // Only show on mobile
  if (!isMobile) {
    return null
  }
  
  const tabs = [
    { 
      id: 'home', 
      icon: Home, 
      label: 'Home', 
      action: () => navigate('/dashboard'),
      isActive: location.pathname === '/dashboard' || location.pathname === '/'
    },
    { 
      id: 'explore', 
      icon: Search, 
      label: 'Explore', 
      action: () => navigate('/browse-orchards'),
      isActive: location.pathname === '/browse-orchards'
    },
    { 
      id: 'create', 
      icon: Plus, 
      label: 'Create', 
      action: () => navigate('/create-orchard'),
      isActive: location.pathname === '/create-orchard',
      highlight: true
    },
    { 
      id: 'garden', 
      icon: Sprout, 
      label: 'Garden', 
      action: onOpenGarden,
      isActive: false
    },
    { 
      id: 'profile', 
      icon: User, 
      label: 'Profile', 
      action: () => navigate('/profile'),
      isActive: location.pathname === '/profile'
    },
  ]
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={tab.action}
              className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-all duration-200 ${
                tab.isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.highlight ? (
                <div className="flex items-center justify-center w-12 h-12 -mt-6 rounded-full bg-primary text-primary-foreground shadow-lg">
                  <Icon className="h-6 w-6" />
                </div>
              ) : (
                <>
                  <Icon className={`h-5 w-5 ${tab.isActive ? 'scale-110' : ''}`} />
                  <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
                </>
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
