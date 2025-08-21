import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/use-toast'

export const ProfileRedirect = ({ children }) => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    if (!loading && user) {
      // Check if user is missing essential location/timezone info
      const missingInfo = !user.country || !user.timezone || !user.location
      
      // Don't redirect if already on profile page
      const isOnProfilePage = window.location.pathname === '/profile'
      
      if (missingInfo && !isOnProfilePage) {
        toast({
          title: "Complete Your Profile",
          description: "We need your location and timezone information to provide you with the best experience.",
          duration: 5000,
        })
        
        // Small delay to show the toast before redirect
        setTimeout(() => {
          navigate('/profile', { 
            state: { 
              message: "Please complete your location and timezone information",
              requiredFields: ['country', 'timezone', 'location']
            }
          })
        }, 1000)
      }
    }
  }, [user, loading, navigate, toast])

  return children
}