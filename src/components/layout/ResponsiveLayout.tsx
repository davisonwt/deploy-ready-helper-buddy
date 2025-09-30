import { ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, X, Home, Leaf, DollarSign, Users, BarChart, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Props { 
  children: ReactNode;
  showSidebar?: boolean;
}

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Browse Orchards', href: '/browse-orchards', icon: Leaf },
  { name: 'My Orchards', href: '/my-orchards', icon: Leaf },
  { name: 'Tithing', href: '/tithing', icon: DollarSign },
  { name: 'Community', href: '/community-videos', icon: Users },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart },
  { name: 'Profile', href: '/profile', icon: Settings },
];

const SidebarContent = ({ mobile = false, onItemClick }: { mobile?: boolean; onItemClick?: () => void }) => {
  const location = useLocation();
  
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Sow2Grow</h2>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onItemClick}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-primary text-primary-foreground",
                mobile && "text-base py-3"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

const ResponsiveLayout = ({ children, showSidebar = true }: Props) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!showSidebar) {
    return (
      <div className="min-h-screen bg-background">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden fixed top-4 left-4 z-40 bg-background border shadow-sm"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent mobile onItemClick={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header Spacer */}
        <div className="lg:hidden h-16" />
        
        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ResponsiveLayout;