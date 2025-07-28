import React from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { useBasket } from "../hooks/useBasket"
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
  ShoppingCart
} from "lucide-react"
import { Button } from "./ui/button"
import { Badge } from "./ui/badge"

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const { getTotalItems } = useBasket()
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)
  
  const handleLogout = () => {
    logout()
    navigate("/")
  }
  
  const navigation = [
    { name: "dashboard", href: "/dashboard", icon: Home },
    { name: "community orchards", href: "/browse-orchards", icon: Search },
    { name: "create orchard", href: "/create-orchard", icon: Plus },
    { name: "my orchards", href: "/my-orchards", icon: BarChart3 },
    { name: "tithing", href: "/tithing", icon: HandHeart },
    { name: "free-will gifting", href: "/free-will-gifting", icon: Gift },
  ]
  
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
              {navigation.map((item, index) => {
                const Icon = item.icon
                
                // Direct color mapping
                const buttonColors = {
                  "dashboard": { bg: '#9bf6ff', border: '#9bf6ff', text: '#1e293b' },
                  "community orchards": { bg: '#caffbf', border: '#caffbf', text: '#166534' },
                  "create orchard": { bg: '#fdffb6', border: '#fdffb6', text: '#a16207' },
                  "my orchards": { bg: '#ffd6a5', border: '#ffd6a5', text: '#9a3412' },
                  "tithing": { bg: '#ffadad', border: '#ffadad', text: '#991b1b' },
                  "free-will gifting": { bg: '#8093f1', border: '#8093f1', text: '#581c87' }
                }
                
                const colors = buttonColors[item.name] || { bg: '#f1f5f9', border: '#e2e8f0', text: '#64748b' }
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                     className={`flex items-center justify-center px-3 py-2 text-xs font-medium transition-all duration-200 border-2 
                       hover:scale-105 active:scale-95 w-[160px] h-[40px] text-center
                       ${isActive(item.href) ? 'ring-2 ring-offset-1 ring-blue-500' : ''}
                     `}
                     style={{
                       backgroundColor: colors.bg,
                       borderColor: colors.border,
                       color: colors.text,
                       borderRadius: '21px',
                       boxShadow: isActive(item.href)
                         ? 'inset 0 2px 4px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.15)' 
                         : 'inset 0 2px 4px rgba(0,0,0,0.1)'
                     }}
                   >
                     <Icon className="h-3 w-3 mr-1 flex-shrink-0" />
                     <span className="truncate text-center leading-tight">{item.name}</span>
                   </Link>
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
              {navigation.map((item) => {
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