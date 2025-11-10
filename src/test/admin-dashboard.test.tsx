import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AdminDashboardPage from '@/pages/AdminDashboardPage'

// Mock hooks
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-123', email: 'admin@test.com' },
    loading: false,
    isAuthenticated: true,
  })),
}))

vi.mock('@/hooks/useRoles', () => ({
  useRoles: vi.fn(() => ({
    roles: ['admin'],
    loading: false,
    error: null,
    refetch: vi.fn(),
    hasRole: vi.fn((role: string) => role === 'admin'),
    isAdmin: true,
    isGosat: false,
    isAdminOrGosat: true,
    fetchAllUsers: vi.fn(async () => ({ success: true, data: [] })),
    grantRole: vi.fn(async () => ({ success: true })),
    revokeRole: vi.fn(async () => ({ success: true })),
  })),
}))

// Mock child components to avoid deep rendering
vi.mock('@/components/admin/EnhancedAnalyticsDashboard', () => ({
  EnhancedAnalyticsDashboard: () => <div>Analytics Dashboard</div>,
}))

vi.mock('@/components/admin/UserManagementDashboard', () => ({
  UserManagementDashboard: () => <div>User Management</div>,
}))

vi.mock('@/components/AdminPaymentDashboard', () => ({
  AdminPaymentDashboard: () => <div>Payment Dashboard</div>,
}))

vi.mock('@/components/admin/ContentModerationDashboard', () => ({
  ContentModerationDashboard: () => <div>Content Moderation</div>,
}))

vi.mock('@/components/admin/OrganizationWalletSetup', () => ({
  OrganizationWalletSetup: () => <div>Wallet Setup</div>,
}))

describe('AdminDashboardPage - Rules of Hooks Compliance', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    vi.clearAllMocks()
  })

  it('renders without crashing and calls useRoles exactly once at top level', () => {
    const { useRoles } = require('@/hooks/useRoles')
    
    const { getByText } = render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AdminDashboardPage />
        </QueryClientProvider>
      </BrowserRouter>
    )

    // useRoles should have been called exactly once (top-level, unconditionally)
    expect(useRoles).toHaveBeenCalledTimes(1)
    
    // Page should render admin content
    expect(getByText('Admin Dashboard')).toBeInTheDocument()
  })

  it('displays loading state while roles are loading', () => {
    const { useRoles } = require('@/hooks/useRoles')
    useRoles.mockReturnValueOnce({
      roles: [],
      loading: true,
      error: null,
      refetch: vi.fn(),
      hasRole: vi.fn(),
      isAdmin: false,
      isGosat: false,
      isAdminOrGosat: false,
      fetchAllUsers: vi.fn(),
      grantRole: vi.fn(),
      revokeRole: vi.fn(),
    })

    const { getByText } = render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AdminDashboardPage />
        </QueryClientProvider>
      </BrowserRouter>
    )

    expect(getByText('Loading admin privileges...')).toBeInTheDocument()
  })

  it('displays access denied when user lacks permissions', () => {
    const { useRoles } = require('@/hooks/useRoles')
    useRoles.mockReturnValueOnce({
      roles: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
      hasRole: vi.fn(() => false),
      isAdmin: false,
      isGosat: false,
      isAdminOrGosat: false,
      fetchAllUsers: vi.fn(),
      grantRole: vi.fn(),
      revokeRole: vi.fn(),
    })

    const { getByText } = render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AdminDashboardPage />
        </QueryClientProvider>
      </BrowserRouter>
    )

    expect(getByText('Access Denied')).toBeInTheDocument()
    expect(getByText('You need gosat or admin privileges to access this page.')).toBeInTheDocument()
  })

  it('does not conditionally call hooks based on loading state', () => {
    const { useAuth } = require('@/hooks/useAuth')
    const { useRoles } = require('@/hooks/useRoles')

    render(
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AdminDashboardPage />
        </QueryClientProvider>
      </BrowserRouter>
    )

    // Both hooks should be called regardless of loading states
    expect(useAuth).toHaveBeenCalled()
    expect(useRoles).toHaveBeenCalled()
  })
})
