import React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { useBasket } from "../hooks/useBasket"
import { useRoles } from "../hooks/useRoles"
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
  Settings
} from "lucide-react"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu"

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const { getTotalItems } = useBasket()
  const { isAdminOrGosat } = useRoles()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  
  const handleLogout = () => {
    logout()
    navigate("/")
  }
  
  
  // Primary navigation (direct buttons)
  const primaryNavigation = [
    { name: "dashboard", href: "/dashboard", icon: Home, color: { bg: '#9bf6ff', border: '#9bf6ff', text: '#1e293b' } },
    { name: "community videos", href: "/community-videos", icon: Video, color: { bg: '#ff9f9b', border: '#ff9f9b', text: '#1e293b' } },
    { name: "create orchard", href: "/create-orchard", icon: Plus, color: { bg: '#fdffb6', border: '#fdffb6', text: '#a16207' } }
  ]

  // Grouped navigation (dropdowns)
  const groupedNavigation = [
    {
      name: "My Content",
      icon: User,
      color: { bg: '#ffd6a5', border: '#ffd6a5', text: '#9a3412' },
      items: [
        { name: "My Orchards", href: "/my-orchards", icon: User },
        { name: "Browse Community Orchards", href: "/browse-orchards", icon: Users },
        { name: "364yhvh Orchards", href: "/364yhvh-orchards", icon: Heart }
      ]
    },
    {
      name: "Community",
      icon: MessageSquare,
      color: { bg: '#3B82F6', border: '#3B82F6', text: '#ffffff' },
      items: [
        { name: "Chat App", href: "/chatapp", icon: MessageSquare }
      ]
    },
    {
      name: "Financial",
      icon: Wallet,
      color: { bg: '#ffadad', border: '#ffadad', text: '#991b1b' },
      items: [
        { name: "Tithing", href: "/tithing", icon: HandHeart },
        { name: "Free-Will Gifting", href: "/free-will-gifting", icon: Gift }
      ]
    },
    ...(isAdminOrGosat() ? [{
      name: "Admin",
      icon: Settings,
      color: { bg: '#20b2aa', border: '#20b2aa', text: '#ffffff' },
      items: [
        { name: "Admin Dashboard", href: "/admin/dashboard", icon: Church }
      ]
    }] : [])
  ]

  // Check if current path is in any dropdown
  const isGroupActive = (group) => {
    return group.items.some(item => location.pathname === item.href)
  }
  
  const isActive = (href) => location.pathname === href
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-success/10 via-background to-warning/10">
      {/* Navigation Header */}
      <header className="bg-card/90 backdrop-blur-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-3 group">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary shadow-lg">
                <img 
                  src="/lovable-uploads/a41a2c64-7483-43dc-90af-67a83994d6aa.png" 
                  alt="sow2grow logo" 
                  className="w-full h-full object-cover bg-transparent"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-s2g-green font-playfair">
                  sow2grow
                </h1>
                <p className="text-xs text-s2g-blue">364yhvh community farm</p>
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-2">
              {/* Primary Navigation Buttons */}
              {primaryNavigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center justify-center px-3 py-2 text-xs font-medium transition-all duration-200 border-2 
                      hover:scale-105 active:scale-95 w-[140px] h-[40px] text-center
                      ${isActive(item.href) ? 'ring-2 ring-offset-1 ring-blue-500 transform translate-y-[-4px] shadow-lg' : 'hover:translate-y-[-2px]'}
                    `}
                    style={{
                      backgroundColor: item.color.bg,
                      borderColor: item.color.border,
                      color: item.color.text,
                      borderRadius: '21px',
                      boxShadow: isActive(item.href)
                        ? '0 8px 25px rgba(0,0,0,0.15), inset 0 2px 4px rgba(0,0,0,0.1)' 
                        : 'inset 0 2px 4px rgba(0,0,0,0.1)'
                    }}
                  >
                    <Icon className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate text-center leading-tight">{item.name}</span>
                  </Link>
                )
              })}

              {/* Grouped Navigation Dropdowns */}
              {groupedNavigation.map((group) => {
                const Icon = group.icon
                const isGroupHighlighted = isGroupActive(group)
                
                return (
                  <DropdownMenu key={group.name}>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={`flex items-center justify-center px-3 py-2 text-xs font-medium transition-all duration-200 border-2 
                          hover:scale-105 active:scale-95 w-[140px] h-[40px] text-center
                          ${isGroupHighlighted ? 'ring-2 ring-offset-1 ring-blue-500 transform translate-y-[-4px] shadow-lg' : 'hover:translate-y-[-2px]'}
                        `}
                        style={{
                          backgroundColor: group.color.bg,
                          borderColor: group.color.border,
                          color: group.color.text,
                          borderRadius: '21px',
                          boxShadow: isGroupHighlighted
                            ? '0 8px 25px rgba(0,0,0,0.15), inset 0 2px 4px rgba(0,0,0,0.1)' 
                            : 'inset 0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        <Icon className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate text-center leading-tight">{group.name}</span>
                        <ChevronDown className="h-3 w-3 ml-1 flex-shrink-0" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      className="w-56 bg-background border border-border shadow-lg z-50"
                      align="start"
                      sideOffset={4}
                    >
                      {group.items.map((item) => {
                        const ItemIcon = item.icon
                        return (
                          <DropdownMenuItem key={item.name} asChild>
                            <Link
                              to={item.href}
                              className={`flex items-center space-x-3 px-3 py-2 text-sm transition-colors cursor-pointer
                                ${isActive(item.href) 
                                  ? 'bg-accent text-accent-foreground font-medium' 
                                  : 'hover:bg-accent hover:text-accent-foreground'
                                }
                              `}
                            >
                              <ItemIcon className="h-4 w-4" />
                              <span>{item.name}</span>
                            </Link>
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              })}
            </nav>
            
            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-3">
                {/* Basket Icon */}
                <Link
                  to="/basket"
                  className="relative p-2 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-accent"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {getTotalItems() > 0 && (
                    <Badge className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs min-w-[20px] h-5 flex items-center justify-center rounded-full">
                      {getTotalItems()}
                    </Badge>
                  )}
                </Link>
                
                <Link
                  to="/profile"
                  className="flex items-center space-x-3 text-sm text-muted-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-accent"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-border">
                    {user?.profile_picture ? (
                      <img 
                        src={user.profile_picture} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <span>{user?.first_name} {user?.last_name}</span>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
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
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-card border-t border-border">
              {/* Primary Navigation */}
              {primaryNavigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-all duration-200 ${
                      isActive(item.href)
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "text-muted-foreground hover:text-primary hover:bg-accent"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
              
              {/* Grouped Navigation - Flattened for mobile */}
              {groupedNavigation.map((group) => (
                group.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-all duration-200 ${
                        isActive(item.href)
                          ? "bg-accent text-accent-foreground shadow-sm"
                          : "text-muted-foreground hover:text-primary hover:bg-accent"
                      }`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  )
                })
              ))}
              
              <div className="pt-4 mt-4 border-t border-border">
                <Link
                  to="/profile"
                  className="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:text-primary hover:bg-accent"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden border-2 border-border">
                    {user?.profile_picture ? (
                      <img 
                        src={user.profile_picture} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                        <User className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <span>Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 w-full text-left"
                >
                  <LogOut className="h-5 w-5" />
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
      <footer className="bg-card/90 backdrop-blur-sm border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary shadow-lg">
                <img 
                  src="/lovable-uploads/a41a2c64-7483-43dc-90af-67a83994d6aa.png" 
                  alt="sow2grow logo" 
                  className="w-full h-full object-cover bg-transparent"
                />
              </div>
                <div>
                  <h3 className="text-lg font-bold text-s2g-green font-playfair">
                    sow2grow
                  </h3>
                  <p className="text-xs text-s2g-blue">364yhvh community farm</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                A scriptural community giving platform where growers create orchards and bestowers help them grow and stand up together.
              </p>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Community</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Faith-based giving</p>
                <p>• Mutual community support</p>
                <p>• Scriptural principles</p>
                <p>• Transparent platform</p>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4">Scripture</h4>
              <blockquote className="text-sm text-muted-foreground italic">
                "Give, and it will be given to you. A good measure, pressed down, shaken together and running over, will be poured into your lap."
                <br />
                <cite className="text-primary font-semibold">- Luke 6:38</cite>
              </blockquote>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>&copy; 2024 364yhvh Community Farm. Built with love for the community.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}