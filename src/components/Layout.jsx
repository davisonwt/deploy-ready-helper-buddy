import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { useBasket } from "@/hooks/useBasket"
import { useState, useMemo, useEffect, Suspense, lazy } from 'react'
import { supabase } from "@/integrations/supabase/client"
import {
  Sprout, 
  Home, 
  Search, 
  Plus, 
  BarChart3, 
  Heart, 
  Gift, 
  Church, 
  User, 
  LogOut,
  Menu,
  X,
  HandHeart,
  ShoppingCart,
  MessageSquare,
  Users,
  Video,
  ChevronDown,
  Wallet,
  Settings,
  Cloud,
  Sparkles,
  
  Radio,
  Crown,
  Book,
  Library,
  Music,
  Calendar,
  Camera
} from "lucide-react"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"

import { ProgressButton } from "./gamification/ProgressButton"
import OnboardingTour from "./onboarding/OnboardingTour"

import { MyGardenPanel } from "./MyGardenPanel"
import { LetItRainPanel } from "./LetItRainPanel"

import { GosatPanel } from "./GosatPanel"
import { YHVHDaysPanel } from "./YHVHDaysPanel"
import { useAppContext } from "../contexts/AppContext"
import { getCurrentTheme } from '@/utils/dashboardThemes'
import { JitsiVideoWindow, startJitsiCall } from "./video/JitsiVideoWindow"
import { BackButton } from "./navigation/BackButton"
import { MobileTabBar } from "./navigation/MobileTabBar"

// Layout component as a standard function declaration to avoid any HOC/memo pitfalls
function Layout({ children }) {
  // All hooks must be at the top level
  const location = useLocation()
  const navigate = useNavigate()
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])
  const { user, logout } = useAuth()
  const { getTotalItems } = useBasket()
  const [isAdminOrGosat, setIsAdminOrGosat] = useState(false)
  const [rolesLoading, setRolesLoading] = useState(false)
  useEffect(() => {
    let active = true
    const load = async () => {
      if (!user?.id) { if (active) setIsAdminOrGosat(false); return }
      try {
        setRolesLoading(true)
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
        if (error) throw error
        const roles = (data || []).map(r => r.role)
        if (active) setIsAdminOrGosat(roles.includes('admin') || roles.includes('gosat'))
      } catch (e) {
        if (active) setIsAdminOrGosat(false)
        console.error('[Layout] roles fetch failed', e)
      } finally {
        if (active) setRolesLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [user?.id])
  const {
    showOnboarding, 
    setShowOnboarding, 
  } = useAppContext()
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  const [isGardenOpen, setIsGardenOpen] = useState(false)
  const [isLetItRainOpen, setIsLetItRainOpen] = useState(false)
  
  const [isGosatOpen, setIsGosatOpen] = useState(false)
  const [isYHVHDaysOpen, setIsYHVHDaysOpen] = useState(false)
  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme())
  const [jitsiCall, setJitsiCall] = useState(null)

  // Listen for Jitsi call start events
  useEffect(() => {
    const handleJitsiStart = (event) => {
      setJitsiCall(event.detail)
    }
    window.addEventListener('jitsi-start-call', handleJitsiStart)
    return () => {
      window.removeEventListener('jitsi-start-call', handleJitsiStart)
    }
  }, [])
  
  // Update theme every 2 hours
  useEffect(() => {
    const themeInterval = setInterval(() => {
      setCurrentTheme(getCurrentTheme());
    }, 2 * 60 * 60 * 1000); // 2 hours
    return () => clearInterval(themeInterval);
  }, []);
  
  const shouldShowAdminButton = useMemo(
    () => isAdminOrGosat && !rolesLoading,
    [isAdminOrGosat, rolesLoading]
  )
  
  const basketTotal = useMemo(() => getTotalItems(), [getTotalItems])
  
  const handleLogout = () => {
    logout()
    // Clear network caches on logout
    if (typeof window !== 'undefined') {
      window.clearRoleCache?.()
      // Clear any other app-level caches
      localStorage.removeItem('lastFetchTime')
    }
    navigate("/")
  }
  
  
  // Primary navigation (direct buttons) - colors will be set dynamically
  const primaryNavigation = [
    { name: "dashboard", href: "/dashboard", icon: Home, className: 'dashboard-tour' },
    { name: "chatapp", href: "/communications-hub", icon: MessageSquare, className: 'chatapp-tour' },
    { name: "s2g memry", href: "/memry", icon: Camera, className: 'memry-tour' },
  ]

  // Check if current path matches 364yhvh routes
  const isYHVHDaysActive = () => {
    const yhvhRoutes = ['/enochian-calendar-design', '/wheels-in-itself']
    return yhvhRoutes.some(route => location.pathname === route)
  }

  // Grouped navigation (dropdowns) - colors will be set dynamically
  // NOTE: "My Content" has been replaced with "My Garden" panel - removed from here
  const groupedNavigation = [
    {
      name: "Let It Rain",
      icon: Cloud, // Using Cloud icon to match My Garden button style
      className: 'tithing-tour',
      items: [
        { name: "Tithing", href: "/tithing", icon: HandHeart },
        { name: "Free-Will Gifting", href: "/free-will-gifting", icon: Gift }
      ]
    },
      ...(shouldShowAdminButton ? [{
        name: "gosat's", icon: Settings,
        items: [
          { name: "Admin Dashboard & Wallet Settings", href: "/admin/dashboard", icon: Settings },
          { name: "AOD Station Radio Management", href: "/admin/radio", icon: Radio },
          { name: "Organization Wallets", href: "/gosat/wallets", icon: Wallet },
          { name: "Seeds Management", href: "/admin/seeds", icon: Sprout }
        ]
      }] : [])
  ]

  // Check if current path is in any dropdown
  const isGroupActive = (group) => {
    return group.items.some(item => location.pathname === item.href)
  }

  // Check if current path matches any My Garden routes (for highlighting the button)
  const isGardenActive = () => {
    const gardenRoutes = [
      '/my-orchards',
      '/364yhvh-orchards',
      '/my-products',
      '/products',
      '/music-library',
      '/s2g-community-music',
      '/my-s2g-library',
      '/s2g-community-library',
      '/marketing-videos',
      '/create-orchard',
      '/products/upload'
    ]
    return gardenRoutes.some(route => location.pathname === route || location.pathname.startsWith(route + '/'))
  }
  
  const isActive = (href) => location.pathname === href
  
  return (
    <div className="min-h-screen" style={{ background: currentTheme.background }}>
      {/* Navigation Header */}
      <header 
        className="backdrop-blur-sm border-b sticky top-0 z-50"
        style={{
          backgroundColor: currentTheme.cardBg,
          borderColor: currentTheme.cardBorder,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Back Button - shows on sub-pages */}
            <div className="flex items-center gap-2">
              <BackButton className="mr-2" />
              
              {/* Logo */}
              <Link to="/dashboard" className="flex items-center space-x-3 group dashboard-tour">
                <div 
                  className="w-12 h-12 rounded-full overflow-hidden border-2 shadow-lg"
                  style={{ borderColor: currentTheme.accent }}
                >
                  <img 
                    src="/lovable-uploads/s2g-logo.jpg" 
                    alt="sow2grow logo" 
                    className="w-full h-full object-cover bg-transparent"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold font-playfair" style={{ color: currentTheme.textPrimary }}>
                    sow2grow
                  </h1>
                  <a href="https://www.364yhvh.org/" target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: currentTheme.textSecondary }} onClick={(e) => e.stopPropagation()}>364yhvh community farm</a>
                </div>
              </Link>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-2">
              {/* Primary Navigation Buttons */}
              {primaryNavigation.map((item) => {
                const Icon = item.icon
                const isItemActive = isActive(item.href)
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center justify-center px-3 py-2 text-xs font-medium transition-all duration-300 border-2 
                      hover:scale-105 active:scale-95 w-[140px] h-[40px] text-center dashboard-nav-button
                      ${isItemActive ? 'ring-2 ring-offset-1 transform translate-y-[-4px] shadow-lg' : 'hover:translate-y-[-2px]'}
                      ${item.className || ''}
                    `}
                    style={{
                      backgroundColor: isItemActive ? currentTheme.accent : currentTheme.secondaryButton,
                      borderColor: isItemActive ? currentTheme.accent : currentTheme.cardBorder,
                      color: isItemActive ? currentTheme.textPrimary : currentTheme.textPrimary,
                      borderRadius: '21px',
                      boxShadow: isItemActive
                        ? `0 8px 25px ${currentTheme.shadow}, inset 0 2px 4px rgba(0,0,0,0.1)` 
                        : 'inset 0 2px 4px rgba(0,0,0,0.1)',
                      ringColor: currentTheme.accent,
                    }}
                    onMouseEnter={(e) => {
                      if (!isItemActive) {
                        e.currentTarget.style.backgroundColor = currentTheme.accent;
                        e.currentTarget.style.borderColor = currentTheme.accent;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isItemActive) {
                        e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                        e.currentTarget.style.borderColor = currentTheme.cardBorder;
                      }
                    }}
                  >
                    <Icon className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate text-center leading-tight">{item.name}</span>
                  </Link>
                )
              })}

              {/* 364yhvh Days Button */}
              <button
                onClick={() => setIsYHVHDaysOpen(true)}
                className={`flex items-center justify-center px-3 py-2 text-xs font-medium transition-all duration-300 border-2 
                  hover:scale-105 active:scale-95 w-[140px] h-[40px] text-center dashboard-nav-button
                  ${isYHVHDaysActive() ? 'ring-2 ring-offset-1 transform translate-y-[-4px] shadow-lg' : 'hover:translate-y-[-2px]'}
                  calendar-tour
                `}
                style={{
                  backgroundColor: isYHVHDaysActive() ? currentTheme.accent : currentTheme.secondaryButton,
                  borderColor: isYHVHDaysActive() ? currentTheme.accent : currentTheme.cardBorder,
                  color: currentTheme.textPrimary,
                  borderRadius: '21px',
                  boxShadow: isYHVHDaysActive()
                    ? `0 8px 25px ${currentTheme.shadow}, inset 0 2px 4px rgba(0,0,0,0.1)` 
                    : 'inset 0 2px 4px rgba(0,0,0,0.1)',
                  ringColor: currentTheme.accent,
                }}
                onMouseEnter={(e) => {
                  if (!isYHVHDaysActive()) {
                    e.currentTarget.style.backgroundColor = currentTheme.accent;
                    e.currentTarget.style.borderColor = currentTheme.accent;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isYHVHDaysActive()) {
                    e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                    e.currentTarget.style.borderColor = currentTheme.cardBorder;
                  }
                }}
              >
                <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate text-center leading-tight">364yhvh days</span>
              </button>

              {/* My Garden Button - replaces old "My Content" dropdown */}
              <button
                onClick={() => setIsGardenOpen(true)}
                className={`flex items-center justify-center px-3 py-2 text-xs font-medium transition-all duration-300 border-2 
                  hover:scale-105 active:scale-95 w-[140px] h-[40px] text-center dashboard-nav-button
                  ${isGardenActive() ? 'ring-2 ring-offset-1 transform translate-y-[-4px] shadow-lg' : 'hover:translate-y-[-2px]'}
                  browse-orchards-tour
                `}
                style={{
                  backgroundColor: isGardenActive() ? currentTheme.accent : currentTheme.secondaryButton,
                  borderColor: isGardenActive() ? currentTheme.accent : currentTheme.cardBorder,
                  color: currentTheme.textPrimary,
                  borderRadius: '21px',
                  boxShadow: isGardenActive()
                    ? `0 8px 25px ${currentTheme.shadow}, inset 0 2px 4px rgba(0,0,0,0.1)` 
                    : 'inset 0 2px 4px rgba(0,0,0,0.1)',
                  ringColor: currentTheme.accent,
                }}
                onMouseEnter={(e) => {
                  if (!isGardenActive()) {
                    e.currentTarget.style.backgroundColor = currentTheme.accent;
                    e.currentTarget.style.borderColor = currentTheme.accent;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isGardenActive()) {
                    e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                    e.currentTarget.style.borderColor = currentTheme.cardBorder;
                  }
                }}
              >
                <User className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate text-center leading-tight">My Garden</span>
              </button>

              {/* Let It Rain Button */}
              <button
                onClick={() => setIsLetItRainOpen(true)}
                className={`flex items-center justify-center px-3 py-2 text-xs font-medium transition-all duration-300 border-2 
                  hover:scale-105 active:scale-95 w-[140px] h-[40px] text-center dashboard-nav-button
                  ${isActive('/tithing') || isActive('/free-will-gifting') ? 'ring-2 ring-offset-1 transform translate-y-[-4px] shadow-lg' : 'hover:translate-y-[-2px]'}
                  tithing-tour
                `}
                style={{
                  backgroundColor: (isActive('/tithing') || isActive('/free-will-gifting')) ? currentTheme.accent : currentTheme.secondaryButton,
                  borderColor: (isActive('/tithing') || isActive('/free-will-gifting')) ? currentTheme.accent : currentTheme.cardBorder,
                  color: currentTheme.textPrimary,
                  borderRadius: '21px',
                  boxShadow: (isActive('/tithing') || isActive('/free-will-gifting'))
                    ? `0 8px 25px ${currentTheme.shadow}, inset 0 2px 4px rgba(0,0,0,0.1)` 
                    : 'inset 0 2px 4px rgba(0,0,0,0.1)',
                  ringColor: currentTheme.accent,
                }}
                onMouseEnter={(e) => {
                  if (!isActive('/tithing') && !isActive('/free-will-gifting')) {
                    e.currentTarget.style.backgroundColor = currentTheme.accent;
                    e.currentTarget.style.borderColor = currentTheme.accent;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive('/tithing') && !isActive('/free-will-gifting')) {
                    e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                    e.currentTarget.style.borderColor = currentTheme.cardBorder;
                  }
                }}
              >
                <Cloud className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate text-center leading-tight">Let It Rain</span>
              </button>

              {/* Gosat's Button - Only show if admin/gosat */}
              {shouldShowAdminButton && (
                <button
                  onClick={() => setIsGosatOpen(true)}
                  className={`flex items-center justify-center px-3 py-2 text-xs font-medium transition-all duration-300 border-2 
                    hover:scale-105 active:scale-95 w-[140px] h-[40px] text-center dashboard-nav-button
                    ${isActive('/admin') || isActive('/gosat') ? 'ring-2 ring-offset-1 transform translate-y-[-4px] shadow-lg' : 'hover:translate-y-[-2px]'}
                  `}
                  style={{
                    backgroundColor: (isActive('/admin') || isActive('/gosat')) ? currentTheme.accent : currentTheme.secondaryButton,
                    borderColor: (isActive('/admin') || isActive('/gosat')) ? currentTheme.accent : currentTheme.cardBorder,
                    color: currentTheme.textPrimary,
                    borderRadius: '21px',
                    boxShadow: (isActive('/admin') || isActive('/gosat'))
                      ? `0 8px 25px ${currentTheme.shadow}, inset 0 2px 4px rgba(0,0,0,0.1)` 
                      : 'inset 0 2px 4px rgba(0,0,0,0.1)',
                    ringColor: currentTheme.accent,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive('/admin') && !isActive('/gosat')) {
                      e.currentTarget.style.backgroundColor = currentTheme.accent;
                      e.currentTarget.style.borderColor = currentTheme.accent;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive('/admin') && !isActive('/gosat')) {
                      e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                      e.currentTarget.style.borderColor = currentTheme.cardBorder;
                    }
                  }}
                >
                  <Settings className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate text-center leading-tight">gosat's</span>
                </button>
              )}

            </nav>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-3 ml-4">
                
                
                {/* Basket Icon */}
                <Link
                  to="/basket"
                  className="relative p-2 transition-colors rounded-lg"
                  style={{
                    color: currentTheme.textSecondary,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = currentTheme.accent;
                    e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = currentTheme.textSecondary;
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {basketTotal > 0 && (
                    <Badge 
                      className="absolute -top-1 -right-1 text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full"
                      style={{
                        backgroundColor: currentTheme.accent,
                        color: currentTheme.textPrimary,
                      }}
                    >
                      {basketTotal}
                    </Badge>
                  )}
                </Link>
                
                <Link
                  to="/profile"
                  className="flex items-center space-x-3 text-sm transition-colors p-2 rounded-lg profile-tour"
                  style={{
                    color: currentTheme.textSecondary,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = currentTheme.accent;
                    e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = currentTheme.textSecondary;
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div 
                    className="w-8 h-8 rounded-full overflow-hidden border-2"
                    style={{ borderColor: currentTheme.cardBorder }}
                  >
                    {user?.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: currentTheme.primaryButton }}
                      >
                        <User className="h-4 w-4" style={{ color: currentTheme.textPrimary }} />
                      </div>
                    )}
                  </div>
                  <span>{user?.first_name} {user?.last_name}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all duration-200 shadow-sm disabled:pointer-events-none disabled:opacity-50"
                  style={{
                    borderColor: currentTheme.accent,
                    backgroundColor: currentTheme.secondaryButton,
                    color: currentTheme.textPrimary,
                    boxShadow: `0 2px 4px ${currentTheme.shadow}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = currentTheme.accent;
                    e.currentTarget.style.borderColor = currentTheme.accent;
                    e.currentTarget.style.color = currentTheme.textPrimary;
                    e.currentTarget.style.boxShadow = `0 4px 8px ${currentTheme.shadow}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = currentTheme.secondaryButton;
                    e.currentTarget.style.borderColor = currentTheme.accent;
                    e.currentTarget.style.color = currentTheme.textPrimary;
                    e.currentTarget.style.boxShadow = `0 2px 4px ${currentTheme.shadow}`;
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </button>
              </div>
              
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div 
              className="px-3 pt-3 pb-4 space-y-2 sm:px-4 border-t"
              style={{
                backgroundColor: currentTheme.cardBg,
                borderColor: currentTheme.cardBorder,
              }}
            >
              {/* Primary Navigation - Pill buttons matching desktop */}
              {primaryNavigation.map((item) => {
                const Icon = item.icon
                const isItemActive = isActive(item.href)
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-3 px-4 py-2.5 text-sm font-medium transition-all duration-200 border-2 ${isItemActive ? 'shadow-lg' : ''}`}
                    style={{
                      backgroundColor: isItemActive ? currentTheme.accent : currentTheme.secondaryButton,
                      borderColor: isItemActive ? currentTheme.accent : currentTheme.cardBorder,
                      color: currentTheme.textPrimary,
                      borderRadius: '21px',
                      boxShadow: isItemActive
                        ? `0 4px 12px ${currentTheme.shadow}`
                        : 'inset 0 2px 4px rgba(0,0,0,0.1)',
                    }}
                    onClick={() => { 
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}

              {/* Panel Buttons - 364yhvh days, My Garden, Let It Rain */}
              <button
                onClick={() => { setIsYHVHDaysOpen(true); setIsMobileMenuOpen(false); }}
                className={`flex items-center space-x-3 px-4 py-2.5 text-sm font-medium transition-all duration-200 border-2 w-full ${isYHVHDaysActive() ? 'shadow-lg' : ''}`}
                style={{
                  backgroundColor: isYHVHDaysActive() ? currentTheme.accent : currentTheme.secondaryButton,
                  borderColor: isYHVHDaysActive() ? currentTheme.accent : currentTheme.cardBorder,
                  color: currentTheme.textPrimary,
                  borderRadius: '21px',
                  boxShadow: isYHVHDaysActive()
                    ? `0 4px 12px ${currentTheme.shadow}`
                    : 'inset 0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span>364yhvh days</span>
              </button>

              <button
                onClick={() => { setIsGardenOpen(true); setIsMobileMenuOpen(false); }}
                className={`flex items-center space-x-3 px-4 py-2.5 text-sm font-medium transition-all duration-200 border-2 w-full ${isGardenActive() ? 'shadow-lg' : ''}`}
                style={{
                  backgroundColor: isGardenActive() ? currentTheme.accent : currentTheme.secondaryButton,
                  borderColor: isGardenActive() ? currentTheme.accent : currentTheme.cardBorder,
                  color: currentTheme.textPrimary,
                  borderRadius: '21px',
                  boxShadow: isGardenActive()
                    ? `0 4px 12px ${currentTheme.shadow}`
                    : 'inset 0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <User className="h-4 w-4 flex-shrink-0" />
                <span>My Garden</span>
              </button>

              <button
                onClick={() => { setIsLetItRainOpen(true); setIsMobileMenuOpen(false); }}
                className={`flex items-center space-x-3 px-4 py-2.5 text-sm font-medium transition-all duration-200 border-2 w-full ${(isActive('/tithing') || isActive('/free-will-gifting')) ? 'shadow-lg' : ''}`}
                style={{
                  backgroundColor: (isActive('/tithing') || isActive('/free-will-gifting')) ? currentTheme.accent : currentTheme.secondaryButton,
                  borderColor: (isActive('/tithing') || isActive('/free-will-gifting')) ? currentTheme.accent : currentTheme.cardBorder,
                  color: currentTheme.textPrimary,
                  borderRadius: '21px',
                  boxShadow: (isActive('/tithing') || isActive('/free-will-gifting'))
                    ? `0 4px 12px ${currentTheme.shadow}`
                    : 'inset 0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                <Cloud className="h-4 w-4 flex-shrink-0" />
                <span>Let It Rain</span>
              </button>

              {/* Gosat's Button - Only show if admin/gosat */}
              {shouldShowAdminButton && (
                <button
                  onClick={() => { setIsGosatOpen(true); setIsMobileMenuOpen(false); }}
                  className="flex items-center space-x-3 px-4 py-2.5 text-sm font-medium transition-all duration-200 border-2 w-full"
                  style={{
                    backgroundColor: currentTheme.secondaryButton,
                    borderColor: currentTheme.cardBorder,
                    color: currentTheme.textPrimary,
                    borderRadius: '21px',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  <Settings className="h-4 w-4 flex-shrink-0" />
                  <span>gosat's</span>
                </button>
              )}
              
              <div className="pt-3 mt-3 border-t" style={{ borderColor: currentTheme.cardBorder }}>
                <Link
                  to="/profile"
                  className="flex items-center space-x-3 px-4 py-2.5 text-sm font-medium transition-all duration-200 border-2"
                  style={{
                    backgroundColor: currentTheme.secondaryButton,
                    borderColor: currentTheme.cardBorder,
                    color: currentTheme.textPrimary,
                    borderRadius: '21px',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                  }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div 
                    className="w-6 h-6 rounded-full overflow-hidden border-2"
                    style={{ borderColor: currentTheme.cardBorder }}
                  >
                    {user?.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: currentTheme.primaryButton }}
                      >
                        <User className="h-3 w-3" style={{ color: currentTheme.textPrimary }} />
                      </div>
                    )}
                  </div>
                  <span>Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 px-4 py-2.5 text-sm font-medium w-full text-left mt-2 border-2 transition-all duration-200"
                  style={{
                    backgroundColor: currentTheme.secondaryButton,
                    borderColor: currentTheme.cardBorder,
                    color: currentTheme.textPrimary,
                    borderRadius: '21px',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      
      {/* Footer */}
      <footer 
        className="backdrop-blur-sm border-t mt-auto"
        style={{
          backgroundColor: currentTheme.cardBg,
          borderColor: currentTheme.cardBorder,
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
              <div 
                className="w-12 h-12 rounded-full overflow-hidden border-2 shadow-lg"
                style={{ borderColor: currentTheme.accent }}
              >
                <img 
                  src="/lovable-uploads/s2g-logo.jpg" 
                  alt="sow2grow logo" 
                  className="w-full h-full object-cover bg-transparent"
                />
              </div>
                <div>
                  <h3 className="text-lg font-bold font-playfair" style={{ color: currentTheme.textPrimary }}>
                    sow2grow
                  </h3>
                  <a href="https://www.364yhvh.org/" target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: currentTheme.textSecondary }}>364yhvh community farm</a>
                </div>
              </div>
              <p className="text-sm" style={{ color: currentTheme.textSecondary }}>
                A scriptural community giving platform where sowers create orchards and bestowers help them grow and stand up together.
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold mb-4" style={{ color: currentTheme.textPrimary }}>Community</h4>
              <div className="space-y-2 text-sm" style={{ color: currentTheme.textSecondary }}>
                <p>• Faith-based giving</p>
                <p>• Mutual community support</p>
                <p>• Scriptural principles</p>
                <p>• Transparent platform</p>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold mb-4" style={{ color: currentTheme.textPrimary }}>Scripture</h4>
              <blockquote className="text-sm italic" style={{ color: currentTheme.textSecondary }}>
                "Give, and it will be given to you. A good measure, pressed down, shaken together and running over, will be poured into your lap."
                <br />
                <cite className="font-semibold" style={{ color: currentTheme.accent }}>- Luke 6:38</cite>
              </blockquote>
            </div>
          </div>
          
          <div 
            className="mt-8 pt-8 border-t text-center text-sm"
            style={{
              borderColor: currentTheme.cardBorder,
              color: currentTheme.textSecondary,
            }}
          >
            <p>&copy; 2024 <a href="https://www.364yhvh.org/" target="_blank" rel="noopener noreferrer" className="hover:underline">364yhvh Community Farm</a>. Built with love for the community.</p>
          </div>
        </div>
      </footer>

      {/* OnboardingTour rendered at App root only */}
      
      
      {/* My Garden Panel */}
      <MyGardenPanel isOpen={isGardenOpen} onClose={() => setIsGardenOpen(false)} />
      
      {/* Let It Rain Panel */}
      <LetItRainPanel isOpen={isLetItRainOpen} onClose={() => setIsLetItRainOpen(false)} />
      
      {/* 364yhvh Days Panel */}
      <YHVHDaysPanel isOpen={isYHVHDaysOpen} onClose={() => setIsYHVHDaysOpen(false)} />
      
      
      {/* Gosat Panel */}
      <GosatPanel isOpen={isGosatOpen} onClose={() => setIsGosatOpen(false)} />


      {/* Mobile Tab Bar */}
      <MobileTabBar onOpenGarden={() => setIsGardenOpen(true)} />

      {/* ProgressButton removed - now integrated into StatsFloatingButton bottom bar */}

      {/* Jitsi Video Window */}
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

// Export startJitsiCall globally for use anywhere
if (typeof window !== 'undefined') {
  window.startJitsiCall = startJitsiCall
  // Also export as startJitsi for HTML onclick compatibility
  window.startJitsi = startJitsiCall
}