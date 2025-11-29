import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useUserRoles } from '@/hooks/useUserRoles'
import { LoadingSpinner } from '@/components/LoadingSpinner'

// Inner component that uses hooks - only rendered after React dispatcher is ready
function RoleCheckerInner({ children, allowedRoles = [] }) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { hasRole, loading: rolesLoading } = useUserRoles()

  if (authLoading || rolesLoading) {
    return <LoadingSpinner full text="Loading permissions..." />
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const hasRequiredRole = Array.isArray(allowedRoles) && allowedRoles.length > 0
    ? allowedRoles.some((r) => hasRole(r))
    : true

  if (!hasRequiredRole) {
    return <Navigate to="/dashboard" replace />
  }
  
  return <>{children}</>
}

// Class component wrapper that delays rendering without using hooks
class RoleCheckerWrapper extends React.Component {
  constructor(props) {
    super(props)
    this.state = { ready: false }
    this.timeoutId = null
    this.idleCallbackId = null
  }

  componentDidMount() {
    // Delay rendering to ensure React's dispatcher is fully initialized
    // This prevents "dispatcher is null" errors during lazy loading
    // Using a longer delay (500ms) to ensure React is completely ready
    const scheduleRender = () => {
      if ('requestIdleCallback' in window) {
        this.idleCallbackId = requestIdleCallback(() => {
          this.setState({ ready: true })
        }, { timeout: 500 })
      } else {
        this.timeoutId = setTimeout(() => {
          this.setState({ ready: true })
        }, 500)
      }
    }
    
    scheduleRender()
  }

  componentWillUnmount() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }
    if (this.idleCallbackId && 'cancelIdleCallback' in window) {
      cancelIdleCallback(this.idleCallbackId)
    }
  }

  render() {
    if (!this.state.ready) {
      return <LoadingSpinner full text="Initializing permissions..." />
    }
    
    return (
      <RoleCheckerInner allowedRoles={this.props.allowedRoles}>
        {this.props.children}
      </RoleCheckerInner>
    )
  }
}

export default function RoleChecker({ children, allowedRoles = [] }) {
  return (
    <RoleCheckerWrapper allowedRoles={allowedRoles}>
      {children}
    </RoleCheckerWrapper>
  )
}
