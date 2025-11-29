import React from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { LoadingSpinner } from '@/components/LoadingSpinner'

/**
 * Pure class component for role checking - avoids hooks entirely
 * to prevent "dispatcher is null" errors during flushSync navigation
 */
class RoleChecker extends React.Component {
  state = {
    loading: true,
    isAuthenticated: false,
    userRoles: [],
    user: null
  }
  
  _isMounted = false

  async componentDidMount() {
    this._isMounted = true
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const roles = await this.fetchRoles(session.user.id)
        if (this._isMounted) {
          this.setState({
            loading: false,
            isAuthenticated: true,
            user: session.user,
            userRoles: roles
          })
        }
      } else {
        if (this._isMounted) {
          this.setState({ loading: false, isAuthenticated: false })
        }
      }
    } catch (err) {
      console.error('RoleChecker auth error:', err)
      if (this._isMounted) {
        this.setState({ loading: false, isAuthenticated: false })
      }
    }
  }

  componentWillUnmount() {
    this._isMounted = false
  }

  fetchRoles = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
      
      if (error) throw error
      return (data || []).map(r => String(r.role).toLowerCase())
    } catch (err) {
      console.error('Failed to fetch roles:', err)
      return []
    }
  }

  render() {
    const { loading, isAuthenticated, userRoles } = this.state
    const { allowedRoles = [], children } = this.props

    if (loading) {
      return <LoadingSpinner full text="Loading permissions..." />
    }

    if (!isAuthenticated) {
      return <Navigate to="/login" replace />
    }

    const hasRequiredRole = Array.isArray(allowedRoles) && allowedRoles.length > 0
      ? allowedRoles.some(r => userRoles.includes(r.toLowerCase()))
      : true

    if (!hasRequiredRole) {
      return <Navigate to="/dashboard" replace />
    }

    return <>{children}</>
  }
}

export default RoleChecker
