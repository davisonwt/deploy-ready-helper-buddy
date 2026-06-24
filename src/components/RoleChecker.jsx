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
    hasAccess: false,
    userRoles: [],
    user: null
  }
  
  _isMounted = false

  async componentDidMount() {
    this._isMounted = true
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        const { allowedRoles = [] } = this.props
        const roles = await this.fetchRoles(session.user.id)
        const hasAccess = await this.checkAllowedRole(session.user.id, allowedRoles, roles)
        if (this._isMounted) {
          this.setState({
            loading: false,
            isAuthenticated: true,
            user: session.user,
            hasAccess,
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
        this.setState({ loading: false, isAuthenticated: false, hasAccess: false })
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

  checkAllowedRole = async (userId, allowedRoles, roles) => {
    if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) return true

    const normalizedAllowedRoles = allowedRoles.map((role) => String(role).toLowerCase())
    if (normalizedAllowedRoles.some((role) => roles.includes(role))) return true

    try {
      const checks = await Promise.all(
        normalizedAllowedRoles.map((role) =>
          supabase.rpc('has_role', { _user_id: userId, _role: role })
        )
      )

      return checks.some(({ data, error }) => !error && data === true)
    } catch (err) {
      console.error('Failed to verify allowed role:', err)
      return false
    }
  }

  render() {
    const { loading, isAuthenticated, hasAccess } = this.state
    const { children } = this.props

    if (loading) {
      return <LoadingSpinner full text="Loading permissions..." />
    }

    if (!isAuthenticated) {
      return <Navigate to="/login" replace />
    }

    if (!hasAccess) {
      return <Navigate to="/dashboard" replace />
    }

    return <>{children}</>
  }
}

export default RoleChecker
