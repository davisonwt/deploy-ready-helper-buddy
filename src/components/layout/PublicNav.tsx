import React from 'react';
import { Link } from 'react-router-dom';

export default function PublicNav() {
  const navBtn = (to: string, label: string) => (
    <Link
      key={to}
      to={to}
      className="flex items-center justify-center px-3 py-2 text-xs font-medium transition-all duration-200 border rounded-full hover:-translate-y-0.5 w-[140px] h-[40px] text-center bg-accent/20 border-border text-foreground"
    >
      <span className="truncate leading-tight">{label}</span>
    </Link>
  );

  return (
    <header className="bg-card/90 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/dashboard" className="flex items-center space-x-3 group">
            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary shadow-lg">
              <img src="/lovable-uploads/a41a2c64-7483-43dc-90af-67a83994d6aa.png" alt="sow2grow logo" className="w-full h-full object-cover bg-transparent" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary">sow2grow</h1>
              <p className="text-xs text-muted-foreground">364yhvh community farm</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-2">
            {navBtn('/dashboard', 'dashboard')}
            {navBtn('/create-orchard', 'sow new seed')}
            {navBtn('/my-orchards', 'My Orchards')}
            {navBtn('/browse-orchards', 'Browse Orchards')}
            {navBtn('/products', 'Products')}
            {navBtn('/marketing-videos', 'Marketing Videos')}
            {navBtn('/364yhvh-orchards', '364yhvh Orchards')}
            {navBtn('/chatapp', 'Chats')}
            {navBtn('/premium-rooms', 'Premium Rooms')}
            {navBtn('/grove-station', 'Grove Station')}
            {navBtn('/tithing', 'Tithing')}
            {navBtn('/free-will-gifting', 'Free-Will Gifting')}
            {navBtn('/support-us', 'Support Us')}
          </nav>
        </div>
      </div>
    </header>
  );
}
