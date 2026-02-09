import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BackButtonProps {
  className?: string
}

export function BackButton({ className = '' }: BackButtonProps) {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Hide on dashboard and root
  const hiddenPaths = ['/', '/dashboard']
  if (hiddenPaths.includes(location.pathname)) {
    return null
  }
  
  const handleBack = () => {
    // Try to go back in history, fallback to dashboard
    if (window.history.length > 2) {
      navigate(-1)
    } else {
      navigate('/dashboard')
    }
  }
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={`flex items-center gap-2 text-sm font-medium hover:bg-accent/20 ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="hidden sm:inline">Back</span>
    </Button>
  )
}
